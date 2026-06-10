import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/*
 * V2 DATA MIGRATION — moves data out of the deprecated JSON blobs into the
 * typed v2 rows (see docs/v2-plan.md):
 *
 *   ProjectSection risks_preconditions  → Risk rows
 *   ProjectSection decisions_log        → Decision rows
 *   ProjectSection parts_material       → ProductionRun rows
 *   ProjectSection notes_freeform       → ProjectRow.notes (markdown)
 *   ProjectRow.dashboardHealth          → ProjectRow.health (canonical values)
 *   StatusUpdate.blocks                 → StatusUpdate.narrative (markdown)
 *
 * Idempotent: every step only writes where the v2 target is still empty
 * (no Risk/Decision/ProductionRun rows for the project; notes/health/
 * narrative still null), so it is safe to re-run after a partial failure.
 * The deprecated sources are left untouched — the old UI keeps working
 * until v2 phase 4 drops them.
 *
 * Run:   npm run db:push          (apply the v2 schema first)
 *        npm run db:migrate-v2 -- --dry-run   (preview)
 *        npm run db:migrate-v2                (write)
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; aborting migration.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const dryRun = process.argv.includes("--dry-run");

// --- blob shapes (mirror lib/types.ts) -------------------------------------

interface RiskItem {
  text: string;
  owner?: string;
  resolved?: boolean;
}

interface DecisionItem {
  date: string;
  decision: string;
  source?: string;
  author?: string;
}

interface PartsRunRow {
  name: string;
  purpose?: string;
  parts?: number;
  lbs?: number;
  kg?: number;
}

function parseSection<T>(data: string | undefined): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/// "2026-04-09" → UTC midnight Date; anything unparseable → null.
function parseIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const d = new Date(`${s.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HEALTH_FROM_DASHBOARD: Record<string, string> = {
  on_schedule: "on_track",
  on_track: "on_track",
  at_risk: "at_risk",
  off_track: "off_track",
};

const HEALTH_FROM_STATUS_LABEL: Record<string, string> = {
  on_track: "on_track",
  in_progress: "on_track",
  complete: "on_track",
  pending: "at_risk",
  at_risk: "at_risk",
  blocked: "off_track",
};

function blocksToNarrative(blocksJson: string): string | null {
  let blocks: Array<{ heading?: string; body?: string }>;
  try {
    blocks = JSON.parse(blocksJson);
  } catch {
    return null;
  }
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const parts = blocks
    .map((b) => {
      const heading = b.heading?.trim();
      const body = b.body?.trim() ?? "";
      if (heading && body) return `**${heading}**\n\n${body}`;
      if (heading) return `**${heading}**`;
      return body;
    })
    .filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}

// ---------------------------------------------------------------------------

const totals = {
  risks: 0,
  decisions: 0,
  runs: 0,
  notes: 0,
  health: 0,
  narratives: 0,
};

async function migrateProjects() {
  const projects = await prisma.projectRow.findMany({
    include: {
      sections: true,
      statusUpdates: { orderBy: { reportDate: "desc" }, take: 1 },
      _count: { select: { risks: true, decisions: true, productionRuns: true } },
    },
    orderBy: { id: "asc" },
  });

  for (const p of projects) {
    const byKind = new Map(p.sections.map((s) => [s.kind, s.data]));
    const log: string[] = [];

    // risks_preconditions → Risk rows
    if (p._count.risks === 0) {
      const blob = parseSection<{ items?: RiskItem[] }>(byKind.get("risks_preconditions"));
      const items = blob?.items?.filter((r) => r.text?.trim()) ?? [];
      if (items.length) {
        if (!dryRun) {
          await prisma.risk.createMany({
            data: items.map((r, i) => ({
              projectId: p.id,
              body: r.text.trim(),
              owner: r.owner?.trim() || null,
              status: r.resolved ? "resolved" : "open",
              position: i,
            })),
          });
        }
        totals.risks += items.length;
        log.push(`${items.length} risks`);
      }
    }

    // decisions_log → Decision rows
    if (p._count.decisions === 0) {
      const blob = parseSection<{ items?: DecisionItem[] }>(byKind.get("decisions_log"));
      const items = blob?.items?.filter((d) => d.decision?.trim()) ?? [];
      if (items.length) {
        if (!dryRun) {
          await prisma.decision.createMany({
            data: items.map((d, i) => {
              const decidedOn = parseIsoDate(d.date ?? "");
              const body =
                decidedOn || !d.date?.trim()
                  ? d.decision.trim()
                  : `${d.date.trim()} — ${d.decision.trim()}`;
              return {
                projectId: p.id,
                decidedOn,
                body,
                source: d.source === "meeting" ? "meeting" : "unilateral",
                author: d.author?.trim() || null,
                position: i,
              };
            }),
          });
        }
        totals.decisions += items.length;
        log.push(`${items.length} decisions`);
      }
    }

    // parts_material → ProductionRun rows
    if (p._count.productionRuns === 0) {
      const blob = parseSection<{ rows?: PartsRunRow[] }>(byKind.get("parts_material"));
      const rows = blob?.rows?.filter((r) => r.name?.trim()) ?? [];
      if (rows.length) {
        if (!dryRun) {
          await prisma.productionRun.createMany({
            data: rows.map((r, i) => ({
              projectId: p.id,
              name: r.name.trim(),
              purpose: r.purpose?.trim() || null,
              parts: Math.round(r.parts ?? 0),
              lbs: r.lbs ?? 0,
              kg: r.kg ?? 0,
              position: i,
            })),
          });
        }
        totals.runs += rows.length;
        log.push(`${rows.length} production runs`);
      }
    }

    // notes_freeform + health → ProjectRow fields (one update)
    const rowPatch: { notes?: string; health?: string } = {};
    if (p.notes == null) {
      const blob = parseSection<{ blocks?: string[] }>(byKind.get("notes_freeform"));
      const blocks = blob?.blocks?.map((b) => b.trim()).filter(Boolean) ?? [];
      if (blocks.length) rowPatch.notes = blocks.join("\n\n");
    }
    if (p.health == null) {
      const fromDashboard = p.dashboardHealth
        ? HEALTH_FROM_DASHBOARD[p.dashboardHealth]
        : undefined;
      const fromStatus = p.statusUpdates[0]
        ? HEALTH_FROM_STATUS_LABEL[p.statusUpdates[0].statusLabel]
        : undefined;
      rowPatch.health = fromDashboard ?? fromStatus ?? "on_track";
    }
    if (Object.keys(rowPatch).length) {
      if (!dryRun) {
        await prisma.projectRow.update({ where: { id: p.id }, data: rowPatch });
      }
      if (rowPatch.notes) {
        totals.notes += 1;
        log.push("notes");
      }
      if (rowPatch.health) {
        totals.health += 1;
        log.push(`health=${rowPatch.health}`);
      }
    }

    if (log.length) console.log(`${p.id}  ${p.name}: ${log.join(", ")}`);
  }
}

async function migrateStatusNarratives() {
  const updates = await prisma.statusUpdate.findMany({
    where: { narrative: null },
    select: { id: true, blocks: true },
  });
  for (const u of updates) {
    const narrative = blocksToNarrative(u.blocks);
    if (!narrative) continue;
    if (!dryRun) {
      await prisma.statusUpdate.update({ where: { id: u.id }, data: { narrative } });
    }
    totals.narratives += 1;
  }
}

async function main() {
  console.log(dryRun ? "DRY RUN — nothing will be written.\n" : "Migrating to v2 rows…\n");
  await migrateProjects();
  await migrateStatusNarratives();
  console.log(
    `\n${dryRun ? "Would migrate" : "Migrated"}: ` +
      `${totals.risks} risks, ${totals.decisions} decisions, ` +
      `${totals.runs} production runs, ${totals.notes} project notes, ` +
      `${totals.health} health values, ${totals.narratives} status narratives.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

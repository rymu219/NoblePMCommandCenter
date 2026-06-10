import { prisma } from "./prisma";

/*
 * Loader for the v2 unified project page. One query tree, returning a
 * plain serializable view model (ISO date strings, no Date objects) so
 * every piece can flow into client components untouched.
 */

export interface V2Risk {
  id: string;
  body: string;
  owner: string | null;
  status: string; // open | resolved
}

export interface V2Decision {
  id: string;
  decidedOnIso: string | null;
  body: string;
  source: string; // meeting | unilateral
  author: string | null;
}

export interface V2Run {
  id: string;
  name: string;
  purpose: string | null;
  parts: number;
  lbs: number;
  kg: number;
}

export interface V2Phase {
  id: string;
  name: string;
  startIso: string;
  endIso: string;
  color: string;
  isCurrent: boolean;
}

export interface V2TimelineMilestone {
  id: string;
  title: string;
  baselineIso: string | null;
  targetIso: string | null;
  actualIso: string | null;
}

export interface V2LatestUpdate {
  id: string;
  reportDateIso: string;
  statusLabel: string;
  qualifier: string | null;
  narrative: string | null;
  authorName: string | null;
}

export interface ProjectV2 {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  health: string; // on_track | at_risk | off_track (null coalesced)
  notes: string | null;
  programPrefix: string;
  programName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  lastUpdatedIso: string;
  budget: {
    total: number | null;
    spent: number | null;
    committed: number | null;
    forecast: number | null;
  };
  hoursLogged: number;
  risks: V2Risk[];
  decisions: V2Decision[];
  runs: V2Run[];
  phases: V2Phase[];
  timelineMilestones: V2TimelineMilestone[];
  latestUpdate: V2LatestUpdate | null;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Fallback narrative for pre-v2 updates: join the JSON blocks as markdown. */
function narrativeFromBlocks(blocksJson: string): string | null {
  try {
    const blocks = JSON.parse(blocksJson) as Array<{ heading?: string; body?: string }>;
    if (!Array.isArray(blocks)) return null;
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
  } catch {
    return null;
  }
}

export async function loadProjectV2(id: string): Promise<ProjectV2 | null> {
  const row = await prisma.projectRow.findUnique({
    where: { id },
    include: {
      program: { select: { name: true } },
      owner: { select: { id: true, name: true } },
      risks: { orderBy: { position: "asc" } },
      decisions: { orderBy: { position: "asc" } },
      productionRuns: { orderBy: { position: "asc" } },
      phases: { orderBy: { position: "asc" } },
      milestones: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          baselineDate: true,
          targetDate: true,
          actualDate: true,
        },
      },
      statusUpdates: { orderBy: { reportDate: "desc" }, take: 1 },
    },
  });
  if (!row) return null;

  const [hours, latestAuthor] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { projectId: id },
      _sum: { hours: true },
    }),
    row.statusUpdates[0]?.authorId
      ? prisma.user.findUnique({
          where: { id: row.statusUpdates[0].authorId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const latest = row.statusUpdates[0];

  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    status: row.status,
    health: row.health ?? "on_track",
    notes: row.notes,
    programPrefix: row.programPrefix,
    programName: row.program.name,
    ownerId: row.owner?.id ?? null,
    ownerName: row.owner?.name ?? null,
    lastUpdatedIso: row.lastUpdatedAt.toISOString().slice(0, 10),
    budget: {
      total: row.budgetTotal,
      spent: row.spentTotal,
      committed: row.committedTotal,
      forecast: row.forecastTotal,
    },
    hoursLogged: hours._sum.hours ?? 0,
    risks: row.risks.map((r) => ({
      id: r.id,
      body: r.body,
      owner: r.owner,
      status: r.status,
    })),
    decisions: row.decisions.map((d) => ({
      id: d.id,
      decidedOnIso: iso(d.decidedOn),
      body: d.body,
      source: d.source,
      author: d.author,
    })),
    runs: row.productionRuns.map((r) => ({
      id: r.id,
      name: r.name,
      purpose: r.purpose,
      parts: r.parts,
      lbs: r.lbs,
      kg: r.kg,
    })),
    phases: row.phases.map((p) => ({
      id: p.id,
      name: p.name,
      startIso: p.startDate.toISOString().slice(0, 10),
      endIso: p.endDate.toISOString().slice(0, 10),
      color: p.color,
      isCurrent: p.isCurrent,
    })),
    timelineMilestones: row.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      baselineIso: iso(m.baselineDate),
      targetIso: iso(m.targetDate),
      actualIso: iso(m.actualDate),
    })),
    latestUpdate: latest
      ? {
          id: latest.id,
          reportDateIso: latest.reportDate.toISOString().slice(0, 10),
          statusLabel: latest.statusLabel,
          qualifier: latest.statusQualifier,
          narrative: latest.narrative ?? narrativeFromBlocks(latest.blocks),
          authorName: latestAuthor?.name ?? null,
        }
      : null,
  };
}

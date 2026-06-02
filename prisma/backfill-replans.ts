import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/*
 * ONE-OFF BACKFILL — seed the MilestoneReplan log from existing AuditLog history
 * so replan churn + the cause/estimation trends aren't empty on day one.
 *
 * Every milestone date move already landed in AuditLog (action "update" with a
 * changed targetDate = a slip; action "rebaseline" = a baseline reset). We can't
 * recover the *reason* retroactively, so backfilled rows use reason
 * "unspecified" — they count toward churn/trend but show as "Unspecified" in the
 * cause breakdown. Real reasons accrue going forward.
 *
 * Idempotent: a backfilled row is keyed by (milestoneId, at) matching its source
 * audit row, so re-running skips anything already present.
 *
 * Run:  DATABASE_URL="<postgres url>" npm run backfill:replans
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; aborting backfill.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const DAY_MS = 86_400_000;
const dayDelta = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY_MS);
const toDate = (v: unknown): Date | null => (typeof v === "string" ? new Date(v) : null);

async function main() {
  const liveIds = new Set((await prisma.milestone.findMany({ select: { id: true } })).map((m) => m.id));

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Milestone", action: { in: ["update", "rebaseline"] } },
    orderBy: { at: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const log of logs) {
    if (!liveIds.has(log.entityId)) continue; // milestone deleted — FK would fail
    let before: Record<string, unknown> = {};
    let after: Record<string, unknown> = {};
    try {
      before = log.before ? JSON.parse(log.before) : {};
      after = log.after ? JSON.parse(log.after) : {};
    } catch {
      continue;
    }

    let kind: "slip" | "rebaseline";
    let from: Date | null;
    let to: Date | null;

    if (log.action === "rebaseline") {
      kind = "rebaseline";
      from = toDate(before.baselineDate);
      to = toDate(after.baselineDate);
    } else {
      // "update" — only a genuine move of an already-committed target is a slip.
      from = toDate(before.targetDate);
      to = toDate(after.targetDate);
      if (!from || !to || dayDelta(to, from) === 0) {
        skipped++;
        continue;
      }
      kind = "slip";
    }

    // Idempotency: same milestone + same source timestamp already backfilled?
    const exists = await prisma.milestoneReplan.findFirst({
      where: { milestoneId: log.entityId, at: log.at },
      select: { id: true },
    });
    if (exists) {
      skipped++;
      continue;
    }

    await prisma.milestoneReplan.create({
      data: {
        milestoneId: log.entityId,
        kind,
        fromDate: from,
        toDate: to,
        deltaDays: from && to ? dayDelta(to, from) : 0,
        reason: "unspecified",
        actorUserId: log.actorUserId,
        at: log.at,
      },
    });
    created++;
  }

  console.log(`Backfill complete: ${created} replan rows created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

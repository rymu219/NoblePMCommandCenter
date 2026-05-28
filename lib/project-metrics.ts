import { prisma } from "./prisma";
import type { HoursRow } from "./types";

/*
 * Per-project metrics for the "At a glance" dashboard on the project page.
 * Derived from data already captured: budget fields, time entries (burn
 * curve), the hours-by-role estimate, status history, and open action
 * items (aging). No new upkeep.
 */

export interface ProjectMetrics {
  budget: {
    total: number | null;
    spent: number | null;
    committed: number | null;
    forecast: number | null;
    hasData: boolean;
  };
  hours: {
    logged: number;
    estimated: number | null;
    /** Cumulative logged hours per week, oldest → newest. */
    burnCurve: Array<{ weekStart: string; cum: number }>;
  };
  schedule: {
    confidence: string | null;
    nextMilestone: string | null;
    nextMilestoneDate: Date | null;
    daysToMilestone: number | null;
    targetEndDate: Date | null;
  };
  /** Status label history, oldest → newest (capped). */
  statusHistory: Array<{ date: Date; label: string }>;
  actions: {
    open: number;
    overdue: number;
    /** 0–7d, 8–30d, 31d+ open-item counts. */
    fresh: number;
    aging: number;
    stale: number;
    oldestDays: number | null;
  };
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** UTC Monday that starts the week containing `d`. */
function weekStartUtc(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (day.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  day.setUTCDate(day.getUTCDate() - dow);
  return day;
}

export async function loadProjectMetrics(
  projectId: string
): Promise<ProjectMetrics> {
  const [row, timeEntries, statusUpdates, openItems] = await Promise.all([
    prisma.projectRow.findUnique({
      where: { id: projectId },
      select: {
        budgetTotal: true,
        spentTotal: true,
        committedTotal: true,
        forecastTotal: true,
        targetEndDate: true,
        sections: { where: { kind: "hours_by_role" }, select: { data: true } },
        statusUpdates: {
          orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            scheduleConfidence: true,
            nextMilestone: true,
            nextMilestoneDate: true,
          },
        },
      },
    }),
    prisma.timeEntry.findMany({
      where: { projectId },
      select: { entryDate: true, hours: true },
      orderBy: { entryDate: "asc" },
    }),
    prisma.statusUpdate.findMany({
      where: { projectId },
      orderBy: [{ reportDate: "asc" }, { createdAt: "asc" }],
      select: { reportDate: true, statusLabel: true },
    }),
    prisma.actionItem.findMany({
      where: { projectId, completedAt: null },
      select: { createdAt: true, dueDate: true },
    }),
  ]);

  // Budget.
  const budget = {
    total: row?.budgetTotal ?? null,
    spent: row?.spentTotal ?? null,
    committed: row?.committedTotal ?? null,
    forecast: row?.forecastTotal ?? null,
    hasData:
      row?.budgetTotal != null ||
      row?.spentTotal != null ||
      row?.forecastTotal != null,
  };

  // Hours — logged total + weekly cumulative burn curve.
  const logged = timeEntries.reduce((s, e) => s + e.hours, 0);
  const byWeek = new Map<string, number>();
  for (const e of timeEntries) {
    const key = weekStartUtc(e.entryDate).toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + e.hours);
  }
  let cum = 0;
  const burnCurve = Array.from(byWeek.keys())
    .sort()
    .map((weekStart) => {
      cum += byWeek.get(weekStart)!;
      return { weekStart, cum: Math.round(cum * 10) / 10 };
    });

  let estimated: number | null = null;
  const hbr = row?.sections[0];
  if (hbr) {
    try {
      const data = JSON.parse(hbr.data) as { rows?: HoursRow[] };
      if (Array.isArray(data.rows)) {
        estimated = data.rows.reduce((s, x) => s + (x.hours ?? 0), 0);
      }
    } catch {
      /* noop */
    }
  }

  // Schedule.
  const today = todayUtc();
  const latest = row?.statusUpdates[0];
  const nextMilestoneDate = latest?.nextMilestoneDate ?? null;
  const daysToMilestone = nextMilestoneDate
    ? Math.round((nextMilestoneDate.getTime() - today.getTime()) / 86_400_000)
    : null;

  // Action-item aging.
  let overdue = 0;
  let fresh = 0;
  let aging = 0;
  let stale = 0;
  let oldestDays: number | null = null;
  for (const it of openItems) {
    if (it.dueDate && it.dueDate.getTime() < today.getTime()) overdue++;
    const ageDays = Math.floor(
      (today.getTime() - it.createdAt.getTime()) / 86_400_000
    );
    if (ageDays <= 7) fresh++;
    else if (ageDays <= 30) aging++;
    else stale++;
    if (oldestDays === null || ageDays > oldestDays) oldestDays = ageDays;
  }

  return {
    budget,
    hours: { logged: Math.round(logged * 10) / 10, estimated, burnCurve },
    schedule: {
      confidence: latest?.scheduleConfidence ?? null,
      nextMilestone: latest?.nextMilestone ?? null,
      nextMilestoneDate,
      daysToMilestone,
      targetEndDate: row?.targetEndDate ?? null,
    },
    statusHistory: statusUpdates
      .slice(-12)
      .map((s) => ({ date: s.reportDate, label: s.statusLabel })),
    actions: {
      open: openItems.length,
      overdue,
      fresh,
      aging,
      stale,
      oldestDays,
    },
  };
}

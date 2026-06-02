import { prisma } from "./prisma";
import { groupRows } from "./board-loader";
import { reasonLabel } from "./replan-reasons";
import {
  type SlippageRow,
  aggregate,
  milestoneCue,
  milestoneVsBaseline,
  monthKey,
  subtaskCue,
  subtaskDaysLate,
  todayUTC,
} from "./slippage";

/*
 * Read-side for the admin-only Execution analytics page.
 *
 * This is the only consumer of the private MilestoneReplan log — the reasons an
 * admin recorded when moving a committed date. It is NEVER loaded into any
 * engineer-facing shape (board, project page, slippage report).
 *
 * Four lenses, portfolio-wide:
 *   1. KPI band         — headline on-time %, slip magnitude, churn.
 *   2. Estimation       — milestones vs their ORIGINAL baseline, by month.
 *   3. Replan churn     — milestones whose dates keep moving.
 *   4. Cause breakdown  — why dates slip (the Pareto), from MilestoneReplan.
 *   (+ accountability by engineer, reusing the subtask slippage rows.)
 *
 * Reuses the pure slippage math (lib/slippage.ts) and groupRows (board-loader).
 */

export interface ExecutionKpis {
  /** Completed milestones that had a baseline (the denominator). */
  milestonesCompleted: number;
  /** Percent delivered on/before the original baseline (0-100), null if none. */
  onTimePct: number | null;
  /** Mean days late vs baseline across completed milestones (early = negative). */
  avgSlipDays: number | null;
  /** Median days late vs baseline — robust to a few extreme slips. */
  medianSlipDays: number | null;
  /** Open milestones currently past their target. */
  overdueOpen: number;
  /** Average recorded date-moves per milestone (replan churn). */
  avgReplansPerMilestone: number;
  /** Percent of milestones that have been replanned at least once. */
  pctReplanned: number;
}

export interface CauseRow {
  reason: string;
  label: string;
  count: number;
  /** Net days pushed later across moves with this cause. */
  totalDaysPushed: number;
}

export interface ChurnRow {
  milestoneId: string;
  title: string;
  projectName: string;
  replans: number;
  totalDaysPushed: number;
}

export interface ExecutionReport {
  kpis: ExecutionKpis;
  causeBreakdown: CauseRow[];
  churn: ChurnRow[];
  byEngineer: SlippageRow[];
  estimationByMonth: SlippageRow[];
}

/** Median of a numeric list, or null when empty. */
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function loadExecutionReport(): Promise<ExecutionReport> {
  const today = todayUTC();

  // Portfolio-wide — this page is admin-only.
  const [milestones, subtasks, replans] = await Promise.all([
    prisma.milestone.findMany({
      include: { project: { select: { name: true } } },
    }),
    prisma.subtask.findMany({
      include: { owner: { select: { id: true, name: true } } },
    }),
    prisma.milestoneReplan.findMany({
      include: { milestone: { select: { title: true, project: { select: { name: true } } } } },
    }),
  ]);

  // --- Milestone slip vs ORIGINAL baseline (the real slip) ------------------
  const msMeasured = milestones.map((m) => ({
    daysLate: milestoneVsBaseline(m),
    isCompleted: m.actualDate !== null,
    isOverdueOpen: milestoneCue(m, today) === "overdue",
    month: m.actualDate ? monthKey(m.actualDate) : null,
  }));
  const portfolio = aggregate("all", "Portfolio", msMeasured);
  const slipValues = msMeasured
    .filter((i) => i.isCompleted && i.daysLate !== null)
    .map((i) => i.daysLate as number);

  // --- Replan churn ---------------------------------------------------------
  const replanCountByMs = new Map<string, number>();
  for (const r of replans) {
    replanCountByMs.set(r.milestoneId, (replanCountByMs.get(r.milestoneId) ?? 0) + 1);
  }
  const replannedMilestones = replanCountByMs.size;
  const totalMilestones = milestones.length;

  const kpis: ExecutionKpis = {
    milestonesCompleted: portfolio.completed,
    onTimePct: portfolio.onTimePct,
    avgSlipDays: portfolio.completed ? portfolio.avgDaysLate : null,
    medianSlipDays: median(slipValues),
    overdueOpen: portfolio.overdueOpen,
    avgReplansPerMilestone: totalMilestones ? replans.length / totalMilestones : 0,
    pctReplanned: totalMilestones
      ? Math.round((replannedMilestones / totalMilestones) * 100)
      : 0,
  };

  // --- Cause breakdown (the Pareto of why we slip) --------------------------
  const causeMap = new Map<string, { count: number; totalDaysPushed: number }>();
  for (const r of replans) {
    const g = causeMap.get(r.reason) ?? { count: 0, totalDaysPushed: 0 };
    g.count += 1;
    g.totalDaysPushed += Math.max(r.deltaDays, 0);
    causeMap.set(r.reason, g);
  }
  const causeBreakdown: CauseRow[] = [...causeMap.entries()]
    .map(([reason, g]) => ({ reason, label: reasonLabel(reason), ...g }))
    .sort((a, b) => b.count - a.count || b.totalDaysPushed - a.totalDaysPushed);

  // --- Worst churn offenders ------------------------------------------------
  const churnMap = new Map<
    string,
    { title: string; projectName: string; replans: number; totalDaysPushed: number }
  >();
  for (const r of replans) {
    const g =
      churnMap.get(r.milestoneId) ?? {
        title: r.milestone.title,
        projectName: r.milestone.project.name,
        replans: 0,
        totalDaysPushed: 0,
      };
    g.replans += 1;
    g.totalDaysPushed += Math.max(r.deltaDays, 0);
    churnMap.set(r.milestoneId, g);
  }
  const churn: ChurnRow[] = [...churnMap.entries()]
    .map(([milestoneId, g]) => ({ milestoneId, ...g }))
    .sort((a, b) => b.replans - a.replans || b.totalDaysPushed - a.totalDaysPushed)
    .slice(0, 12);

  // --- Accountability by engineer (subtask-level on-time) -------------------
  const subMeasured = subtasks.map((s) => ({
    ownerId: s.ownerId,
    ownerName: s.owner.name,
    daysLate: subtaskDaysLate(s),
    isCompleted: s.completedAt !== null,
    isOverdueOpen:
      subtaskCue({ dueDate: s.dueDate, completedAt: s.completedAt }, today) === "overdue",
  }));
  const byEngineer = groupRows(
    subMeasured,
    (i) => i.ownerId,
    (i) => i.ownerName
  );

  // --- Estimation accuracy trend: milestones vs baseline, by month ----------
  const estimationByMonth = groupRows(
    msMeasured.filter((i) => i.month),
    (i) => i.month as string,
    (i) => i.month as string
  ).sort((a, b) => a.key.localeCompare(b.key));

  return { kpis, causeBreakdown, churn, byEngineer, estimationByMonth };
}

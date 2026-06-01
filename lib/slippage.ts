/*
 * Pure slippage math for the Command Center board + report.
 *
 * Every date is treated as UTC midnight (the board stores dates that way via
 * parseYmd), so a plain millisecond delta divided by one day is exact and
 * DST-safe. Keep this file free of Prisma / IO so it can be unit-reasoned.
 */

const DAY_MS = 86_400_000;

/** Whole-day delta a - b, both at UTC midnight. Positive = a is later. */
export function dayDelta(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

/** Today at UTC midnight. */
export function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export type Cue = "done-late" | "done" | "overdue" | "due-soon" | "open" | "none";

/** Days a window for the amber "due soon" cue. */
const DUE_SOON_DAYS = 3;

// --- Subtask-level (engineer focus) -----------------------------------------

export interface SubtaskDates {
  dueDate: Date | null;
  completedAt: Date | null;
}

/**
 * Days late for a subtask, or null when it can't be measured (no due date, or
 * not yet completed). Positive = late, <= 0 = on time / early.
 */
export function subtaskDaysLate(s: SubtaskDates): number | null {
  if (!s.completedAt || !s.dueDate) return null;
  return dayDelta(s.completedAt, s.dueDate);
}

/** Live visual cue for a subtask given "today". */
export function subtaskCue(s: SubtaskDates, today: Date = todayUTC()): Cue {
  if (s.completedAt) {
    if (s.dueDate && dayDelta(s.completedAt, s.dueDate) > 0) return "done-late";
    return "done";
  }
  if (!s.dueDate) return "none";
  const d = dayDelta(s.dueDate, today);
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "due-soon";
  return "open";
}

// --- Milestone-level (project focus) ----------------------------------------

export interface MilestoneDates {
  baselineDate: Date;
  targetDate: Date;
  actualDate: Date | null;
}

/** How far the target has been pushed from the original commitment. */
export function targetDriftDays(m: MilestoneDates): number {
  return dayDelta(m.targetDate, m.baselineDate);
}

/** Days late vs the current target (null until complete). */
export function milestoneVsTarget(m: MilestoneDates): number | null {
  if (!m.actualDate) return null;
  return dayDelta(m.actualDate, m.targetDate);
}

/** Days late vs the ORIGINAL commitment — the headline "real slip". */
export function milestoneVsBaseline(m: MilestoneDates): number | null {
  if (!m.actualDate) return null;
  return dayDelta(m.actualDate, m.baselineDate);
}

/** Live cue for a milestone given "today" (uses targetDate as the deadline). */
export function milestoneCue(m: MilestoneDates, today: Date = todayUTC()): Cue {
  return subtaskCue(
    { dueDate: m.targetDate, completedAt: m.actualDate },
    today
  );
}

// --- Aggregation ------------------------------------------------------------

/** One row of the slippage report, reused for engineer / project / month. */
export interface SlippageRow {
  key: string;
  label: string;
  /** Completed items that had a deadline (the denominator). */
  completed: number;
  /** Of those, how many were late. */
  late: number;
  /** Average days late across completed items (late and early both count). */
  avgDaysLate: number;
  /** Percent on time (0-100), or null when nothing completed yet. */
  onTimePct: number | null;
  /** Open items currently overdue (live, for context). */
  overdueOpen: number;
}

interface Measured {
  daysLate: number | null; // null = no deadline or not complete
  isCompleted: boolean;
  isOverdueOpen: boolean;
}

/**
 * Fold a set of measured items into a SlippageRow. `daysLate` is whatever
 * metric the caller chose (subtask vs due date, milestone vs baseline, …).
 */
export function aggregate(
  key: string,
  label: string,
  items: Measured[]
): SlippageRow {
  const measured = items.filter((i) => i.isCompleted && i.daysLate !== null);
  const completed = measured.length;
  const late = measured.filter((i) => (i.daysLate as number) > 0).length;
  const sum = measured.reduce((s, i) => s + (i.daysLate as number), 0);
  const overdueOpen = items.filter((i) => i.isOverdueOpen).length;
  return {
    key,
    label,
    completed,
    late,
    avgDaysLate: completed ? sum / completed : 0,
    onTimePct: completed ? Math.round(((completed - late) / completed) * 100) : null,
    overdueOpen,
  };
}

/** Month bucket key (YYYY-MM, UTC) for a completion date. */
export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

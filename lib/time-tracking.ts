import { prisma } from "./prisma";

/*
 * Time-tracking domain helpers. Keeps date math + period-close checks in
 * one place so server actions and pages share the logic.
 */

/** Monday of the week containing `d` (UTC, midnight). */
export function startOfWeek(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay(); // 0=Sun
  const diff = (dow + 6) % 7; // shift so Mon=0
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}

export function addDaysUTC(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseYmd(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export async function isMonthClosed(year: number, month1: number): Promise<boolean> {
  const row = await prisma.periodClose.findUnique({
    where: { year_month: { year, month: month1 } },
  });
  return !!row;
}

/** Throws if `d` falls inside a closed month. */
export async function assertOpenPeriod(d: Date) {
  const closed = await isMonthClosed(d.getUTCFullYear(), d.getUTCMonth() + 1);
  if (closed) {
    throw new Error(
      `${d.toISOString().slice(0, 7)} is closed. Ask Admin to reopen if changes are required.`
    );
  }
}

export interface WeekGridCell {
  projectId: string;
  projectName: string;
  hours: number[]; // length 5, Mon..Fri
}

export async function loadWeekGrid(userId: string, weekStart: Date): Promise<{
  rows: WeekGridCell[];
  days: string[];
  weekStartIso: string;
  noteByProject: Record<string, string>;
  closed: boolean;
}> {
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { project: { id: "asc" } },
  });
  // Always include Miscellaneous even if not explicitly assigned.
  const projectMap = new Map<string, { id: string; name: string }>();
  for (const a of assignments) projectMap.set(a.project.id, { id: a.project.id, name: a.project.name });
  if (!projectMap.has("999-999")) {
    const misc = await prisma.projectRow.findUnique({ where: { id: "999-999" } });
    if (misc) projectMap.set(misc.id, { id: misc.id, name: misc.name });
  }

  const projectIds = Array.from(projectMap.keys());
  const days = [0, 1, 2, 3, 4].map((i) => addDaysUTC(weekStart, i));

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      projectId: { in: projectIds },
      entryDate: {
        gte: weekStart,
        lt: addDaysUTC(weekStart, 5),
      },
    },
  });
  const byKey = new Map<string, number>();
  for (const e of entries) {
    byKey.set(`${e.projectId}|${ymd(e.entryDate)}`, e.hours);
  }

  const rows: WeekGridCell[] = Array.from(projectMap.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      hours: days.map((d) => byKey.get(`${p.id}|${ymd(d)}`) ?? 0),
    }));

  const notes = await prisma.timeNote.findMany({
    where: { userId, weekStartDate: weekStart, projectId: { in: projectIds } },
  });
  const noteByProject: Record<string, string> = {};
  for (const n of notes) noteByProject[n.projectId] = n.note;

  return {
    rows,
    days: days.map((d) => ymd(d)),
    weekStartIso: ymd(weekStart),
    noteByProject,
    closed: await isMonthClosed(weekStart.getUTCFullYear(), weekStart.getUTCMonth() + 1),
  };
}

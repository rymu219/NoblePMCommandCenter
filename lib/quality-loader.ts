/*
 * Read-side for the Quality awareness board (bottom of The Board). Splits the
 * global inspection list into the active (top) and completed (bottom) tables and
 * derives the slip / lateness day-counts for display.
 */

import { prisma } from "./prisma";
import { ymd } from "./time-tracking";
import { dayDelta, todayUTC } from "./slippage";

export interface QualityRow {
  id: string;
  item: string;
  method: string;
  estDurationDays: number | null;
  baselineIso: string | null;
  targetIso: string | null;
  completedIso: string | null;
  /** targetDate - baselineDate in days; positive = slipped later. null if undated. */
  slipDays: number | null;
  slipReason: string | null;
  slipNote: string | null;
  slippedIso: string | null;
  /** completedAt day - targetDate in days; positive = finished late. null if N/A. */
  lateDays: number | null;
  /** Active item whose target is in the past and not yet complete. */
  overdue: boolean;
}

function toRow(m: {
  id: string;
  item: string;
  method: string;
  estDurationDays: number | null;
  baselineDate: Date | null;
  targetDate: Date | null;
  completedAt: Date | null;
  slipReason: string | null;
  slipNote: string | null;
  slippedAt: Date | null;
}): QualityRow {
  const today = todayUTC();
  const slipDays =
    m.targetDate && m.baselineDate ? dayDelta(m.targetDate, m.baselineDate) : null;
  const lateDays =
    m.completedAt && m.targetDate ? dayDelta(m.completedAt, m.targetDate) : null;
  return {
    id: m.id,
    item: m.item,
    method: m.method,
    estDurationDays: m.estDurationDays,
    baselineIso: m.baselineDate ? ymd(m.baselineDate) : null,
    targetIso: m.targetDate ? ymd(m.targetDate) : null,
    completedIso: m.completedAt ? ymd(m.completedAt) : null,
    slipDays,
    slipReason: m.slipReason,
    slipNote: m.slipNote,
    slippedIso: m.slippedAt ? ymd(m.slippedAt) : null,
    lateDays,
    overdue: !m.completedAt && !!m.targetDate && m.targetDate < today,
  };
}

export interface QualityBoardData {
  active: QualityRow[];
  completed: QualityRow[];
}

export async function loadQualityBoard(): Promise<QualityBoardData> {
  const rows = await prisma.qualityInspection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const active: QualityRow[] = [];
  const completed: QualityRow[] = [];
  for (const m of rows) {
    (m.completedAt ? completed : active).push(toRow(m));
  }
  // Completed: most-recently finished first.
  completed.sort((a, b) => (b.completedIso ?? "").localeCompare(a.completedIso ?? ""));
  return { active, completed };
}

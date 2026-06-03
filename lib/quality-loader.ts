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
  /** Linked project id (XXX-XXX), or null when unassigned. */
  projectId: string | null;
  /** Linked project name, or null when unassigned. */
  projectName: string | null;
  category: string | null;
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
  category: string | null;
  method: string;
  estDurationDays: number | null;
  baselineDate: Date | null;
  targetDate: Date | null;
  completedAt: Date | null;
  slipReason: string | null;
  slipNote: string | null;
  slippedAt: Date | null;
  project: { id: string; name: string } | null;
}): QualityRow {
  const today = todayUTC();
  const slipDays =
    m.targetDate && m.baselineDate ? dayDelta(m.targetDate, m.baselineDate) : null;
  const lateDays =
    m.completedAt && m.targetDate ? dayDelta(m.completedAt, m.targetDate) : null;
  return {
    id: m.id,
    item: m.item,
    projectId: m.project?.id ?? null,
    projectName: m.project?.name ?? null,
    category: m.category,
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
    include: { project: { select: { id: true, name: true } } },
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

export interface ProjectOption {
  id: string;
  name: string;
}

/** Active + completed inspections linked to one project (for the project page). */
export async function loadProjectQuality(projectId: string): Promise<QualityBoardData> {
  const rows = await prisma.qualityInspection.findMany({
    where: { projectId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  const active: QualityRow[] = [];
  const completed: QualityRow[] = [];
  for (const m of rows) {
    (m.completedAt ? completed : active).push(toRow(m));
  }
  // Active: soonest target first (undated last). Completed: most recent first.
  active.sort((a, b) => (a.targetIso ?? "9999").localeCompare(b.targetIso ?? "9999"));
  completed.sort((a, b) => (b.completedIso ?? "").localeCompare(a.completedIso ?? ""));
  return { active, completed };
}

/** Projects offered in the inspection's project picker — all but archived. */
export async function loadQualityProjectOptions(): Promise<ProjectOption[]> {
  return prisma.projectRow.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
}

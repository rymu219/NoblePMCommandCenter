"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

interface PhaseInput {
  name: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  color: string;
  isCurrent?: boolean;
}

interface BudgetTrackInput {
  name: string;
  amount: number;
  color: string;
}

const VALID_COLORS = new Set(["slate", "blue", "purple", "yellow", "red"]);

function parseDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${s}`);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

async function assertEditable(projectId: string) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  if (user.role === "admin") return user;
  const proj = await prisma.projectRow.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!proj || proj.ownerId !== user.id) throw new Error("Forbidden.");
  return user;
}

/** Replace ALL phase rows on the project with the supplied set. */
export async function savePhasesAction(projectId: string, formData: FormData) {
  const user = await assertEditable(projectId);
  const raw = String(formData.get("payload") ?? "[]");
  const phases = JSON.parse(raw) as PhaseInput[];

  await prisma.$transaction(async (tx) => {
    await tx.phase.deleteMany({ where: { projectId } });
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (!p.name?.trim()) continue;
      await tx.phase.create({
        data: {
          projectId,
          name: p.name.trim(),
          startDate: parseDate(p.startDate),
          endDate: parseDate(p.endDate),
          color: VALID_COLORS.has(p.color) ? p.color : "slate",
          position: i,
          isCurrent: !!p.isCurrent,
        },
      });
    }
    await tx.projectRow.update({
      where: { id: projectId },
      data: { lastUpdatedById: user.id },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "Phase",
        entityId: projectId,
        action: "replace",
        after: JSON.stringify(phases),
      },
    });
  });
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}`);
}

/** Replace ALL BudgetTrack rows on the project with the supplied set. */
export async function saveBudgetTracksAction(
  projectId: string,
  formData: FormData
) {
  const user = await assertEditable(projectId);
  const raw = String(formData.get("payload") ?? "[]");
  const tracks = JSON.parse(raw) as BudgetTrackInput[];

  await prisma.$transaction(async (tx) => {
    await tx.budgetTrack.deleteMany({ where: { projectId } });
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!t.name?.trim()) continue;
      await tx.budgetTrack.create({
        data: {
          projectId,
          name: t.name.trim(),
          amount: Number(t.amount) || 0,
          color: VALID_COLORS.has(t.color) ? t.color : "slate",
          position: i,
        },
      });
    }
    await tx.projectRow.update({
      where: { id: projectId },
      data: { lastUpdatedById: user.id },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "BudgetTrack",
        entityId: projectId,
        action: "replace",
        after: JSON.stringify(tracks),
      },
    });
  });
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Update the dashboard-level numbers + narrative on the ProjectRow itself.
 */
export async function saveDashboardMetaAction(
  projectId: string,
  formData: FormData
) {
  const user = await assertEditable(projectId);
  const budgetTotal = num(formData.get("budgetTotal"));
  const committedTotal = num(formData.get("committedTotal"));
  const forecastTotal = num(formData.get("forecastTotal"));
  const headroomNote = String(formData.get("headroomNote") ?? "").trim() || null;
  const nextTrigger = String(formData.get("nextTrigger") ?? "").trim() || null;
  const keyMilestone = String(formData.get("keyMilestone") ?? "").trim() || null;
  const dashboardHealth =
    String(formData.get("dashboardHealth") ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    const before = await tx.projectRow.findUnique({ where: { id: projectId } });
    await tx.projectRow.update({
      where: { id: projectId },
      data: {
        budgetTotal,
        committedTotal,
        forecastTotal,
        headroomNote,
        nextTrigger,
        keyMilestone,
        dashboardHealth,
        lastUpdatedById: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "ProjectRow",
        entityId: projectId,
        action: "update_dashboard_meta",
        before: JSON.stringify({
          budgetTotal: before?.budgetTotal,
          committedTotal: before?.committedTotal,
          forecastTotal: before?.forecastTotal,
          headroomNote: before?.headroomNote,
          nextTrigger: before?.nextTrigger,
          keyMilestone: before?.keyMilestone,
          dashboardHealth: before?.dashboardHealth,
        }),
        after: JSON.stringify({
          budgetTotal,
          committedTotal,
          forecastTotal,
          headroomNote,
          nextTrigger,
          keyMilestone,
          dashboardHealth,
        }),
      },
    });
  });
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}`);
}

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

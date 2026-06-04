"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseYmd } from "@/lib/time-tracking";
import { todayUTC } from "@/lib/slippage";
import {
  DEV_CHECKLIST_TEMPLATE,
  DEV_CONTACT_ROLES,
  type DevContacts,
} from "@/lib/dev-checklist";

/*
 * Manufacturing Development checklist mutations. Editable by admin OR the
 * project owner (same rule the project page uses). Each write audit-logs and
 * revalidates the project page. Mirrors app/projects/[id]/status-actions.ts.
 */

/** Authorize admin or the project's owner; returns the acting user. */
async function requireEditor(projectId: string) {
  const user = await requireUser();
  if (user.role === "admin") return user;
  const project = await prisma.projectRow.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project || project.ownerId !== user.id) throw new Error("Admin or project owner only.");
  return user;
}

function ymdOrNull(formData: FormData, field: string): Date | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? parseYmd(v) : null;
}

function intOrNull(formData: FormData, field: string): number | null {
  const v = String(formData.get(field) ?? "").trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Seed the standard process onto a project from DEV_CHECKLIST_TEMPLATE.
 * Idempotent: existing keys are skipped, so this also tops up a project when
 * the template gains new tasks.
 */
export async function applyDevChecklistAction(projectId: string) {
  const user = await requireEditor(projectId);
  const existing = await prisma.devTask.findMany({
    where: { projectId },
    select: { key: true },
  });
  const have = new Set(existing.map((t) => t.key));

  const toCreate = DEV_CHECKLIST_TEMPLATE.map((t, i) => ({ t, position: i })).filter(
    ({ t }) => !have.has(t.key)
  );
  if (toCreate.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.devTask.createMany({
      data: toCreate.map(({ t, position }) => ({
        projectId,
        phase: t.phase,
        key: t.key,
        label: t.label,
        departments: JSON.stringify(t.departments),
        position,
      })),
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "DevChecklist",
        entityId: projectId,
        action: "seed",
        after: JSON.stringify({ created: toCreate.length }),
      },
    });
    await tx.projectRow.update({
      where: { id: projectId },
      data: { lastUpdatedById: user.id },
    });
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Edit a task's planning fields (dates, duration, notes). */
export async function updateDevTaskAction(id: string, formData: FormData) {
  const task = await prisma.devTask.findUnique({ where: { id }, select: { projectId: true } });
  if (!task) throw new Error("Task not found.");
  const user = await requireEditor(task.projectId);

  await prisma.devTask.update({
    where: { id },
    data: {
      targetDate: ymdOrNull(formData, "targetDate"),
      completionDate: ymdOrNull(formData, "completionDate"),
      durationDays: intOrNull(formData, "durationDays"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  await prisma.auditLog.create({
    data: { actorUserId: user.id, entityType: "DevTask", entityId: id, action: "update" },
  });
  revalidatePath(`/projects/${task.projectId}`);
}

/** Check/uncheck a task; stamps completionDate to today when completing. */
export async function toggleDevTaskAction(id: string, complete: boolean) {
  const task = await prisma.devTask.findUnique({
    where: { id },
    select: { projectId: true, completionDate: true },
  });
  if (!task) throw new Error("Task not found.");
  const user = await requireEditor(task.projectId);

  await prisma.devTask.update({
    where: { id },
    data: {
      complete,
      // Stamp today on completion if not already dated; clear on un-complete.
      completionDate: complete ? task.completionDate ?? todayUTC() : null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "DevTask",
      entityId: id,
      action: complete ? "complete" : "reopen",
    },
  });
  revalidatePath(`/projects/${task.projectId}`);
}

/** Save the department-contact header (role→name map). */
export async function saveDevContactsAction(projectId: string, formData: FormData) {
  const user = await requireEditor(projectId);
  const contacts: DevContacts = {};
  for (const r of DEV_CONTACT_ROLES) {
    const v = String(formData.get(r.key) ?? "").trim();
    if (v) contacts[r.key] = v;
  }
  await prisma.projectRow.update({
    where: { id: projectId },
    data: { devContacts: JSON.stringify(contacts), lastUpdatedById: user.id },
  });
  await prisma.auditLog.create({
    data: { actorUserId: user.id, entityType: "DevChecklist", entityId: projectId, action: "contacts" },
  });
  revalidatePath(`/projects/${projectId}`);
}

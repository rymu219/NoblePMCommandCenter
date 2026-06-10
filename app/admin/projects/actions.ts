"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { DEV_CHECKLIST_TEMPLATE } from "@/lib/dev-checklist";

const PROJECT_NUMBER_RE = /^[0-9]{3}-[0-9]{3}$/;

/**
 * Reserved program prefix that holds Pipeline (scoping) items. When a
 * Pipeline project is created without a number, it is auto-assigned the
 * next `000-NNN` id. This prefix is hidden from the public Programs grid.
 */
const PIPELINE_PREFIX = "000";

/** Next free `000-NNN` placeholder id for a Pipeline item. */
async function nextPipelineId(): Promise<string> {
  const rows = await prisma.projectRow.findMany({
    where: { id: { startsWith: `${PIPELINE_PREFIX}-` } },
    select: { id: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = Number.parseInt(r.id.slice(4), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${PIPELINE_PREFIX}-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Validates a Project #, ensures the Program row exists for the prefix
 * (creating it if needed), then inserts the Project row.
 */
export async function createProjectAction(formData: FormData) {
  const user = await requireRole(["admin"]);

  let projectId = String(formData.get("projectId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active");
  const programName = String(formData.get("programName") ?? "").trim() || null;
  const customer = String(formData.get("customer") ?? "").trim() || null;

  if (!name) {
    redirect(`/admin/projects/new?error=${encodeURIComponent("Project name is required.")}`);
  }

  // Pipeline (scoping) items don't need a number up front — auto-assign a
  // `000-NNN` placeholder. Every other status still requires an XXX-XXX.
  const isPipeline = status === "pipeline";
  if (!projectId) {
    if (!isPipeline) {
      redirect(`/admin/projects/new?error=${encodeURIComponent("Project # is required (or set status to Pipeline to auto-assign one).")}`);
    }
    projectId = await nextPipelineId();
  } else if (!PROJECT_NUMBER_RE.test(projectId)) {
    redirect(`/admin/projects/new?error=${encodeURIComponent("Project # must be XXX-XXX (digits).")}`);
  }

  const existing = await prisma.projectRow.findUnique({ where: { id: projectId } });
  if (existing) {
    redirect(`/admin/projects/new?error=${encodeURIComponent(`Project ${projectId} already exists.`)}`);
  }

  const prefix = projectId.slice(0, 3);
  const isPipelineProgram = prefix === PIPELINE_PREFIX;
  await prisma.program.upsert({
    where: { prefix },
    update: isPipelineProgram
      ? {}
      : { name: programName ?? undefined, customer: customer ?? undefined },
    create: {
      prefix,
      name: isPipelineProgram ? "Pipeline" : programName ?? `${prefix}-`,
      customer: isPipelineProgram ? null : customer,
    },
  });

  const created = await prisma.projectRow.create({
    data: {
      id: projectId,
      programPrefix: prefix,
      name,
      subtitle,
      ownerId,
      status,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "Project",
      entityId: created.id,
      action: "create",
      after: JSON.stringify({ projectId, name, prefix, status }),
    },
  });

  // Optionally seed the standard manufacturing-development checklist.
  if (formData.get("seedDevChecklist")) {
    await prisma.devTask.createMany({
      data: DEV_CHECKLIST_TEMPLATE.map((t, i) => ({
        projectId: created.id,
        phase: t.phase,
        key: t.key,
        label: t.label,
        departments: JSON.stringify(t.departments),
        position: i,
      })),
    });
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/programs/${prefix}`);
  revalidatePath("/programs");
  redirect(`/projects/${created.id}`);
}

export async function setAssignmentAction(formData: FormData) {
  const user = await requireRole(["admin"]);
  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const want = formData.get("assigned") === "on";

  const existing = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (want && !existing) {
    await prisma.projectAssignment.create({ data: { projectId, userId } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "ProjectAssignment",
        entityId: `${projectId}|${userId}`,
        action: "assign",
      },
    });
  } else if (!want && existing) {
    await prisma.projectAssignment.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "ProjectAssignment",
        entityId: `${projectId}|${userId}`,
        action: "unassign",
      },
    });
  }
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-work");
}

export async function updateProjectMetaAction(formData: FormData) {
  const user = await requireRole(["admin"]);
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active");

  await prisma.projectRow.update({
    where: { id: projectId },
    data: { name, subtitle, ownerId, status, lastUpdatedById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "Project",
      entityId: projectId,
      action: "update",
      after: JSON.stringify({ name, subtitle, ownerId, status }),
    },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

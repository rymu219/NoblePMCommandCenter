"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const PROJECT_NUMBER_RE = /^[0-9]{3}-[0-9]{3}$/;

/**
 * Validates a Project #, ensures the Program row exists for the prefix
 * (creating it if needed), then inserts the Project row. Optional
 * sections are recorded in `templateToggles`.
 */
export async function createProjectAction(formData: FormData) {
  const user = await requireRole(["admin"]);

  const projectId = String(formData.get("projectId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active");
  const programName = String(formData.get("programName") ?? "").trim() || null;
  const customer = String(formData.get("customer") ?? "").trim() || null;
  const togglesRaw = formData.getAll("section").map((v) => String(v));

  if (!PROJECT_NUMBER_RE.test(projectId)) {
    redirect(`/admin/projects/new?error=${encodeURIComponent("Project # must be XXX-XXX (digits).")}`);
  }
  if (!name) {
    redirect(`/admin/projects/new?error=${encodeURIComponent("Project name is required.")}`);
  }

  const existing = await prisma.projectRow.findUnique({ where: { id: projectId } });
  if (existing) {
    redirect(`/admin/projects/new?error=${encodeURIComponent(`Project ${projectId} already exists.`)}`);
  }

  const prefix = projectId.slice(0, 3);
  await prisma.program.upsert({
    where: { prefix },
    update: { name: programName ?? undefined, customer: customer ?? undefined },
    create: {
      prefix,
      name: programName ?? `${prefix}-`,
      customer,
    },
  });

  const templateToggles: Record<string, boolean> = {};
  for (const t of togglesRaw) templateToggles[t] = true;

  const created = await prisma.projectRow.create({
    data: {
      id: projectId,
      programPrefix: prefix,
      name,
      subtitle,
      ownerId,
      status,
      templateToggles: JSON.stringify(templateToggles),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "Project",
      entityId: created.id,
      action: "create",
      after: JSON.stringify({ projectId, name, prefix, status, templateToggles }),
    },
  });

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
  revalidatePath("/my-week");
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

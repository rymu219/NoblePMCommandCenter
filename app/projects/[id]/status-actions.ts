"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/*
 * Action-item mutations for the project page's follow-up list. Status
 * updates themselves are posted via v2-actions.ts (postUpdateAction);
 * follow-ups are added via addFollowUpAction there.
 */

export async function toggleActionItemAction(
  id: string,
  complete: boolean,
  projectId?: string
) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  await prisma.actionItem.update({
    where: { id },
    data: { completedAt: complete ? new Date() : null },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "ActionItem",
      entityId: id,
      action: complete ? "resolve" : "reopen",
    },
  });
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  revalidatePath("/department");
  revalidatePath("/reports");
}

export async function deleteActionItemAction(id: string, projectId?: string) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  await prisma.actionItem.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "ActionItem",
      entityId: id,
      action: "delete",
    },
  });
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  revalidatePath("/department");
  revalidatePath("/reports");
}

export async function deleteStatusUpdateAction(id: string, projectId: string) {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admin only.");
  await prisma.statusUpdate.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

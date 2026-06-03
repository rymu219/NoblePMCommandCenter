"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildStatusDraft, type StatusDraft } from "@/lib/status-draft";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function parseDateOrToday(s: string | null | undefined): Date {
  if (!s) return todayUtc();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return todayUtc();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

interface StatusBlockInput {
  heading: string;
  body: string;
}
interface ActionItemInput {
  ownerDept: string;
  body: string;
  dueDate?: string | null;
  /** Decision impact tier for SVI weighting. */
  impact?: "low" | "medium" | "high";
  /** Whether this action is blocking progress. */
  blocking?: boolean;
}

const IMPACTS = ["low", "medium", "high"] as const;

/**
 * Server action invoked by the Status editor on the Project page.
 * Creates a new StatusUpdate row (and any ActionItem rows). Each
 * save creates a NEW StatusUpdate — history is preserved.
 *
 * formData fields:
 *   statusLabel        (string)
 *   statusQualifier    (string?)
 *   reportDate         (yyyy-mm-dd)
 *   payload            (JSON string: { blocks: StatusBlockInput[], actionItems: ActionItemInput[] })
 */
export async function saveStatusUpdateAction(
  projectId: string,
  formData: FormData
) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");

  const statusLabel = String(formData.get("statusLabel") ?? "").trim();
  if (!statusLabel) throw new Error("Pick a status label.");
  const statusQualifier =
    String(formData.get("statusQualifier") ?? "").trim() || null;
  const reportDate = parseDateOrToday(String(formData.get("reportDate") ?? ""));

  const payloadRaw = String(formData.get("payload") ?? "{}");
  let payload: { blocks?: StatusBlockInput[]; actionItems?: ActionItemInput[] } =
    {};
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    throw new Error("Could not parse status payload.");
  }
  const blocks = (payload.blocks ?? []).filter(
    (b) => typeof b?.heading === "string" && typeof b?.body === "string"
  );
  const actionItems = (payload.actionItems ?? []).filter(
    (a) => typeof a?.ownerDept === "string" && typeof a?.body === "string"
  );

  const created = await prisma.$transaction(async (tx) => {
    const su = await tx.statusUpdate.create({
      data: {
        projectId,
        reportDate,
        statusLabel,
        statusQualifier,
        blocks: JSON.stringify(blocks),
        authorId: user.id,
      },
    });
    for (const a of actionItems) {
      if (!a.body.trim()) continue;
      await tx.actionItem.create({
        data: {
          projectId,
          statusUpdateId: su.id,
          ownerDept: a.ownerDept,
          body: a.body,
          dueDate: a.dueDate ? new Date(a.dueDate) : null,
          impact: a.impact && IMPACTS.includes(a.impact) ? a.impact : "medium",
          blocking: a.blocking === true,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "StatusUpdate",
        entityId: su.id,
        action: "create",
        after: JSON.stringify({
          projectId,
          statusLabel,
          statusQualifier,
          reportDate: reportDate.toISOString(),
          blocks,
          actionItemCount: actionItems.length,
        }),
      },
    });
    // Bump project last-updated.
    await tx.projectRow.update({
      where: { id: projectId },
      data: { lastUpdatedById: user.id },
    });
    return su;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return created.id;
}

/**
 * Read-only: assemble a draft status update from the project's structured
 * activity since the last status (completed work, schedule moves, overdue and
 * upcoming items). The editor pre-fills these blocks so the PM edits rather than
 * writes from scratch. Never writes; honors the same edit permission as saving.
 */
export async function buildStatusDraftAction(
  projectId: string
): Promise<StatusDraft> {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  return buildStatusDraft(projectId);
}

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

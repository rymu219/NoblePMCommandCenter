"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseYmd } from "@/lib/time-tracking";
import { isKnownCategory, isKnownMethod, isKnownSlipReason } from "@/lib/quality";

/*
 * Quality awareness board mutations (bottom of The Board). Admin-only — the
 * quality list is PM-populated. Each write appends an AuditLog row and
 * revalidates /board. Mirrors app/board/board-actions.ts conventions.
 */

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function ymdOrNull(formData: FormData, field: string): Date | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? parseYmd(v) : null;
}

function strOrNull(formData: FormData, field: string): string | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? v : null;
}

function intOrNull(formData: FormData, field: string): number | null {
  const v = String(formData.get(field) ?? "").trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admin only.");
  return user;
}

function revalidate() {
  revalidatePath("/board");
}

/**
 * Resolve the optional project link from the form. Returns the id if the field
 * is set and the project exists, null if blank. Throws on an unknown id so a
 * stale picker can't dangle a bad reference.
 */
async function resolveProjectId(formData: FormData): Promise<string | null> {
  const id = String(formData.get("projectId") ?? "").trim();
  if (!id) return null;
  const exists = await prisma.projectRow.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new Error("Pick a valid project.");
  return id;
}

/** Create a new active quality inspection. baselineDate is frozen to the target. */
export async function createQualityInspectionAction(formData: FormData) {
  const user = await requireAdmin();
  const item = String(formData.get("item") ?? "").trim();
  if (!item) throw new Error("Item is required.");
  const category = String(formData.get("category") ?? "").trim();
  if (!isKnownCategory(category)) throw new Error("Pick a category.");
  const method = String(formData.get("method") ?? "").trim();
  if (!isKnownMethod(method)) throw new Error("Pick an inspection method.");
  const targetDate = ymdOrNull(formData, "targetDate");
  const estDurationDays = intOrNull(formData, "estDurationDays");
  const projectId = await resolveProjectId(formData);

  const max = await prisma.qualityInspection.aggregate({
    where: { completedAt: null },
    _max: { position: true },
  });

  const created = await prisma.qualityInspection.create({
    data: {
      item,
      projectId,
      category,
      method,
      estDurationDays,
      // Freeze the original commitment at create so later moves measure slip.
      baselineDate: targetDate,
      targetDate,
      position: (max._max.position ?? 0) + 1,
      createdById: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: created.id,
      action: "create",
    },
  });
  revalidate();
}

/**
 * Edit an active inspection. If the target date changes, it's a SLIP: a standard
 * reason is required and stored with the optional note + a timestamp. If the
 * item had no baseline yet (was undated), the new date becomes the baseline
 * rather than counting as a slip.
 */
export async function updateQualityInspectionAction(
  id: string,
  formData: FormData
) {
  const user = await requireAdmin();
  const existing = await prisma.qualityInspection.findUnique({ where: { id } });
  if (!existing) throw new Error("Inspection not found.");

  const item = String(formData.get("item") ?? "").trim();
  if (!item) throw new Error("Item is required.");
  const category = String(formData.get("category") ?? "").trim();
  if (!isKnownCategory(category)) throw new Error("Pick a category.");
  const method = String(formData.get("method") ?? "").trim();
  if (!isKnownMethod(method)) throw new Error("Pick an inspection method.");
  const targetDate = ymdOrNull(formData, "targetDate");
  const estDurationDays = intOrNull(formData, "estDurationDays");
  const projectId = await resolveProjectId(formData);

  const prevTarget = existing.targetDate ? existing.targetDate.getTime() : null;
  const nextTarget = targetDate ? targetDate.getTime() : null;
  const targetChanged = prevTarget !== nextTarget;
  // A slip only counts once there's an established baseline to move from.
  const isSlip = targetChanged && existing.baselineDate !== null && nextTarget !== null;

  const data: {
    item: string;
    projectId: string | null;
    category: string;
    method: string;
    estDurationDays: number | null;
    targetDate: Date | null;
    baselineDate?: Date | null;
    slipReason?: string | null;
    slipNote?: string | null;
    slippedAt?: Date | null;
  } = { item, projectId, category, method, estDurationDays, targetDate };

  if (existing.baselineDate === null && targetDate !== null) {
    // First time it gets a date — establish the baseline, not a slip.
    data.baselineDate = targetDate;
  }

  if (isSlip) {
    const reason = String(formData.get("slipReason") ?? "").trim();
    if (!isKnownSlipReason(reason)) {
      throw new Error("Pick a reason for the date change.");
    }
    data.slipReason = reason;
    data.slipNote = strOrNull(formData, "slipNote");
    data.slippedAt = new Date();
  }

  await prisma.qualityInspection.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: id,
      action: isSlip ? "slip" : "update",
      after: isSlip
        ? JSON.stringify({ slipReason: data.slipReason, targetDate })
        : undefined,
    },
  });
  revalidate();
}

/**
 * Reschedule just the target date of an active inspection — a focused slip
 * capture. If a baseline already exists and the date actually moves, a standard
 * reason is required (same rule as the edit form). If the item was undated, this
 * establishes the baseline instead of counting as a slip.
 */
export async function rescheduleQualityInspectionAction(
  id: string,
  formData: FormData
) {
  const user = await requireAdmin();
  const existing = await prisma.qualityInspection.findUnique({ where: { id } });
  if (!existing) throw new Error("Inspection not found.");

  const targetDate = ymdOrNull(formData, "targetDate");
  if (!targetDate) throw new Error("Pick a new target date.");

  const prevTarget = existing.targetDate ? existing.targetDate.getTime() : null;
  const targetChanged = prevTarget !== targetDate.getTime();
  if (!targetChanged) throw new Error("That's already the target date.");

  const isSlip = existing.baselineDate !== null;

  const data: {
    targetDate: Date;
    baselineDate?: Date;
    slipReason?: string;
    slipNote?: string | null;
    slippedAt?: Date;
  } = { targetDate };

  if (isSlip) {
    const reason = String(formData.get("slipReason") ?? "").trim();
    if (!isKnownSlipReason(reason)) {
      throw new Error("Pick a reason for the date change.");
    }
    data.slipReason = reason;
    data.slipNote = strOrNull(formData, "slipNote");
    data.slippedAt = new Date();
  } else {
    // No baseline yet — this date becomes the original commitment.
    data.baselineDate = targetDate;
  }

  await prisma.qualityInspection.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: id,
      action: isSlip ? "slip" : "update",
      after: isSlip
        ? JSON.stringify({ slipReason: data.slipReason, targetDate })
        : undefined,
    },
  });
  revalidate();
}

/** Mark an active inspection complete (moves it to the bottom table). */
export async function completeQualityInspectionAction(
  id: string,
  completedYmd?: string
) {
  const user = await requireAdmin();
  const completedAt =
    completedYmd && completedYmd.trim() ? parseYmd(completedYmd) : todayUtc();
  await prisma.qualityInspection.update({
    where: { id },
    data: { completedAt },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: id,
      action: "complete",
    },
  });
  revalidate();
}

/** Send a completed inspection back to the active table. */
export async function reopenQualityInspectionAction(id: string) {
  const user = await requireAdmin();
  await prisma.qualityInspection.update({
    where: { id },
    data: { completedAt: null },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: id,
      action: "reopen",
    },
  });
  revalidate();
}

export async function deleteQualityInspectionAction(id: string) {
  const user = await requireAdmin();
  await prisma.qualityInspection.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "QualityInspection",
      entityId: id,
      action: "delete",
    },
  });
  revalidate();
}

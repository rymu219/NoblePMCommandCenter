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

  const max = await prisma.qualityInspection.aggregate({
    where: { completedAt: null },
    _max: { position: true },
  });

  const created = await prisma.qualityInspection.create({
    data: {
      item,
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

  const prevTarget = existing.targetDate ? existing.targetDate.getTime() : null;
  const nextTarget = targetDate ? targetDate.getTime() : null;
  const targetChanged = prevTarget !== nextTarget;
  // A slip only counts once there's an established baseline to move from.
  const isSlip = targetChanged && existing.baselineDate !== null && nextTarget !== null;

  const data: {
    item: string;
    category: string;
    method: string;
    estDurationDays: number | null;
    targetDate: Date | null;
    baselineDate?: Date | null;
    slipReason?: string | null;
    slipNote?: string | null;
    slippedAt?: Date | null;
  } = { item, category, method, estDurationDays, targetDate };

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

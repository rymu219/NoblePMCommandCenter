"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, type AuthUser } from "@/lib/auth";
import { parseYmd } from "@/lib/time-tracking";
import { dayDelta } from "@/lib/slippage";
import { UNSPECIFIED_REASON, isKnownReason } from "@/lib/replan-reasons";

/*
 * Command Center mutations. Conventions:
 * every write runs in a $transaction that also appends an AuditLog row, then
 * revalidates the board + report. Permissions are re-checked here on the
 * server — never trust the client.
 *
 *   - Milestones: admin OR the project owner (create, move target, record
 *     actual, re-baseline, delete). baselineDate is frozen at create; only the
 *     explicit re-baseline action changes it.
 *   - Subtasks: the owning engineer OR admin (create, edit, toggle done,
 *     reorder, delete).
 */

function ymdOrNull(formData: FormData, field: string): Date | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? parseYmd(v) : null;
}

/** Today at UTC midnight — the default actual-completion stamp. */
function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function reqStr(formData: FormData, field: string): string {
  const v = String(formData.get(field) ?? "").trim();
  if (!v) throw new Error(`Missing ${field}.`);
  return v;
}

function strOrNull(formData: FormData, field: string): string | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? v : null;
}

function revalidate(projectId?: string) {
  revalidatePath("/board");
  revalidatePath("/board/report");
  revalidatePath("/my-work");
  revalidatePath("/portfolio");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Milestone management is allowed for admins and the project's owner. */
async function assertCanManageMilestone(tx: Tx, user: AuthUser, projectId: string) {
  if (user.role === "admin") return;
  const proj = await tx.projectRow.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!proj || proj.ownerId !== user.id) throw new Error("Forbidden.");
}

/**
 * Resolve the private cause reason for a committed-date move. Admins MUST pick a
 * known category — that data powers the Execution analytics and is never shown
 * to engineers. A non-admin owner may still move a date, but it is logged as
 * "unspecified" (counts toward replan churn, not the cause breakdown).
 */
function resolveReason(
  formData: FormData,
  user: AuthUser
): { reason: string; note: string | null } {
  if (user.role !== "admin") return { reason: UNSPECIFIED_REASON, note: null };
  const reason = String(formData.get("reason") ?? "").trim();
  if (!isKnownReason(reason)) {
    throw new Error("Choose a reason for moving this committed date.");
  }
  return { reason, note: strOrNull(formData, "reasonNote") };
}

/** Append a private MilestoneReplan row inside the caller's transaction. */
async function recordReplan(
  tx: Tx,
  user: AuthUser,
  milestoneId: string,
  kind: "slip" | "rebaseline",
  from: Date | null,
  to: Date | null,
  reason: string,
  note: string | null
) {
  await tx.milestoneReplan.create({
    data: {
      milestoneId,
      kind,
      fromDate: from,
      toDate: to,
      deltaDays: from && to ? dayDelta(to, from) : 0,
      reason,
      note,
      actorUserId: user.id,
    },
  });
}

// --- Milestones (admin or project owner) ------------------------------------

export async function createMilestoneAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const title = reqStr(formData, "title");
  const target = ymdOrNull(formData, "targetDate"); // optional — may be undated
  const notes = strOrNull(formData, "notes");

  await prisma.$transaction(async (tx) => {
    await assertCanManageMilestone(tx, user, projectId);
    const last = await tx.milestone.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const created = await tx.milestone.create({
      data: {
        projectId,
        title,
        notes,
        baselineDate: target, // baseline frozen to the first committed target
        targetDate: target,
        position: (last?.position ?? -1) + 1,
        createdById: user.id,
      },
    });
    await audit(tx, user, "Milestone", created.id, "create", null, {
      projectId,
      title,
      targetDate: target,
    });
  });
  revalidate(projectId);
}

export async function updateMilestoneAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const title = reqStr(formData, "title");
  const target = ymdOrNull(formData, "targetDate"); // optional — may be undated
  const actual = ymdOrNull(formData, "actualDate"); // empty = not complete
  const notes = strOrNull(formData, "notes");

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.milestone.findUnique({ where: { id } });
    if (!before) throw new Error("Milestone not found.");
    await assertCanManageMilestone(tx, user, before.projectId);
    projectId = before.projectId;
    // Freeze the baseline the first time a target date is set.
    const baselineDate =
      before.baselineDate == null && target != null ? target : before.baselineDate;
    await tx.milestone.update({
      where: { id },
      data: { title, notes, targetDate: target, actualDate: actual, baselineDate },
    });
    await audit(tx, user, "Milestone", id, "update", before, {
      title,
      targetDate: target,
      actualDate: actual,
    });
    // Moving an already-committed target = a slip. Capture its private cause.
    // First-time dating (null → date) and unchanged dates are not slips.
    const isSlipMove =
      before.targetDate != null &&
      target != null &&
      dayDelta(target, before.targetDate) !== 0;
    if (isSlipMove) {
      const { reason, note } = resolveReason(formData, user);
      await recordReplan(tx, user, id, "slip", before.targetDate, target, reason, note);
    }
  });
  revalidate(projectId);
}

/**
 * One-click complete / reopen for a milestone (admin or project owner).
 * Marking complete stamps actualDate = today (UTC midnight) unless a
 * completion date is already recorded; reopening clears it. The gear editor
 * still lets the PM set a specific completion date.
 */
export async function setMilestoneDoneAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const complete = formData.get("complete") === "true";

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.milestone.findUnique({ where: { id } });
    if (!before) throw new Error("Milestone not found.");
    await assertCanManageMilestone(tx, user, before.projectId);
    projectId = before.projectId;
    const actualDate = complete ? before.actualDate ?? todayUtc() : null;
    await tx.milestone.update({ where: { id }, data: { actualDate } });
    await audit(tx, user, "Milestone", id, complete ? "complete" : "reopen", before, {
      actualDate,
    });
  });
  revalidate(projectId);
}

export async function rebaselineMilestoneAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const baseline = ymdOrNull(formData, "baselineDate");
  if (!baseline) throw new Error("A baseline date is required.");

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.milestone.findUnique({ where: { id } });
    if (!before) throw new Error("Milestone not found.");
    await assertCanManageMilestone(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.milestone.update({ where: { id }, data: { baselineDate: baseline } });
    await audit(tx, user, "Milestone", id, "rebaseline", before, {
      baselineDate: baseline,
    });
    // Re-baselining is an explicit reset of the original commitment — always
    // record its private cause.
    const { reason, note } = resolveReason(formData, user);
    await recordReplan(tx, user, id, "rebaseline", before.baselineDate, baseline, reason, note);
  });
  revalidate(projectId);
}

export async function deleteMilestoneAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.milestone.findUnique({ where: { id } });
    if (!before) return;
    await assertCanManageMilestone(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.milestone.delete({ where: { id } }); // cascades subtasks
    await audit(tx, user, "Milestone", id, "delete", before, null);
  });
  revalidate(projectId);
}

/**
 * Set an engineer's engagement on a milestone. support=true demotes them to
 * "supporting" (stores an override row); support=false re-promotes to direct
 * (deletes the row). Authorized for admin or the project owner.
 */
export async function setEngagementAction(formData: FormData) {
  const user = await requireUser();
  const milestoneId = reqStr(formData, "milestoneId");
  const userId = reqStr(formData, "userId");
  const support = formData.get("support") === "true";

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const m = await tx.milestone.findUnique({
      where: { id: milestoneId },
      select: { projectId: true },
    });
    if (!m) throw new Error("Milestone not found.");
    await assertCanManageMilestone(tx, user, m.projectId);
    projectId = m.projectId;

    if (support) {
      await tx.milestoneEngagement.upsert({
        where: { milestoneId_userId: { milestoneId, userId } },
        update: { role: "support" },
        create: { milestoneId, userId, role: "support" },
      });
    } else {
      await tx.milestoneEngagement.deleteMany({ where: { milestoneId, userId } });
    }
    await audit(tx, user, "MilestoneEngagement", `${milestoneId}|${userId}`, support ? "demote" : "promote", null, { support });
  });
  revalidate(projectId);
}

// --- Subtasks (owning engineer or admin) ------------------------------------

/** Loads a subtask and asserts the user may mutate it. */
async function assertSubtaskAccess(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  user: AuthUser,
  subtaskId: string
) {
  const row = await tx.subtask.findUnique({ where: { id: subtaskId } });
  if (!row) throw new Error("Subtask not found.");
  if (user.role !== "admin" && row.ownerId !== user.id) {
    throw new Error("Forbidden.");
  }
  return row;
}

export async function createSubtaskAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const milestoneId = reqStr(formData, "milestoneId");
  const title = reqStr(formData, "title");
  const due = ymdOrNull(formData, "dueDate");

  // Engineers always own what they create. Admin may create on behalf of an
  // engineer by passing ownerId; default to self otherwise.
  let ownerId = user.id;
  if (user.role === "admin") {
    const requested = String(formData.get("ownerId") ?? "").trim();
    if (requested) ownerId = requested;
  }

  await prisma.$transaction(async (tx) => {
    const last = await tx.subtask.findFirst({
      where: { milestoneId, ownerId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const created = await tx.subtask.create({
      data: {
        milestoneId,
        ownerId,
        title,
        dueDate: due,
        position: (last?.position ?? -1) + 1,
      },
    });
    await audit(tx, user, "Subtask", created.id, "create", null, {
      milestoneId,
      ownerId,
      title,
      dueDate: due,
    });
  });
  revalidate();
}

export async function updateSubtaskAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const id = reqStr(formData, "id");
  const title = reqStr(formData, "title");
  const due = ymdOrNull(formData, "dueDate");

  await prisma.$transaction(async (tx) => {
    const before = await assertSubtaskAccess(tx, user, id);
    await tx.subtask.update({ where: { id }, data: { title, dueDate: due } });
    await audit(tx, user, "Subtask", id, "update", before, { title, dueDate: due });
  });
  revalidate();
}

export async function toggleSubtaskAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const id = reqStr(formData, "id");
  const done = formData.get("done") === "on" || formData.get("done") === "true";

  await prisma.$transaction(async (tx) => {
    const before = await assertSubtaskAccess(tx, user, id);
    const completedAt = done ? before.completedAt ?? new Date() : null;
    await tx.subtask.update({ where: { id }, data: { completedAt } });
    await audit(tx, user, "Subtask", id, done ? "complete" : "reopen", before, {
      completedAt,
    });
  });
  revalidate();
}

export async function deleteSubtaskAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const id = reqStr(formData, "id");
  await prisma.$transaction(async (tx) => {
    const before = await assertSubtaskAccess(tx, user, id);
    await tx.subtask.delete({ where: { id } });
    await audit(tx, user, "Subtask", id, "delete", before, null);
  });
  revalidate();
}

export async function moveSubtaskAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const id = reqStr(formData, "id");
  const dir = reqStr(formData, "dir"); // "up" | "down"

  await prisma.$transaction(async (tx) => {
    const row = await assertSubtaskAccess(tx, user, id);
    const neighbor = await tx.subtask.findFirst({
      where: {
        milestoneId: row.milestoneId,
        ownerId: row.ownerId,
        position: dir === "up" ? { lt: row.position } : { gt: row.position },
      },
      orderBy: { position: dir === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return; // already at the edge
    await tx.subtask.update({
      where: { id: row.id },
      data: { position: neighbor.position },
    });
    await tx.subtask.update({
      where: { id: neighbor.id },
      data: { position: row.position },
    });
  });
  revalidate();
}

// --- shared audit helper ----------------------------------------------------

async function audit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  user: AuthUser,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown
) {
  await tx.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType,
      entityId,
      action,
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null,
    },
  });
}

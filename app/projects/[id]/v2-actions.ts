"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, type AuthUser } from "@/lib/auth";
import { parseYmd } from "@/lib/time-tracking";
import { isHealth, HEALTH_TO_STATUS_LABEL, type Health } from "@/components/v2/health";

/*
 * v2 project-page mutations. Every write targets the typed v2 rows only
 * (Risk, Decision, ProductionRun, ProjectRow.health/notes/budget,
 * StatusUpdate.narrative) — never the deprecated JSON blobs. Same
 * conventions as board-actions: $transaction + AuditLog, permissions
 * re-checked server-side, revalidate the pages that render the data.
 */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function reqStr(formData: FormData, field: string): string {
  const v = String(formData.get(field) ?? "").trim();
  if (!v) throw new Error(`Missing ${field}.`);
  return v;
}

function strOrNull(formData: FormData, field: string): string | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? v : null;
}

function numOrNull(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").replace(/[$,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`"${formData.get(field)}" is not a number.`);
  return n;
}

function ymdOrNull(formData: FormData, field: string): Date | null {
  const v = String(formData.get(field) ?? "").trim();
  return v ? parseYmd(v) : null;
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/portfolio");
  revalidatePath("/department");
  revalidatePath("/");
}

/** Editing the v2 project page is allowed for admins and the project owner. */
async function assertCanEditProject(tx: Tx, user: AuthUser, projectId: string) {
  if (user.role === "admin") return;
  const proj = await tx.projectRow.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!proj || proj.ownerId !== user.id) throw new Error("Forbidden.");
}

async function audit(
  tx: Tx,
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

function reqHealth(formData: FormData): Health {
  const v = reqStr(formData, "health");
  if (!isHealth(v)) throw new Error("Pick a health value.");
  return v;
}

// --- health + status update --------------------------------------------------

/** Quick health change from the header pill (no narrative). */
export async function setHealthAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const health = reqHealth(formData);

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    await tx.projectRow.update({
      where: { id: projectId },
      data: { health, lastUpdatedById: user.id },
    });
    await audit(tx, user, "ProjectRow", projectId, "set-health", null, { health });
  });
  revalidate(projectId);
}

/**
 * The weekly ritual: pick health + write the narrative, one save. Sets
 * ProjectRow.health and appends a StatusUpdate (history preserved). Writes
 * `blocks` too so the v1 daily report keeps rendering until phase 4.
 */
export async function postUpdateAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const projectId = reqStr(formData, "projectId");
  const health = reqHealth(formData);
  const narrative = reqStr(formData, "narrative");
  const qualifier = strOrNull(formData, "qualifier");

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const su = await tx.statusUpdate.create({
      data: {
        projectId,
        reportDate: todayUtc(),
        statusLabel: HEALTH_TO_STATUS_LABEL[health],
        statusQualifier: qualifier,
        narrative,
        blocks: JSON.stringify([{ heading: "Update", body: narrative }]),
        authorId: user.id,
      },
    });
    await tx.projectRow.update({
      where: { id: projectId },
      data: { health, lastUpdatedById: user.id },
    });
    await audit(tx, user, "StatusUpdate", su.id, "create", null, {
      projectId,
      health,
      qualifier,
    });
  });
  revalidate(projectId);
  revalidatePath("/reports");
}

/** Add a follow-up (ActionItem) — feeds the daily report's follow-up list. */
export async function addFollowUpAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const projectId = reqStr(formData, "projectId");
  const ownerDept = reqStr(formData, "ownerDept");
  const body = reqStr(formData, "body");
  const dueDate = ymdOrNull(formData, "dueDate");

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const created = await tx.actionItem.create({
      data: { projectId, ownerDept, body, dueDate },
    });
    await audit(tx, user, "ActionItem", created.id, "create", null, {
      projectId,
      ownerDept,
      body,
    });
  });
  revalidate(projectId);
}

// --- budget + notes -----------------------------------------------------------

export async function saveBudgetAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const data = {
    budgetTotal: numOrNull(formData, "budgetTotal"),
    spentTotal: numOrNull(formData, "spentTotal"),
    committedTotal: numOrNull(formData, "committedTotal"),
    forecastTotal: numOrNull(formData, "forecastTotal"),
  };

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const before = await tx.projectRow.findUnique({
      where: { id: projectId },
      select: {
        budgetTotal: true,
        spentTotal: true,
        committedTotal: true,
        forecastTotal: true,
      },
    });
    await tx.projectRow.update({
      where: { id: projectId },
      data: { ...data, lastUpdatedById: user.id },
    });
    await audit(tx, user, "ProjectRow", projectId, "save-budget", before, data);
  });
  revalidate(projectId);
}

export async function saveNotesAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const notes = strOrNull(formData, "notes");

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    await tx.projectRow.update({
      where: { id: projectId },
      data: { notes, lastUpdatedById: user.id },
    });
    await audit(tx, user, "ProjectRow", projectId, "save-notes", null, {
      length: notes?.length ?? 0,
    });
  });
  revalidate(projectId);
}

// --- risks --------------------------------------------------------------------

export async function addRiskAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const body = reqStr(formData, "body");
  const owner = strOrNull(formData, "owner");

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const last = await tx.risk.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const created = await tx.risk.create({
      data: { projectId, body, owner, position: (last?.position ?? -1) + 1 },
    });
    await audit(tx, user, "Risk", created.id, "create", null, { projectId, body });
  });
  revalidate(projectId);
}

export async function updateRiskAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const body = reqStr(formData, "body");
  const owner = strOrNull(formData, "owner");

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.risk.findUnique({ where: { id } });
    if (!before) throw new Error("Risk not found.");
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.risk.update({ where: { id }, data: { body, owner } });
    await audit(tx, user, "Risk", id, "update", before, { body, owner });
  });
  revalidate(projectId);
}

export async function setRiskStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const resolved = formData.get("resolved") === "true";

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.risk.findUnique({ where: { id } });
    if (!before) throw new Error("Risk not found.");
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.risk.update({
      where: { id },
      data: { status: resolved ? "resolved" : "open" },
    });
    await audit(tx, user, "Risk", id, resolved ? "resolve" : "reopen", before, null);
  });
  revalidate(projectId);
}

export async function deleteRiskAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.risk.findUnique({ where: { id } });
    if (!before) return;
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.risk.delete({ where: { id } });
    await audit(tx, user, "Risk", id, "delete", before, null);
  });
  if (projectId) revalidate(projectId);
}

// --- decisions ------------------------------------------------------------------

export async function addDecisionAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const body = reqStr(formData, "body");
  const decidedOn = ymdOrNull(formData, "decidedOn");
  const source = formData.get("source") === "meeting" ? "meeting" : "unilateral";
  const author = strOrNull(formData, "author");

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const last = await tx.decision.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const created = await tx.decision.create({
      data: {
        projectId,
        body,
        decidedOn,
        source,
        author,
        position: (last?.position ?? -1) + 1,
      },
    });
    await audit(tx, user, "Decision", created.id, "create", null, { projectId, body });
  });
  revalidate(projectId);
}

export async function updateDecisionAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const body = reqStr(formData, "body");
  const decidedOn = ymdOrNull(formData, "decidedOn");
  const source = formData.get("source") === "meeting" ? "meeting" : "unilateral";
  const author = strOrNull(formData, "author");

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.decision.findUnique({ where: { id } });
    if (!before) throw new Error("Decision not found.");
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.decision.update({ where: { id }, data: { body, decidedOn, source, author } });
    await audit(tx, user, "Decision", id, "update", before, { body });
  });
  revalidate(projectId);
}

export async function deleteDecisionAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.decision.findUnique({ where: { id } });
    if (!before) return;
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.decision.delete({ where: { id } });
    await audit(tx, user, "Decision", id, "delete", before, null);
  });
  if (projectId) revalidate(projectId);
}

// --- production runs --------------------------------------------------------------

function runFields(formData: FormData) {
  return {
    name: reqStr(formData, "name"),
    purpose: strOrNull(formData, "purpose"),
    parts: Math.round(numOrNull(formData, "parts") ?? 0),
    lbs: numOrNull(formData, "lbs") ?? 0,
    kg: numOrNull(formData, "kg") ?? 0,
  };
}

export async function addRunAction(formData: FormData) {
  const user = await requireUser();
  const projectId = reqStr(formData, "projectId");
  const fields = runFields(formData);

  await prisma.$transaction(async (tx) => {
    await assertCanEditProject(tx, user, projectId);
    const last = await tx.productionRun.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const created = await tx.productionRun.create({
      data: { projectId, ...fields, position: (last?.position ?? -1) + 1 },
    });
    await audit(tx, user, "ProductionRun", created.id, "create", null, fields);
  });
  revalidate(projectId);
}

export async function updateRunAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  const fields = runFields(formData);

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.productionRun.findUnique({ where: { id } });
    if (!before) throw new Error("Run not found.");
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.productionRun.update({ where: { id }, data: fields });
    await audit(tx, user, "ProductionRun", id, "update", before, fields);
  });
  revalidate(projectId);
}

export async function deleteRunAction(formData: FormData) {
  const user = await requireUser();
  const id = reqStr(formData, "id");
  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const before = await tx.productionRun.findUnique({ where: { id } });
    if (!before) return;
    await assertCanEditProject(tx, user, before.projectId);
    projectId = before.projectId;
    await tx.productionRun.delete({ where: { id } });
    await audit(tx, user, "ProductionRun", id, "delete", before, null);
  });
  if (projectId) revalidate(projectId);
}

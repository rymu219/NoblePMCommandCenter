"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeStatus, partMatchKey } from "@/lib/issues";
import { parseIssueImport, type NormalizedIssue } from "@/lib/issues-import";

/*
 * Issue Tracker mutations. Content usually arrives via importIssuesAction
 * (append) and is then triaged in-app. Editable by admin OR project owner.
 * Each write audit-logs and revalidates the tracker + project pages.
 */

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

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/issues`);
  revalidatePath(`/projects/${projectId}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const strOrNull = (fd: FormData, k: string) => str(fd, k) || null;

/** Nested create payload for an issue's challenges + actions. */
function nested(issue: NormalizedIssue) {
  return {
    challenges: {
      create: issue.challenges.map((c, i) => ({ title: c.title, body: c.body, position: i })),
    },
    actions: {
      create: issue.actions.map((a, i) => ({
        body: a.body,
        owner: a.owner,
        done: a.done,
        position: i,
      })),
    },
  };
}

/**
 * Append imported issues. Parts are matched to existing ones by drawing number
 * (else name); missing parts are created. Issues are always appended — never
 * clobbers in-app edits.
 */
export async function importIssuesAction(projectId: string, formData: FormData) {
  const user = await requireEditor(projectId);
  const parsed = parseIssueImport(str(formData, "json"));
  if ("error" in parsed) throw new Error(parsed.error);

  const existingParts = await prisma.part.findMany({
    where: { projectId },
    select: { id: true, name: true, drawingNumber: true, position: true },
  });
  const byKey = new Map(existingParts.map((p) => [partMatchKey(p), p]));
  let nextPartPos = existingParts.reduce((m, p) => Math.max(m, p.position + 1), 0);

  // Count existing issues per part + cross-cutting so appends keep ordering.
  const counts = await prisma.issue.groupBy({ by: ["partId"], where: { projectId }, _count: { _all: true } });
  const issuePos = new Map<string | null, number>();
  for (const c of counts) issuePos.set(c.partId, c._count._all);
  const nextIssuePos = (partId: string | null) => {
    const n = issuePos.get(partId) ?? 0;
    issuePos.set(partId, n + 1);
    return n;
  };

  await prisma.$transaction(async (tx) => {
    const createIssue = (partId: string | null, issue: NormalizedIssue) =>
      tx.issue.create({
        data: {
          projectId,
          partId,
          charLabel: issue.charLabel,
          title: issue.title,
          synopsis: issue.synopsis,
          status: normalizeStatus(issue.status),
          owner: issue.owner,
          position: nextIssuePos(partId),
          ...nested(issue),
        },
      });

    for (const part of parsed.payload.parts) {
      const key = partMatchKey(part);
      let partId = byKey.get(key)?.id;
      if (!partId) {
        const created = await tx.part.create({
          data: {
            projectId,
            name: part.name,
            drawingNumber: part.drawingNumber,
            revision: part.revision,
            cavities: part.cavities,
            position: nextPartPos++,
          },
        });
        partId = created.id;
        byKey.set(key, { id: partId, name: part.name, drawingNumber: part.drawingNumber, position: 0 });
      }
      for (const issue of part.issues) await createIssue(partId, issue);
    }
    for (const issue of parsed.payload.crossCutting) await createIssue(null, issue);

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "IssueTracker",
        entityId: projectId,
        action: "import",
        after: JSON.stringify({ parts: parsed.partCount, issues: parsed.issueCount }),
      },
    });
  });

  revalidate(projectId);
}

// --- Parts ------------------------------------------------------------------

export async function addPartAction(projectId: string, formData: FormData) {
  await requireEditor(projectId);
  const name = str(formData, "name") || str(formData, "drawingNumber");
  if (!name) throw new Error("Part name or drawing number is required.");
  const cav = Number.parseInt(str(formData, "cavities"), 10);
  const max = await prisma.part.aggregate({ where: { projectId }, _max: { position: true } });
  await prisma.part.create({
    data: {
      projectId,
      name,
      drawingNumber: strOrNull(formData, "drawingNumber"),
      revision: strOrNull(formData, "revision"),
      cavities: Number.isFinite(cav) && cav > 0 ? cav : null,
      position: (max._max.position ?? -1) + 1,
    },
  });
  revalidate(projectId);
}

export async function deletePartAction(id: string) {
  const part = await prisma.part.findUnique({ where: { id }, select: { projectId: true } });
  if (!part) return;
  await requireEditor(part.projectId);
  // Issues survive (partId set null → cross-cutting) per the schema relation.
  await prisma.part.delete({ where: { id } });
  revalidate(part.projectId);
}

// --- Issues -----------------------------------------------------------------

export async function addIssueAction(projectId: string, formData: FormData) {
  await requireEditor(projectId);
  const title = str(formData, "title");
  if (!title) throw new Error("Issue title is required.");
  const partId = strOrNull(formData, "partId");
  const max = await prisma.issue.aggregate({ where: { projectId, partId }, _max: { position: true } });
  await prisma.issue.create({
    data: {
      projectId,
      partId,
      title,
      charLabel: strOrNull(formData, "charLabel"),
      synopsis: strOrNull(formData, "synopsis"),
      status: normalizeStatus(str(formData, "status")),
      owner: strOrNull(formData, "owner"),
      position: (max._max.position ?? -1) + 1,
    },
  });
  revalidate(projectId);
}

export async function updateIssueAction(id: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id }, select: { projectId: true } });
  if (!issue) throw new Error("Issue not found.");
  await requireEditor(issue.projectId);
  await prisma.issue.update({
    where: { id },
    data: {
      title: str(formData, "title"),
      charLabel: strOrNull(formData, "charLabel"),
      synopsis: strOrNull(formData, "synopsis"),
      status: normalizeStatus(str(formData, "status")),
      owner: strOrNull(formData, "owner"),
      partId: strOrNull(formData, "partId"),
    },
  });
  revalidate(issue.projectId);
}

export async function setIssueStatusAction(id: string, status: string) {
  const issue = await prisma.issue.findUnique({ where: { id }, select: { projectId: true } });
  if (!issue) throw new Error("Issue not found.");
  await requireEditor(issue.projectId);
  await prisma.issue.update({ where: { id }, data: { status: normalizeStatus(status) } });
  revalidate(issue.projectId);
}

export async function deleteIssueAction(id: string) {
  const issue = await prisma.issue.findUnique({ where: { id }, select: { projectId: true } });
  if (!issue) return;
  await requireEditor(issue.projectId);
  await prisma.issue.delete({ where: { id } });
  revalidate(issue.projectId);
}

// --- Actions & challenges under an issue ------------------------------------

async function issueProject(issueId: string): Promise<string> {
  const i = await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true } });
  if (!i) throw new Error("Issue not found.");
  return i.projectId;
}

export async function addIssueActionItemAction(issueId: string, formData: FormData) {
  const projectId = await issueProject(issueId);
  await requireEditor(projectId);
  const body = str(formData, "body");
  if (!body) throw new Error("Action text is required.");
  const max = await prisma.issueAction.aggregate({ where: { issueId }, _max: { position: true } });
  await prisma.issueAction.create({
    data: { issueId, body, owner: strOrNull(formData, "owner"), position: (max._max.position ?? -1) + 1 },
  });
  revalidate(projectId);
}

export async function toggleIssueActionDoneAction(id: string, done: boolean) {
  const a = await prisma.issueAction.findUnique({ where: { id }, include: { issue: { select: { projectId: true } } } });
  if (!a) return;
  await requireEditor(a.issue.projectId);
  await prisma.issueAction.update({ where: { id }, data: { done } });
  revalidate(a.issue.projectId);
}

export async function deleteIssueActionItemAction(id: string) {
  const a = await prisma.issueAction.findUnique({ where: { id }, include: { issue: { select: { projectId: true } } } });
  if (!a) return;
  await requireEditor(a.issue.projectId);
  await prisma.issueAction.delete({ where: { id } });
  revalidate(a.issue.projectId);
}

export async function addChallengeAction(issueId: string, formData: FormData) {
  const projectId = await issueProject(issueId);
  await requireEditor(projectId);
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title && !body) throw new Error("Challenge needs a title or body.");
  const max = await prisma.issueChallenge.aggregate({ where: { issueId }, _max: { position: true } });
  await prisma.issueChallenge.create({
    data: { issueId, title: title || "Challenge", body, position: (max._max.position ?? -1) + 1 },
  });
  revalidate(projectId);
}

export async function deleteChallengeAction(id: string) {
  const c = await prisma.issueChallenge.findUnique({ where: { id }, include: { issue: { select: { projectId: true } } } });
  if (!c) return;
  await requireEditor(c.issue.projectId);
  await prisma.issueChallenge.delete({ where: { id } });
  revalidate(c.issue.projectId);
}

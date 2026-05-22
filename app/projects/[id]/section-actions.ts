"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const VALID_KINDS = new Set([
  "summary_cards",
  "parts_material",
  "hours_by_role",
  "gantt_overview",
  "gantt_detail",
  "risks_preconditions",
  "decisions_log",
  "notes_freeform",
]);

/**
 * Generic section-save. Each editor posts its full payload (already
 * shaped to the renderer's expected JSON) and we upsert one
 * ProjectSection row keyed on (projectId, kind). Every save writes an
 * AuditLog row and bumps the project's lastUpdated stamp.
 */
export async function saveSectionAction(
  projectId: string,
  kind: string,
  formData: FormData
) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  if (!VALID_KINDS.has(kind)) throw new Error(`Unknown section kind: ${kind}`);

  const payloadRaw = String(formData.get("payload") ?? "{}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    throw new Error("Could not parse section payload.");
  }

  const data = JSON.stringify(parsed);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.projectSection.findUnique({
      where: { projectId_kind: { projectId, kind } },
    });
    const position = existing?.position ?? defaultPosition(kind);

    await tx.projectSection.upsert({
      where: { projectId_kind: { projectId, kind } },
      update: { data, updatedById: user.id },
      create: { projectId, kind, position, data, updatedById: user.id },
    });

    await tx.projectRow.update({
      where: { id: projectId },
      data: { lastUpdatedById: user.id },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "ProjectSection",
        entityId: `${projectId}|${kind}`,
        action: existing ? "update" : "create",
        after: data.length > 4000 ? data.slice(0, 4000) + "…" : data,
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

function defaultPosition(kind: string): number {
  const order: Record<string, number> = {
    summary_cards: 10,
    parts_material: 20,
    hours_by_role: 30,
    gantt_overview: 40,
    gantt_detail: 50,
    risks_preconditions: 60,
    decisions_log: 70,
    notes_freeform: 80,
  };
  return order[kind] ?? 99;
}

/**
 * Replaces the project's templateToggles JSON with the supplied map.
 * Toggling a section off does NOT delete its ProjectSection row — the
 * data is preserved so re-enabling restores it.
 */
export async function setSectionTogglesAction(
  projectId: string,
  formData: FormData
) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");

  const toggles: Record<string, boolean> = {};
  for (const k of VALID_KINDS) {
    toggles[k] = formData.get(`toggle:${k}`) === "on";
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.projectRow.findUnique({ where: { id: projectId } });
    await tx.projectRow.update({
      where: { id: projectId },
      data: {
        templateToggles: JSON.stringify(toggles),
        lastUpdatedById: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "ProjectRow",
        entityId: projectId,
        action: "update_section_toggles",
        before: before?.templateToggles ?? null,
        after: JSON.stringify(toggles),
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
}

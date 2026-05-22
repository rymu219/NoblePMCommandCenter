"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function saveProgramNarrativeAction(
  prefix: string,
  formData: FormData
) {
  const user = await requireRole(["admin"]);
  const execSummary = String(formData.get("execSummary") ?? "").trim() || null;
  const decisionsAsked =
    String(formData.get("decisionsAsked") ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    const before = await tx.program.findUnique({ where: { prefix } });
    if (!before) throw new Error(`Unknown program prefix ${prefix}`);
    await tx.program.update({
      where: { prefix },
      data: { execSummary, decisionsAsked },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "Program",
        entityId: prefix,
        action: "update_narrative",
        before: JSON.stringify({
          execSummary: before.execSummary,
          decisionsAsked: before.decisionsAsked,
        }),
        after: JSON.stringify({ execSummary, decisionsAsked }),
      },
    });
  });
  revalidatePath(`/programs/${prefix}/executive-status`);
}

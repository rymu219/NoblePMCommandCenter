"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export async function savePortfolioNoteAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  const kind = String(formData.get("kind") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!["priority_callout", "key_risks", "forward_looking"].includes(kind)) {
    throw new Error("Unknown note kind.");
  }
  const reportDate = todayUtc();

  if (body.trim() === "") {
    await prisma.portfolioNote.deleteMany({ where: { reportDate, kind } });
  } else {
    await prisma.portfolioNote.upsert({
      where: { reportDate_kind: { reportDate, kind } },
      update: { body, authorId: user.id },
      create: { reportDate, kind, body, authorId: user.id },
    });
  }
  revalidatePath("/");
}

export async function publishDailyReportAction(snapshotJson: string) {
  const user = await requireRole(["admin"]);
  const reportDate = todayUtc();
  const report = await prisma.report.create({
    data: {
      kind: "daily_tooling",
      reportDate,
      snapshot: snapshotJson,
      authorId: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "Report",
      entityId: report.id,
      action: "publish",
    },
  });
  revalidatePath("/reports");
  redirect(`/reports/${report.id}`);
}

export async function toggleActionItemAction(id: string, complete: boolean) {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Forbidden.");
  await prisma.actionItem.update({
    where: { id },
    data: { completedAt: complete ? new Date() : null },
  });
  revalidatePath("/");
}

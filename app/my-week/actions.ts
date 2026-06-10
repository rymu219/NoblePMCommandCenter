"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertOpenPeriod, parseYmd, startOfWeek } from "@/lib/time-tracking";

export async function saveCellAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "engineer" && user.role !== "admin") {
    throw new Error("Only engineers can log time.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const hoursRaw = String(formData.get("hours") ?? "0");
  if (!projectId || !dateStr) throw new Error("Missing project or date.");

  const date = parseYmd(dateStr);
  await assertOpenPeriod(date);

  const hours = Math.max(0, Math.min(24, parseFloat(hoursRaw) || 0));

  if (hours === 0) {
    await prisma.timeEntry.deleteMany({
      where: { userId: user.id, projectId, entryDate: date },
    });
  } else {
    await prisma.timeEntry.upsert({
      where: {
        userId_projectId_entryDate: {
          userId: user.id,
          projectId,
          entryDate: date,
        },
      },
      update: { hours },
      create: {
        userId: user.id,
        projectId,
        entryDate: date,
        hours,
      },
    });
  }

  revalidatePath("/my-week");
  revalidatePath("/my-work");
}

export async function saveNoteAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "engineer" && user.role !== "admin") {
    throw new Error("Only engineers can log notes.");
  }
  const projectId = String(formData.get("projectId") ?? "");
  const weekStartStr = String(formData.get("weekStart") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!projectId || !weekStartStr) throw new Error("Missing project or week.");
  const weekStart = startOfWeek(parseYmd(weekStartStr));

  if (note === "") {
    await prisma.timeNote.deleteMany({
      where: { userId: user.id, projectId, weekStartDate: weekStart },
    });
  } else {
    await prisma.timeNote.upsert({
      where: {
        userId_projectId_weekStartDate: {
          userId: user.id,
          projectId,
          weekStartDate: weekStart,
        },
      },
      update: { note },
      create: {
        userId: user.id,
        projectId,
        weekStartDate: weekStart,
        note,
      },
    });
  }

  revalidatePath("/my-week");
  revalidatePath("/my-work");
}

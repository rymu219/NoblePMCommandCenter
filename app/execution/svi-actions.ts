"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { captureSviSnapshots } from "@/lib/svi-loader";

/**
 * Capture/refresh this week's SVI snapshot for every active project. Admin-only;
 * idempotent per (project, ISO-week). Feeds the trailing-trend arrow.
 */
export async function captureSviSnapshotsAction(): Promise<number> {
  await requireRole(["admin"]);
  const count = await captureSviSnapshots();
  revalidatePath("/execution");
  return count;
}

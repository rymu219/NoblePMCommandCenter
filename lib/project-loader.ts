import { prisma } from "./prisma";

/* Lean project list for the /projects index and daily-report counts. */

const STATUS_DISPLAY: Record<string, string> = {
  pipeline: "Pipeline",
  not_started: "Not started",
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  archived: "Archived",
};

export async function listProjectsForDashboard() {
  const rows = await prisma.projectRow.findMany({
    include: { owner: true, timeEntries: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    projectNumber: r.id,
    name: r.name,
    programPrefix: r.programPrefix,
    status: STATUS_DISPLAY[r.status] ?? "Active",
    owner: r.owner?.name ?? "—",
    lastUpdated: r.lastUpdatedAt.toISOString().slice(0, 10),
    hoursLogged: r.timeEntries.reduce((s, e) => s + e.hours, 0),
    hoursEstimated: null as number | null,
    nextGate: undefined as string | undefined,
  }));
}

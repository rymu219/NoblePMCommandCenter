import { prisma } from "./prisma";
import type {
  DecisionItem,
  GanttBar,
  GanttGate,
  HoursRow,
  PartsRunRow,
  ProjectRecord,
  RiskItem,
  SequentialStep,
  SummaryCard,
} from "./types";

/*
 * Loads a Project record + its sections from the DB and inflates the
 * jsonb (TEXT-as-JSON on SQLite) section data into typed sections.
 */
export async function loadProject(id: string): Promise<ProjectRecord | null> {
  const row = await prisma.projectRow.findUnique({
    where: { id },
    include: { sections: true, owner: true },
  });
  if (!row) return null;

  const byKind = new Map<string, unknown>();
  for (const s of row.sections) {
    try {
      byKind.set(s.kind, JSON.parse(s.data));
    } catch {
      // ignore malformed
    }
  }

  return {
    projectNumber: row.id,
    name: row.name,
    programPrefix: row.programPrefix,
    subtitle: row.subtitle ?? "",
    status: statusLabel(row.status),
    owner: row.owner?.name ?? "—",
    lastUpdated: row.lastUpdatedAt.toISOString().slice(0, 10),
    budgetTotal: row.budgetTotal ?? undefined,
    spentTotal: row.spentTotal ?? undefined,
    sections: {
      summaryCards: byKind.get("summary_cards") as SummaryCard[][] | undefined,
      partsMaterial: byKind.get("parts_material") as
        | { rows: PartsRunRow[] }
        | undefined,
      hoursByRole: byKind.get("hours_by_role") as
        | { rows: HoursRow[] }
        | undefined,
      ganttOverview: byKind.get("gantt_overview") as
        | {
            totalWeeks: number;
            bars: GanttBar[];
            gates: GanttGate[];
          }
        | undefined,
      ganttDetail: byKind.get("gantt_detail") as
        | {
            totalDays: number;
            workingStartHour: number;
            workingEndHour: number;
            steps: SequentialStep[];
          }
        | undefined,
      risks: (byKind.get("risks_preconditions") as { items?: RiskItem[] } | undefined)?.items,
      decisions: (byKind.get("decisions_log") as { items?: DecisionItem[] } | undefined)?.items,
      notes: (byKind.get("notes_freeform") as { blocks?: string[] } | undefined)?.blocks,
    },
  };
}

function statusLabel(s: string): ProjectRecord["status"] {
  const map: Record<string, ProjectRecord["status"]> = {
    not_started: "Not started",
    active: "Active",
    on_hold: "On hold",
    complete: "Complete",
    archived: "Archived",
  };
  return map[s] ?? "Active";
}

export async function listProjectsForDashboard() {
  const rows = await prisma.projectRow.findMany({
    include: { owner: true, timeEntries: true, sections: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => {
    const hoursLogged = r.timeEntries.reduce((s, e) => s + e.hours, 0);
    let hoursEstimated: number | null = null;
    const hbr = r.sections.find((s) => s.kind === "hours_by_role");
    if (hbr) {
      try {
        const data = JSON.parse(hbr.data) as { rows: HoursRow[] };
        hoursEstimated = data.rows.reduce((s, x) => s + x.hours, 0);
      } catch {
        /* noop */
      }
    }
    return {
      projectNumber: r.id,
      name: r.name,
      programPrefix: r.programPrefix,
      status: statusLabel(r.status),
      owner: r.owner?.name ?? "—",
      lastUpdated: r.lastUpdatedAt.toISOString().slice(0, 10),
      hoursLogged,
      hoursEstimated,
      nextGate: undefined as string | undefined,
    };
  });
}

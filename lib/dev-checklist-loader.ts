import { prisma } from "./prisma";
import { ymd } from "./time-tracking";
import { todayUTC } from "./slippage";
import {
  DEV_PHASES,
  parseDevContacts,
  summarizeChecklist,
  type DevContacts,
  type DevSummary,
} from "./dev-checklist";

/*
 * Read-side for the Manufacturing Development checklist on the project page.
 * Returns the project's DevTask rows grouped by phase, a progress summary
 * (overall + per-phase % complete, current phase, overdue count), and the
 * parsed department contacts. Date math reuses lib/time-tracking.
 */

export interface DevTaskView {
  id: string;
  phase: number;
  key: string;
  label: string;
  departments: string[];
  complete: boolean;
  durationDays: number | null;
  targetIso: string | null;
  completionIso: string | null;
  notes: string | null;
  position: number;
  /** Incomplete and past target. */
  overdue: boolean;
}

export interface DevPhaseGroup {
  phase: number;
  name: string;
  tasks: DevTaskView[];
}

export interface DevChecklist {
  phases: DevPhaseGroup[];
  summary: DevSummary;
  contacts: DevContacts;
  /** True when the project has no tasks yet (offer "Apply standard checklist"). */
  empty: boolean;
}

function parseDepartments(raw: string): string[] {
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}

export async function loadDevChecklist(projectId: string): Promise<DevChecklist> {
  const todayIso = ymd(todayUTC());
  const [rows, project] = await Promise.all([
    prisma.devTask.findMany({
      where: { projectId },
      orderBy: [{ position: "asc" }, { phase: "asc" }],
    }),
    prisma.projectRow.findUnique({ where: { id: projectId }, select: { devContacts: true } }),
  ]);

  const tasks: DevTaskView[] = rows.map((t) => {
    const targetIso = t.targetDate ? ymd(t.targetDate) : null;
    return {
      id: t.id,
      phase: t.phase,
      key: t.key,
      label: t.label,
      departments: parseDepartments(t.departments),
      complete: t.complete,
      durationDays: t.durationDays,
      targetIso,
      completionIso: t.completionDate ? ymd(t.completionDate) : null,
      notes: t.notes,
      position: t.position,
      overdue: !t.complete && !!targetIso && targetIso < todayIso,
    };
  });

  const phaseNums = [...new Set(tasks.map((t) => t.phase))].sort((a, b) => a - b);
  const phases: DevPhaseGroup[] = phaseNums.map((phase) => ({
    phase,
    name: DEV_PHASES[phase] ?? `Phase ${phase}`,
    tasks: tasks.filter((t) => t.phase === phase),
  }));

  const summary = summarizeChecklist(
    tasks.map((t) => ({ phase: t.phase, complete: t.complete, targetIso: t.targetIso })),
    todayIso
  );

  return {
    phases,
    summary,
    contacts: parseDevContacts(project?.devContacts),
    empty: rows.length === 0,
  };
}

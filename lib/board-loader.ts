import { prisma } from "./prisma";
import { ymd } from "./time-tracking";
import type { AuthUser } from "./auth";
import {
  type Cue,
  type MilestoneBucket,
  type SlippageRow,
  aggregate,
  milestoneBucket,
  milestoneCue,
  milestoneVsBaseline,
  monthKey,
  subtaskCue,
  subtaskDaysLate,
  targetDriftDays,
  todayUTC,
} from "./slippage";

/*
 * Read-side for the Command Center board + slippage report.
 *
 * loadBoard does a fixed 4-query fan-in (engineers → assignments →
 * milestones → subtasks) and assembles swimlanes in memory with Maps, the
 * same shape as loadWeekGrid — no per-lane queries, no N+1.
 *
 * Visibility (enforced here, not the client):
 *   - engineer → only their own swimlane
 *   - admin / viewer → every engineer's swimlane + an "Unassigned" lane for
 *     milestones on projects with no engineer assigned
 */

export interface BoardSubtask {
  id: string;
  title: string;
  dueDateIso: string | null;
  completedAtIso: string | null;
  position: number;
  cue: Cue;
  daysLate: number | null;
}

export interface BoardMilestone {
  id: string;
  projectId: string;
  title: string;
  notes: string | null;
  baselineIso: string | null;
  targetIso: string | null;
  actualIso: string | null;
  driftDays: number;
  cue: Cue;
  vsBaseline: number | null;
  subtasks: BoardSubtask[];
  /** Completed subtasks shown in this card (the lane engineer's). */
  doneCount: number;
  /** Total subtasks shown in this card. */
  totalCount: number;
}

/** A milestone as it appears in an engineer's lane, with its project label and
 *  this engineer's engagement (direct vs supporting). */
export interface BoardMilestoneCard extends BoardMilestone {
  projectName: string;
  /** True when the lane's engineer is demoted to supporting on this milestone. */
  isSupport: boolean;
}

export type BoardSectionKey =
  | "undated"
  | "overdue"
  | "upcoming"
  | "horizon"
  | "supporting"
  | "completed";

export interface BoardSection {
  key: BoardSectionKey;
  label: string;
  milestones: BoardMilestoneCard[];
}

export interface BoardSwimlane {
  /** Engineer id, or "__unassigned__" for the orphan lane. */
  ownerId: string;
  ownerName: string;
  isUnassigned: boolean;
  sections: BoardSection[];
  /** Projects this engineer is assigned to — the add-milestone picker list. */
  assignableProjects: Array<{ id: string; name: string }>;
}

export interface BoardData {
  swimlanes: BoardSwimlane[];
  /** Whether the viewer can create/edit milestones (admin only). */
  canEditMilestones: boolean;
  /** Whether the viewer can edit subtasks at all (admin or engineer). */
  canEditSubtasks: boolean;
  /** Engineers available as subtask owners (for admin create-on-behalf). */
  engineers: Array<{ id: string; name: string }>;
}

const UNASSIGNED = "__unassigned__";

/** Lane section render order + labels. Empty sections are omitted. */
const SECTION_ORDER: Array<{ key: BoardSectionKey; label: string }> = [
  { key: "undated", label: "Needs a date" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "horizon", label: "On the horizon" },
  { key: "supporting", label: "Supporting" },
  { key: "completed", label: "Completed — with thanks" },
];

function toSubtask(s: {
  id: string;
  title: string;
  dueDate: Date | null;
  completedAt: Date | null;
  position: number;
}): BoardSubtask {
  const today = todayUTC();
  return {
    id: s.id,
    title: s.title,
    dueDateIso: s.dueDate ? ymd(s.dueDate) : null,
    completedAtIso: s.completedAt ? ymd(s.completedAt) : null,
    position: s.position,
    cue: subtaskCue({ dueDate: s.dueDate, completedAt: s.completedAt }, today),
    daysLate: subtaskDaysLate({ dueDate: s.dueDate, completedAt: s.completedAt }),
  };
}

export async function loadBoard(viewer: AuthUser): Promise<BoardData> {
  const isAdmin = viewer.role === "admin";
  const seesAll = isAdmin || viewer.role === "viewer";

  // 1. Engineer set.
  const engineerUsers = seesAll
    ? await prisma.user.findMany({
        where: { role: "engineer", active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [{ id: viewer.id, name: viewer.name }];
  const engineerIds = engineerUsers.map((e) => e.id);

  // 2. Assignments for those engineers (+ the project rows).
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: { in: engineerIds } },
    include: { project: { select: { id: true, name: true } } },
  });
  const projectsByEngineer = new Map<string, Array<{ id: string; name: string }>>();
  const projectName = new Map<string, string>();
  for (const a of assignments) {
    projectName.set(a.projectId, a.project.name);
    const list = projectsByEngineer.get(a.userId) ?? [];
    list.push({ id: a.projectId, name: a.project.name });
    projectsByEngineer.set(a.userId, list);
  }

  // 3. Milestones. Admin/viewer load every milestone (so orphans surface in
  //    the Unassigned lane); an engineer only needs their assigned projects'.
  const assignedProjectIds = [...projectName.keys()];
  const milestones = await prisma.milestone.findMany({
    where: seesAll ? {} : { projectId: { in: assignedProjectIds } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ projectId: "asc" }, { position: "asc" }],
  });
  for (const m of milestones) projectName.set(m.projectId, m.project.name);
  const milestonesByProject = new Map<string, typeof milestones>();
  for (const m of milestones) {
    const list = milestonesByProject.get(m.projectId) ?? [];
    list.push(m);
    milestonesByProject.set(m.projectId, list);
  }
  const milestoneIds = milestones.map((m) => m.id);

  // 4. Subtasks for the visible engineers under the visible milestones.
  const subtasks = await prisma.subtask.findMany({
    where: { ownerId: { in: engineerIds }, milestoneId: { in: milestoneIds } },
    orderBy: [{ milestoneId: "asc" }, { position: "asc" }],
  });
  const subtasksByOwnerMs = new Map<string, BoardSubtask[]>();
  for (const s of subtasks) {
    const key = `${s.ownerId}|${s.milestoneId}`;
    const list = subtasksByOwnerMs.get(key) ?? [];
    list.push(toSubtask(s));
    subtasksByOwnerMs.set(key, list);
  }

  // 5. Engagement overrides — a row means that engineer is "supporting".
  const engagements = await prisma.milestoneEngagement.findMany({
    where: { userId: { in: engineerIds }, milestoneId: { in: milestoneIds } },
    select: { userId: true, milestoneId: true },
  });
  const supportSet = new Set(
    engagements.map((e) => `${e.userId}|${e.milestoneId}`)
  );

  const today = todayUTC();
  function buildCard(
    m: (typeof milestones)[number],
    ownerId: string,
    isSupport: boolean
  ): BoardMilestoneCard {
    const subs = subtasksByOwnerMs.get(`${ownerId}|${m.id}`) ?? [];
    return {
      id: m.id,
      projectId: m.projectId,
      projectName: projectName.get(m.projectId) ?? m.projectId,
      title: m.title,
      notes: m.notes,
      baselineIso: m.baselineDate ? ymd(m.baselineDate) : null,
      targetIso: m.targetDate ? ymd(m.targetDate) : null,
      actualIso: m.actualDate ? ymd(m.actualDate) : null,
      driftDays: targetDriftDays(m),
      cue: milestoneCue(m, today),
      vsBaseline: milestoneVsBaseline(m),
      subtasks: subs,
      doneCount: subs.filter((s) => s.completedAtIso !== null).length,
      totalCount: subs.length,
      isSupport,
    };
  }

  // Assemble an engineer's lane: classify each of their projects' milestones
  // into a section, then order/sort the sections.
  function buildLane(
    ownerId: string,
    ownerName: string,
    isUnassigned: boolean,
    projectIds: string[],
    assignableProjects: Array<{ id: string; name: string }>
  ): BoardSwimlane {
    const byKey = new Map<BoardSectionKey, BoardMilestoneCard[]>();
    for (const pid of projectIds) {
      for (const m of milestonesByProject.get(pid) ?? []) {
        const isSupport =
          !isUnassigned && supportSet.has(`${ownerId}|${m.id}`);
        const bucket: MilestoneBucket = milestoneBucket(m, today);
        const key: BoardSectionKey =
          isSupport && bucket !== "completed" ? "supporting" : bucket;
        const list = byKey.get(key) ?? [];
        list.push(buildCard(m, ownerId, isSupport));
        byKey.set(key, list);
      }
    }

    const sections: BoardSection[] = [];
    for (const { key, label } of SECTION_ORDER) {
      const cards = byKey.get(key);
      if (!cards || cards.length === 0) continue;
      // Completed: most-recently-done first; everything else: soonest target.
      cards.sort((a, b) =>
        key === "completed"
          ? (b.actualIso ?? "").localeCompare(a.actualIso ?? "")
          : (a.targetIso ?? "").localeCompare(b.targetIso ?? "")
      );
      sections.push({ key, label, milestones: cards });
    }
    return { ownerId, ownerName, isUnassigned, sections, assignableProjects };
  }

  const swimlanes: BoardSwimlane[] = engineerUsers.map((eng) => {
    const projectIds = (projectsByEngineer.get(eng.id) ?? []).map((p) => p.id);
    return buildLane(
      eng.id,
      eng.name,
      false,
      projectIds,
      projectsByEngineer.get(eng.id) ?? []
    );
  });

  // Admin/viewer: an Unassigned lane for milestones on projects with no
  // engineer assigned, so orphaned commitments stay visible.
  if (seesAll) {
    const assignedSet = new Set(assignedProjectIds);
    const orphanProjects = [...milestonesByProject.keys()].filter(
      (pid) => !assignedSet.has(pid)
    );
    if (orphanProjects.length) {
      swimlanes.push(
        buildLane(UNASSIGNED, "Unassigned", true, orphanProjects, [])
      );
    }
  }

  return {
    swimlanes,
    canEditMilestones: isAdmin,
    canEditSubtasks: isAdmin || viewer.role === "engineer",
    engineers: engineerUsers,
  };
}

// --- Slippage report --------------------------------------------------------

export interface SlippageReport {
  byEngineer: SlippageRow[];
  byProject: SlippageRow[];
  subtasksByMonth: SlippageRow[];
  milestonesByMonth: SlippageRow[];
  scopeNote: string;
}

export async function loadSlippageReport(viewer: AuthUser): Promise<SlippageReport> {
  const seesAll = viewer.role === "admin" || viewer.role === "viewer";
  const today = todayUTC();

  // Scope: engineers see only their own subtasks + their assigned projects'
  // milestones; admin/viewer see everything.
  let assignedProjectIds: string[] | null = null;
  if (!seesAll) {
    const a = await prisma.projectAssignment.findMany({
      where: { userId: viewer.id },
      select: { projectId: true },
    });
    assignedProjectIds = a.map((x) => x.projectId);
  }

  const subtasks = await prisma.subtask.findMany({
    where: seesAll ? {} : { ownerId: viewer.id },
    include: { owner: { select: { id: true, name: true } } },
  });

  const milestones = await prisma.milestone.findMany({
    where:
      seesAll || !assignedProjectIds
        ? {}
        : { projectId: { in: assignedProjectIds } },
    include: { project: { select: { id: true, name: true } } },
  });

  // Subtask measured items keyed for engineer + month grouping.
  const subMeasured = subtasks.map((s) => ({
    ownerId: s.ownerId,
    ownerName: s.owner.name,
    daysLate: subtaskDaysLate(s),
    isCompleted: s.completedAt !== null,
    isOverdueOpen:
      subtaskCue({ dueDate: s.dueDate, completedAt: s.completedAt }, today) ===
      "overdue",
    month: s.completedAt ? monthKey(s.completedAt) : null,
  }));

  const byEngineer = groupRows(
    subMeasured,
    (i) => i.ownerId,
    (i) => i.ownerName
  );

  const subtasksByMonth = groupRows(
    subMeasured.filter((i) => i.month),
    (i) => i.month as string,
    (i) => i.month as string
  ).sort((a, b) => a.key.localeCompare(b.key));

  // Milestone measured items (vs baseline = the real slip) keyed for project +
  // month grouping.
  const msMeasured = milestones.map((m) => ({
    projectId: m.projectId,
    projectName: m.project.name,
    daysLate: milestoneVsBaseline(m),
    isCompleted: m.actualDate !== null,
    isOverdueOpen: milestoneCue(m, today) === "overdue",
    month: m.actualDate ? monthKey(m.actualDate) : null,
  }));

  const byProject = groupRows(
    msMeasured,
    (i) => i.projectId,
    (i) => i.projectName
  );

  const milestonesByMonth = groupRows(
    msMeasured.filter((i) => i.month),
    (i) => i.month as string,
    (i) => i.month as string
  ).sort((a, b) => a.key.localeCompare(b.key));

  return {
    byEngineer,
    byProject,
    subtasksByMonth,
    milestonesByMonth,
    scopeNote: seesAll
      ? "Portfolio-wide — all engineers and projects."
      : "Your subtasks and the milestones on your assigned projects.",
  };
}

interface Measurable {
  daysLate: number | null;
  isCompleted: boolean;
  isOverdueOpen: boolean;
}

function groupRows<T extends Measurable>(
  items: T[],
  keyOf: (i: T) => string,
  labelOf: (i: T) => string
): SlippageRow[] {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const i of items) {
    const k = keyOf(i);
    const g = groups.get(k) ?? { label: labelOf(i), items: [] };
    g.items.push(i);
    groups.set(k, g);
  }
  return [...groups.entries()]
    .map(([k, g]) => aggregate(k, g.label, g.items))
    .sort((a, b) => b.late - a.late || a.label.localeCompare(b.label));
}

// --- Project-page milestones ------------------------------------------------

/**
 * The board's BoardMilestone display shape, minus the per-engineer subtask
 * list. doneCount/totalCount here are aggregated across ALL engineers'
 * subtasks for the milestone (the project's total progress). The shape is
 * compatible with the board's EditMilestone component.
 */
export type ProjectMilestoneView = Omit<BoardMilestone, "subtasks">;

/** Milestones for a single project, for the project detail page. */
export async function loadProjectMilestones(
  projectId: string
): Promise<ProjectMilestoneView[]> {
  const today = todayUTC();
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
    include: { subtasks: { select: { completedAt: true } } },
  });

  const views: ProjectMilestoneView[] = milestones.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    notes: m.notes,
    baselineIso: m.baselineDate ? ymd(m.baselineDate) : null,
    targetIso: m.targetDate ? ymd(m.targetDate) : null,
    actualIso: m.actualDate ? ymd(m.actualDate) : null,
    driftDays: targetDriftDays(m),
    cue: milestoneCue(m, today),
    vsBaseline: milestoneVsBaseline(m),
    doneCount: m.subtasks.filter((s) => s.completedAt !== null).length,
    totalCount: m.subtasks.length,
  }));

  // Logical order for the record: open milestones by soonest target (undated
  // first so they get a date), then completed ones, most-recently-done last.
  const rank = (v: ProjectMilestoneView) => (v.actualIso ? 1 : 0);
  return views.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.actualIso && b.actualIso) return b.actualIso.localeCompare(a.actualIso);
    return (a.targetIso ?? "").localeCompare(b.targetIso ?? "");
  });
}

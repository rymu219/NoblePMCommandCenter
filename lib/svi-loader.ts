import { prisma } from "./prisma";
import { dayDelta, todayUTC } from "./slippage";
import {
  composeSVI,
  scoreDecisionSpeed,
  scoreEarlyWarning,
  scoreInfoFreshness,
  scoreRepeatProblems,
  type AdverseEvent,
  type Confidence,
  type DecisionInput,
  type InfoItem,
  type ProblemEvent,
  type ProjectSVI,
  type SviSnapshotPoint,
} from "./svi";

/*
 * Read-side for the Systemic Vitality Index.
 *
 * Maps existing Command Center rows into the pure-engine input shapes
 * (lib/svi.ts) — the "hybrid" stance: derive from what we already track, plus
 * the two cheap structured fields on ActionItem (impact, blocking). The private
 * MilestoneReplan reasons feed Repeat Problems and Early Warning here, but the
 * dashboard card never renders the reason-level breakdown (that stays on the
 * admin-only Execution page).
 */

/** How far back problem/adverse history is considered (chronicity needs depth). */
const PROBLEM_WINDOW_DAYS = 180;
/** Decisions window — open items always count, completed within this window. */
const DECISION_WINDOW_DAYS = 90;
/** How long a risk flag "covers" a later slip when judging early warning. */
const PREFLAG_LOOKBACK_DAYS = 45;

const CRITICAL_SECTIONS = new Set(["risks_preconditions", "decisions_log"]);
const isRiskLabel = (l: string) => l === "at_risk" || l === "blocked";

/** Monday (UTC midnight) of the week containing `d`. */
export function weekStartUTC(d: Date = todayUTC()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay(); // 0=Sun
  const back = (dow + 6) % 7; // days since Monday
  return new Date(x.getTime() - back * 86_400_000);
}

interface RawProject {
  actionItems: {
    id: string;
    createdAt: Date;
    dueDate: Date | null;
    completedAt: Date | null;
    impact: string;
    blocking: boolean;
  }[];
  reopenedActionIds: Set<string>;
  reworkAt: Date[];
  replans: { milestoneId: string; reason: string; deltaDays: number; at: Date }[];
  milestones: { id: string; targetDate: Date | null; actualDate: Date | null }[];
  statusUpdates: { reportDate: Date; statusLabel: string; createdAt: Date }[];
  sections: { kind: string; updatedAt: Date }[];
  projectUpdatedAt: Date;
}

/** Turn one project's raw rows into a scored ProjectSVI. */
function computeFromRaw(raw: RawProject, snapshots: SviSnapshotPoint[], now: Date): ProjectSVI {
  // --- Decision Speed -------------------------------------------------------
  const decisions: DecisionInput[] = raw.actionItems
    .filter((a) => !a.completedAt || dayDelta(now, a.createdAt) <= DECISION_WINDOW_DAYS)
    .map((a) => ({
      createdAt: a.createdAt,
      dueDate: a.dueDate,
      completedAt: a.completedAt,
      impact: (["low", "medium", "high"].includes(a.impact) ? a.impact : "medium") as DecisionInput["impact"],
      blocking: a.blocking,
      reopened: raw.reopenedActionIds.has(a.id),
    }));

  // --- Repeat Problems ------------------------------------------------------
  const inWindow = (d: Date) => dayDelta(now, d) <= PROBLEM_WINDOW_DAYS;
  const problems: ProblemEvent[] = [
    ...raw.replans
      .filter((r) => inWindow(r.at))
      .map((r) => ({
        at: r.at,
        category: r.reason,
        deltaDays: r.deltaDays,
        groupId: r.milestoneId,
        kind: "replan" as const,
      })),
    ...raw.reworkAt
      .filter(inWindow)
      .map((at) => ({ at, category: "rework", deltaDays: 0, groupId: null, kind: "rework" as const })),
  ];

  // --- Info Freshness -------------------------------------------------------
  const info: InfoItem[] = [];
  const latestStatus = raw.statusUpdates[raw.statusUpdates.length - 1];
  if (latestStatus) info.push({ updatedAt: latestStatus.createdAt, thresholdDays: 7, weight: 2 });
  for (const s of raw.sections) {
    info.push({
      updatedAt: s.updatedAt,
      thresholdDays: CRITICAL_SECTIONS.has(s.kind) ? 14 : 30,
      weight: CRITICAL_SECTIONS.has(s.kind) ? 2 : 1,
    });
  }
  info.push({ updatedAt: raw.projectUpdatedAt, thresholdDays: 14, weight: 1 });

  // --- Early Warning --------------------------------------------------------
  const riskUpdates = raw.statusUpdates.filter((s) => isRiskLabel(s.statusLabel));
  const preFlagged = (t: Date) =>
    riskUpdates.some((s) => {
      const lead = dayDelta(t, s.reportDate);
      return lead >= 0 && lead <= PREFLAG_LOOKBACK_DAYS;
    });
  const adverse: AdverseEvent[] = [
    ...raw.replans
      .filter((r) => r.deltaDays > 0 && inWindow(r.at))
      .map((r) => ({ at: r.at, severity: Math.max(1, r.deltaDays), preFlagged: preFlagged(r.at) })),
    ...raw.milestones
      .filter((m) => !m.actualDate && m.targetDate && dayDelta(now, m.targetDate) > 0)
      .map((m) => ({
        at: m.targetDate as Date,
        severity: Math.min(60, Math.max(1, dayDelta(now, m.targetDate as Date))),
        preFlagged: preFlagged(m.targetDate as Date),
      })),
  ];

  return composeSVI(
    {
      decisionSpeed: scoreDecisionSpeed(decisions, now),
      repeatProblems: scoreRepeatProblems(problems, now),
      infoFreshness: scoreInfoFreshness(info, now),
      earlyWarning: scoreEarlyWarning(adverse, now),
    },
    snapshots
  );
}

/** SVI for a single project, including its snapshot trend. */
export async function loadProjectSVI(projectId: string): Promise<ProjectSVI> {
  const now = todayUTC();
  const [actionItems, milestones, statusUpdates, sections, project, snaps] = await Promise.all([
    prisma.actionItem.findMany({ where: { projectId } }),
    prisma.milestone.findMany({ where: { projectId }, include: { replans: true } }),
    prisma.statusUpdate.findMany({ where: { projectId }, orderBy: { reportDate: "asc" } }),
    prisma.projectSection.findMany({ where: { projectId } }),
    prisma.projectRow.findUnique({ where: { id: projectId }, select: { lastUpdatedAt: true } }),
    prisma.sviSnapshot.findMany({ where: { projectId }, orderBy: { weekStart: "asc" } }),
  ]);

  const reopenIds = await prisma.auditLog.findMany({
    where: { entityType: "ActionItem", action: "reopen", entityId: { in: actionItems.map((a) => a.id) } },
    select: { entityId: true, at: true },
  });

  const raw: RawProject = {
    actionItems,
    reopenedActionIds: new Set(reopenIds.map((r) => r.entityId)),
    reworkAt: reopenIds.map((r) => r.at),
    replans: milestones.flatMap((m) =>
      m.replans.map((r) => ({ milestoneId: m.id, reason: r.reason, deltaDays: r.deltaDays, at: r.at }))
    ),
    milestones: milestones.map((m) => ({ id: m.id, targetDate: m.targetDate, actualDate: m.actualDate })),
    statusUpdates,
    sections: sections.map((s) => ({ kind: s.kind, updatedAt: s.updatedAt })),
    projectUpdatedAt: project?.lastUpdatedAt ?? now,
  };

  return computeFromRaw(raw, snaps, now);
}

export interface PortfolioSVIRow {
  projectId: string;
  projectName: string;
  programPrefix: string;
  svi: ProjectSVI;
}

/** SVI for every active project, worst composite first. */
export async function loadPortfolioSVI(): Promise<PortfolioSVIRow[]> {
  const projects = await prisma.projectRow.findMany({
    where: { status: { notIn: ["archived", "pipeline"] } },
    select: { id: true, name: true, programPrefix: true },
  });
  const rows = await Promise.all(
    projects.map(async (p) => ({
      projectId: p.id,
      projectName: p.name,
      programPrefix: p.programPrefix,
      svi: await loadProjectSVI(p.id),
    }))
  );
  return rows.sort((a, b) => a.svi.composite - b.svi.composite);
}

/** Capture/refresh this week's SVI snapshot for every active project. */
export async function captureSviSnapshots(): Promise<number> {
  const rows = await loadPortfolioSVI();
  const weekStart = weekStartUTC();
  for (const r of rows) {
    const data = {
      composite: r.svi.composite,
      decisionSpeed: r.svi.subs.decisionSpeed.score,
      repeatProblems: r.svi.subs.repeatProblems.score,
      infoFreshness: r.svi.subs.infoFreshness.score,
      earlyWarning: r.svi.subs.earlyWarning.score,
      confidence: r.svi.confidence as Confidence,
    };
    await prisma.sviSnapshot.upsert({
      where: { projectId_weekStart: { projectId: r.projectId, weekStart } },
      create: { projectId: r.projectId, weekStart, ...data },
      update: { ...data, capturedAt: new Date() },
    });
  }
  return rows.length;
}

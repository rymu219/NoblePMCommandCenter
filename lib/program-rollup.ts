import { prisma } from "./prisma";

/*
 * Aggregates everything needed to render an Executive Status Report
 * for a single program (3-digit prefix). Lives close to the route
 * that consumes it so the page stays declarative.
 */

export interface ProjectSummary {
  id: string;
  name: string;
  ownerName: string | null;
  status: string;
  health: string | null;
  budgetTotal: number | null;
  committedTotal: number | null;
  forecastTotal: number | null;
  latestStatusLabel: string | null;
  latestStatusQualifier: string | null;
  latestStatusDate: Date | null;
  latestStatusOneLiner: string | null;
  nextPhaseEnd: { name: string; date: Date } | null;
}

export interface MilestoneEntry {
  projectId: string;
  projectName: string;
  phaseName: string;
  date: Date;
}

export interface RiskEntry {
  projectId: string;
  projectName: string;
  text: string;
  owner?: string;
}

export interface DecisionEntry {
  projectId: string;
  projectName: string;
  date: string;
  decision: string;
  source: string;
  author: string;
}

export interface ActionItemEntry {
  projectId: string;
  projectName: string;
  ownerDept: string;
  body: string;
  dueDate: Date | null;
}

export interface ProgramRollup {
  prefix: string;
  programName: string | null;
  customer: string | null;
  execSummary: string | null;
  decisionsAsked: string | null;
  projects: ProjectSummary[];
  totals: {
    budget: number;
    committed: number;
    forecast: number;
    headroom: number;
    activeProjectCount: number;
    atRiskProjectCount: number;
  };
  upcomingMilestones: MilestoneEntry[];
  openRisks: RiskEntry[];
  recentDecisions: DecisionEntry[];
  openActionItems: ActionItemEntry[];
}

export async function loadProgramRollup(
  prefix: string
): Promise<ProgramRollup | null> {
  const program = await prisma.program.findUnique({ where: { prefix } });
  if (!program) return null;

  const projects = await prisma.projectRow.findMany({
    // Pipeline (not-yet-official) projects are excluded from program rollups.
    where: { programPrefix: prefix, status: { notIn: ["archived", "pipeline"] } },
    include: {
      owner: true,
      phases: true,
      risks: { where: { status: "open" }, orderBy: { position: "asc" } },
      decisions: { orderBy: { position: "asc" } },
      statusUpdates: {
        orderBy: { reportDate: "desc" },
        take: 1,
      },
      actionItems: { where: { completedAt: null } },
    },
    orderBy: { id: "asc" },
  });

  const projectSummaries: ProjectSummary[] = [];
  const milestones: MilestoneEntry[] = [];
  const risks: RiskEntry[] = [];
  const decisions: DecisionEntry[] = [];
  const actionItems: ActionItemEntry[] = [];
  const now = new Date();
  const horizon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60); // 60d

  for (const p of projects) {
    const latest = p.statusUpdates[0] ?? null;
    let oneLiner: string | null = null;
    if (latest?.narrative) {
      const firstLine = latest.narrative
        .split(/\r?\n/)
        .map((s) => s.trim().replace(/\*\*/g, ""))
        .filter(Boolean)[0];
      if (firstLine) oneLiner = firstLine.slice(0, 220);
    }

    // Earliest upcoming phase end serves as "next key date".
    const upcomingEnds = p.phases
      .filter((ph) => ph.endDate > now)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    const nextPhaseEnd = upcomingEnds[0]
      ? { name: upcomingEnds[0].name, date: upcomingEnds[0].endDate }
      : null;

    for (const ph of p.phases) {
      if (ph.endDate >= now && ph.endDate <= horizon) {
        milestones.push({
          projectId: p.id,
          projectName: p.name,
          phaseName: ph.name + " — complete",
          date: ph.endDate,
        });
      }
      if (ph.startDate >= now && ph.startDate <= horizon) {
        milestones.push({
          projectId: p.id,
          projectName: p.name,
          phaseName: ph.name + " — start",
          date: ph.startDate,
        });
      }
    }

    // Open risks + last-30-day decisions from the typed rows.
    for (const r of p.risks) {
      risks.push({
        projectId: p.id,
        projectName: p.name,
        text: r.body,
        owner: r.owner ?? undefined,
      });
    }
    const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    for (const d of p.decisions) {
      if (d.decidedOn && d.decidedOn < cutoff) continue;
      decisions.push({
        projectId: p.id,
        projectName: p.name,
        date: d.decidedOn ? d.decidedOn.toISOString().slice(0, 10) : "",
        decision: d.body,
        source: d.source,
        author: d.author ?? "",
      });
    }

    for (const ai of p.actionItems) {
      actionItems.push({
        projectId: p.id,
        projectName: p.name,
        ownerDept: ai.ownerDept,
        body: ai.body,
        dueDate: ai.dueDate,
      });
    }

    projectSummaries.push({
      id: p.id,
      name: p.name,
      ownerName: p.owner?.name ?? null,
      status: p.status,
      health: p.health,
      budgetTotal: p.budgetTotal,
      committedTotal: p.committedTotal,
      forecastTotal: p.forecastTotal,
      latestStatusLabel: latest?.statusLabel ?? null,
      latestStatusQualifier: latest?.statusQualifier ?? null,
      latestStatusDate: latest?.reportDate ?? null,
      latestStatusOneLiner: oneLiner,
      nextPhaseEnd,
    });
  }

  milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
  decisions.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const totals = projectSummaries.reduce(
    (acc, p) => {
      acc.budget += p.budgetTotal ?? 0;
      acc.committed += p.committedTotal ?? 0;
      acc.forecast += p.forecastTotal ?? 0;
      if (p.status === "active") acc.activeProjectCount += 1;
      if (p.health === "at_risk" || p.health === "off_track")
        acc.atRiskProjectCount += 1;
      return acc;
    },
    {
      budget: 0,
      committed: 0,
      forecast: 0,
      headroom: 0,
      activeProjectCount: 0,
      atRiskProjectCount: 0,
    }
  );
  totals.headroom = totals.budget - totals.forecast;

  return {
    prefix,
    programName: program.name ?? null,
    customer: program.customer ?? null,
    execSummary: program.execSummary ?? null,
    decisionsAsked: program.decisionsAsked ?? null,
    projects: projectSummaries,
    totals,
    upcomingMilestones: milestones.slice(0, 12),
    openRisks: risks.slice(0, 12),
    recentDecisions: decisions.slice(0, 8),
    openActionItems: actionItems.slice(0, 20),
  };
}

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
  dashboardHealth: string | null;
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

interface RiskItemRaw { text?: string; owner?: string; resolved?: boolean }
interface DecisionItemRaw { date?: string; decision?: string; source?: string; author?: string }

export async function loadProgramRollup(
  prefix: string
): Promise<ProgramRollup | null> {
  const program = await prisma.program.findUnique({ where: { prefix } });
  if (!program) return null;

  const projects = await prisma.projectRow.findMany({
    where: { programPrefix: prefix, status: { not: "archived" } },
    include: {
      owner: true,
      phases: true,
      sections: true,
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
    if (latest) {
      try {
        const blocks = JSON.parse(latest.blocks) as Array<{ heading: string; body: string }>;
        if (blocks.length > 0) {
          oneLiner = blocks[0].body.split("\n")[0].slice(0, 220);
        }
      } catch { /* ignore */ }
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

    // Pull risks and decisions from ProjectSection JSON.
    for (const s of p.sections) {
      try {
        const parsed = JSON.parse(s.data);
        if (s.kind === "risks_preconditions" && Array.isArray(parsed?.items)) {
          for (const r of parsed.items as RiskItemRaw[]) {
            if (!r?.resolved && typeof r?.text === "string" && r.text.trim()) {
              risks.push({
                projectId: p.id,
                projectName: p.name,
                text: r.text,
                owner: r.owner,
              });
            }
          }
        }
        if (s.kind === "decisions_log" && Array.isArray(parsed?.items)) {
          const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
          for (const d of parsed.items as DecisionItemRaw[]) {
            if (typeof d?.decision !== "string" || !d.decision.trim()) continue;
            const dt = d.date ? new Date(d.date) : null;
            if (!dt || dt >= cutoff) {
              decisions.push({
                projectId: p.id,
                projectName: p.name,
                date: d.date ?? "",
                decision: d.decision,
                source: d.source ?? "",
                author: d.author ?? "",
              });
            }
          }
        }
      } catch { /* ignore malformed */ }
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
      dashboardHealth: p.dashboardHealth,
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
      if (p.dashboardHealth === "at_risk" || p.dashboardHealth === "off_track")
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

import { prisma } from "./prisma";
import type { FollowupItem, ProgramGroup } from "./status-loader";
import { STATUS_LABELS } from "./status";

/*
 * Portfolio-level metrics that drive the dashboard strip on the home page.
 * Everything is derived from data already captured — latest status per
 * project (incl. the skeleton header), open action items, and the budget
 * fields on each project. No baselines, no EVM, no new upkeep.
 */

export interface PortfolioMetrics {
  /** Non-archived project count. */
  activeCount: number;
  atRiskCount: number;
  blockedCount: number;
  /** Status label → count, ordered by STATUS_LABELS; only labels in use. */
  statusMix: Array<{ value: string; display: string; pill: string; count: number }>;
  budget: {
    total: number;
    spent: number;
    forecast: number;
    headroom: number;
    /** True when at least one project carries a budget figure. */
    hasData: boolean;
  };
  openActions: number;
  overdueActions: number;
  /** One cell per project that has posted a status — for the heatmap. */
  scheduleHeatmap: Array<{
    projectId: string;
    name: string;
    prefix: string;
    scheduleConfidence: string | null;
  }>;
  /** Projects with a future-dated next milestone, soonest first. */
  upcomingMilestones: Array<{
    projectId: string;
    name: string;
    milestone: string;
    date: Date;
    daysOut: number;
  }>;
  /** At-risk / blocked projects, with the one-line top focus when present. */
  blockedNow: Array<{
    projectId: string;
    name: string;
    label: string;
    qualifier: string | null;
    topFocus: string | null;
  }>;
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export async function loadPortfolioMetrics(
  portfolio: ProgramGroup[],
  followups: Record<string, FollowupItem[]>
): Promise<PortfolioMetrics> {
  // Budget figures live on ProjectRow; pull non-archived in one query.
  const budgetRows = await prisma.projectRow.findMany({
    where: { status: { not: "archived" } },
    select: {
      budgetTotal: true,
      spentTotal: true,
      forecastTotal: true,
    },
  });

  let total = 0;
  let spent = 0;
  let forecast = 0;
  let hasData = false;
  for (const r of budgetRows) {
    if (r.budgetTotal != null) {
      total += r.budgetTotal;
      hasData = true;
    }
    if (r.spentTotal != null) spent += r.spentTotal;
    // Forecast falls back to spent when not separately forecast.
    forecast += r.forecastTotal ?? r.spentTotal ?? 0;
  }

  const allProjects = portfolio.flatMap((g) =>
    g.projects.map((p) => ({ prefix: g.prefix, ...p }))
  );
  const withStatus = allProjects.filter((p) => p.status);

  const counts = new Map<string, number>();
  for (const p of withStatus) {
    counts.set(p.status!.label, (counts.get(p.status!.label) ?? 0) + 1);
  }
  const statusMix = STATUS_LABELS.filter((s) => counts.get(s.value))
    .map((s) => ({
      value: s.value,
      display: s.display,
      pill: s.pill,
      count: counts.get(s.value)!,
    }));

  const today = todayUtc();
  const openItems = Object.values(followups).flat();
  const overdueActions = openItems.filter(
    (it) => it.dueDate && it.dueDate.getTime() < today.getTime()
  ).length;

  const scheduleHeatmap = withStatus.map((p) => ({
    projectId: p.projectId,
    name: p.projectName,
    prefix: p.prefix,
    scheduleConfidence: p.status!.scheduleConfidence,
  }));

  const upcomingMilestones = withStatus
    .filter((p) => p.status!.nextMilestone && p.status!.nextMilestoneDate)
    .map((p) => {
      const date = p.status!.nextMilestoneDate!;
      const daysOut = Math.round(
        (date.getTime() - today.getTime()) / 86_400_000
      );
      return {
        projectId: p.projectId,
        name: p.projectName,
        milestone: p.status!.nextMilestone!,
        date,
        daysOut,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const blockedNow = withStatus
    .filter((p) => ["at_risk", "blocked"].includes(p.status!.label))
    .map((p) => ({
      projectId: p.projectId,
      name: p.projectName,
      label: p.status!.label,
      qualifier: p.status!.qualifier,
      topFocus: p.status!.topFocus,
    }));

  return {
    activeCount: allProjects.length,
    atRiskCount: counts.get("at_risk") ?? 0,
    blockedCount: counts.get("blocked") ?? 0,
    statusMix,
    budget: {
      total,
      spent,
      forecast,
      headroom: total - forecast,
      hasData,
    },
    openActions: openItems.length,
    overdueActions,
    scheduleHeatmap,
    upcomingMilestones,
    blockedNow,
  };
}

import { prisma } from "./prisma";

/*
 * Loader for the v2 Portfolio page (executive view). Fully derived —
 * nothing on the portfolio is hand-entered, so it can never be stale.
 */

export interface PortfolioMilestone {
  id: string;
  title: string;
  targetIso: string;
  overdue: boolean;
}

export interface PortfolioProject {
  id: string;
  name: string;
  programPrefix: string;
  programName: string | null;
  ownerName: string | null;
  status: string;
  health: string;
  lastUpdatedIso: string;
  budgetTotal: number | null;
  spentTotal: number | null;
  forecastTotal: number | null;
  openRiskCount: number;
  openFollowUpCount: number;
  /** Open, dated milestones (target set, not complete), soonest first. */
  openMilestones: PortfolioMilestone[];
  nextMilestone: PortfolioMilestone | null;
}

export interface Portfolio {
  todayIso: string;
  projects: PortfolioProject[];
}

export async function loadPortfolio(): Promise<Portfolio> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const rows = await prisma.projectRow.findMany({
    where: {
      status: { in: ["not_started", "active", "on_hold"] },
      // 999- is the non-project time bucket — noise on an executive view.
      NOT: { programPrefix: "999" },
    },
    include: {
      program: { select: { name: true } },
      owner: { select: { name: true } },
      milestones: {
        where: { actualDate: null, targetDate: { not: null } },
        orderBy: { targetDate: "asc" },
        select: { id: true, title: true, targetDate: true },
      },
      _count: {
        select: {
          risks: { where: { status: "open" } },
          actionItems: { where: { completedAt: null } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const projects: PortfolioProject[] = rows.map((r) => {
    const openMilestones: PortfolioMilestone[] = r.milestones.map((m) => {
      const targetIso = m.targetDate!.toISOString().slice(0, 10);
      return { id: m.id, title: m.title, targetIso, overdue: targetIso < todayIso };
    });
    return {
      id: r.id,
      name: r.name,
      programPrefix: r.programPrefix,
      programName: r.program.name,
      ownerName: r.owner?.name ?? null,
      status: r.status,
      health: r.health ?? "on_track",
      lastUpdatedIso: r.lastUpdatedAt.toISOString().slice(0, 10),
      budgetTotal: r.budgetTotal,
      spentTotal: r.spentTotal,
      forecastTotal: r.forecastTotal,
      openRiskCount: r._count.risks,
      openFollowUpCount: r._count.actionItems,
      openMilestones,
      nextMilestone: openMilestones[0] ?? null,
    };
  });

  return { todayIso, projects };
}

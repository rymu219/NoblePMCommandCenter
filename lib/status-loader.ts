import { prisma } from "./prisma";
import { parseBlocks, type StatusBlock } from "./status";

export interface LatestStatus {
  id: string;
  reportDate: Date;
  label: string;
  qualifier: string | null;
  scheduleConfidence: string | null;
  budgetConfidence: string | null;
  nextMilestone: string | null;
  nextMilestoneDate: Date | null;
  topFocus: string | null;
  blocks: StatusBlock[];
  authorName: string | null;
  createdAt: Date;
}

export async function loadLatestStatus(projectId: string): Promise<LatestStatus | null> {
  const row = await prisma.statusUpdate.findFirst({
    where: { projectId },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
  });
  if (!row) return null;
  let authorName: string | null = null;
  if (row.authorId) {
    const u = await prisma.user.findUnique({ where: { id: row.authorId } });
    authorName = u?.name ?? null;
  }
  return {
    id: row.id,
    reportDate: row.reportDate,
    label: row.statusLabel,
    qualifier: row.statusQualifier,
    scheduleConfidence: row.scheduleConfidence,
    budgetConfidence: row.budgetConfidence,
    nextMilestone: row.nextMilestone,
    nextMilestoneDate: row.nextMilestoneDate,
    topFocus: row.topFocus,
    blocks: parseBlocks(row.blocks),
    authorName,
    createdAt: row.createdAt,
  };
}

export interface ProgramGroup {
  prefix: string;
  programName: string | null;
  projects: Array<{
    projectId: string;
    projectName: string;
    status: LatestStatus | null;
  }>;
}

/**
 * Loads every active project, groups by program prefix, attaches the
 * latest StatusUpdate to each. Used by the Daily Tooling Report
 * dashboard.
 */
export async function loadPortfolio(): Promise<ProgramGroup[]> {
  const projects = await prisma.projectRow.findMany({
    where: { status: { not: "archived" } },
    include: { program: true, statusUpdates: { orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }], take: 1 } },
    orderBy: { id: "asc" },
  });
  const byPrefix = new Map<string, ProgramGroup>();
  for (const p of projects) {
    const g = byPrefix.get(p.programPrefix) ?? {
      prefix: p.programPrefix,
      programName: p.program?.name ?? null,
      projects: [],
    };
    const latest = p.statusUpdates[0] ?? null;
    g.projects.push({
      projectId: p.id,
      projectName: p.name,
      status: latest
        ? {
            id: latest.id,
            reportDate: latest.reportDate,
            label: latest.statusLabel,
            qualifier: latest.statusQualifier,
            scheduleConfidence: latest.scheduleConfidence,
            budgetConfidence: latest.budgetConfidence,
            nextMilestone: latest.nextMilestone,
            nextMilestoneDate: latest.nextMilestoneDate,
            topFocus: latest.topFocus,
            blocks: parseBlocks(latest.blocks),
            authorName: null,
            createdAt: latest.createdAt,
          }
        : null,
    });
    byPrefix.set(p.programPrefix, g);
  }
  return Array.from(byPrefix.values()).sort((a, b) =>
    a.prefix.localeCompare(b.prefix)
  );
}

export interface FollowupItem {
  id: string;
  projectId: string;
  projectName: string;
  body: string;
  dueDate: Date | null;
  completedAt: Date | null;
  ownerName: string | null;
}

export async function loadOpenFollowups(): Promise<Record<string, FollowupItem[]>> {
  const items = await prisma.actionItem.findMany({
    where: { completedAt: null },
    include: { project: true },
    orderBy: [{ ownerDept: "asc" }, { createdAt: "asc" }],
  });
  // Owners are looked up in batch.
  const ownerIds = Array.from(
    new Set(items.map((i) => i.ownerUserId).filter((x): x is string => !!x))
  );
  const owners = ownerIds.length
    ? await prisma.user.findMany({ where: { id: { in: ownerIds } } })
    : [];
  const ownerName = new Map(owners.map((u) => [u.id, u.name]));

  const out: Record<string, FollowupItem[]> = {};
  for (const it of items) {
    (out[it.ownerDept] ??= []).push({
      id: it.id,
      projectId: it.projectId,
      projectName: it.project.name,
      body: it.body,
      dueDate: it.dueDate,
      completedAt: it.completedAt,
      ownerName: it.ownerUserId ? ownerName.get(it.ownerUserId) ?? null : null,
    });
  }
  return out;
}

export async function loadPortfolioNotes(reportDate: Date) {
  const rows = await prisma.portfolioNote.findMany({
    where: { reportDate },
  });
  const byKind: Record<string, string> = {};
  for (const r of rows) byKind[r.kind] = r.body;
  return byKind;
}

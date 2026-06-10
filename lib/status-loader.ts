import { prisma } from "./prisma";

export interface LatestStatus {
  id: string;
  reportDate: Date;
  label: string;
  qualifier: string | null;
  narrative: string | null;
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
    narrative: row.narrative,
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
    // `pipeline` (prospective, not-yet-official work) is excluded alongside
    // archived so it never appears in the Daily Tooling Report portfolio.
    where: { status: { notIn: ["archived", "pipeline"] } },
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
            narrative: latest.narrative,
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

export interface AttentionItem {
  label: string;
  href: string;
  meta?: string;
}

export interface AttentionGroups {
  overdue: AttentionItem[];
  dueSoon: AttentionItem[];
  stale: AttentionItem[];
  milestones: AttentionItem[];
  periodClose: AttentionItem[];
  total: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the "what needs attention" buckets for the home strip:
 * overdue / due-soon action items, stale active projects, upcoming
 * milestones, and (admins) an open period-close cutoff.
 */
export async function loadAttentionItems(opts: {
  isAdmin: boolean;
  today: Date;
}): Promise<AttentionGroups> {
  const { today, isAdmin } = opts;
  const soon = addDays(today, 3);
  const horizon = addDays(today, 14);
  const staleCutoff = addDays(today, -7);

  const [dueItems, activeProjects, phases] = await Promise.all([
    prisma.actionItem.findMany({
      where: { completedAt: null, dueDate: { not: null } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.projectRow.findMany({
      where: { status: { in: ["active", "on_hold", "not_started"] } },
      select: { id: true, name: true, lastUpdatedAt: true, targetEndDate: true },
      orderBy: { lastUpdatedAt: "asc" },
    }),
    prisma.phase.findMany({
      where: { endDate: { gte: today, lte: horizon } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { endDate: "asc" },
    }),
  ]);

  const overdue: AttentionItem[] = [];
  const dueSoon: AttentionItem[] = [];
  for (const it of dueItems) {
    const due = it.dueDate!;
    const item: AttentionItem = {
      label: `${it.project.name}: ${it.body}`,
      href: `/projects/${it.projectId}`,
      meta: `due ${isoDay(due)}`,
    };
    if (due < today) overdue.push(item);
    else if (due <= soon) dueSoon.push(item);
  }

  const stale: AttentionItem[] = activeProjects
    .filter((p) => p.lastUpdatedAt < staleCutoff)
    .map((p) => {
      const days = Math.floor(
        (today.getTime() - p.lastUpdatedAt.getTime()) / 86400000
      );
      return {
        label: p.name,
        href: `/projects/${p.id}`,
        meta: `${days}d since update`,
      };
    });

  const milestones: AttentionItem[] = [
    ...phases.map((ph) => ({
      label: `${ph.project.name}: ${ph.name}`,
      href: `/projects/${ph.projectId}`,
      meta: `ends ${isoDay(ph.endDate)}`,
    })),
    ...activeProjects
      .filter(
        (p) => p.targetEndDate && p.targetEndDate >= today && p.targetEndDate <= horizon
      )
      .map((p) => ({
        label: `${p.name}: target end`,
        href: `/projects/${p.id}`,
        meta: `due ${isoDay(p.targetEndDate!)}`,
      })),
  ];

  const periodClose: AttentionItem[] = [];
  if (isAdmin) {
    const prior = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
    );
    const closed = await prisma.periodClose.findUnique({
      where: {
        year_month: {
          year: prior.getUTCFullYear(),
          month: prior.getUTCMonth() + 1,
        },
      },
    });
    if (!closed) {
      periodClose.push({
        label: `${MONTHS[prior.getUTCMonth()]} ${prior.getUTCFullYear()} not closed`,
        href: "/admin/period-close",
        meta: "time entries still open",
      });
    }
  }

  const total =
    overdue.length +
    dueSoon.length +
    stale.length +
    milestones.length +
    periodClose.length;

  return { overdue, dueSoon, stale, milestones, periodClose, total };
}

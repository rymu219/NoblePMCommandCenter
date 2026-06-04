import { prisma } from "./prisma";
import { ISSUE_STATUSES } from "./issues";

/*
 * Read-side for the Issue Tracker. loadIssueTracker assembles the full Part →
 * Issue → Challenges/Actions tree for the dedicated page + print report;
 * loadIssueSummary is a lightweight count for the project-page link.
 */

export interface IssueActionView {
  id: string;
  body: string;
  owner: string | null;
  done: boolean;
}
export interface IssueChallengeView {
  id: string;
  title: string;
  body: string;
}
export interface IssueView {
  id: string;
  partId: string | null;
  charLabel: string | null;
  title: string;
  synopsis: string | null;
  status: string;
  owner: string | null;
  challenges: IssueChallengeView[];
  actions: IssueActionView[];
}
export interface PartView {
  id: string;
  name: string;
  drawingNumber: string | null;
  revision: string | null;
  cavities: number | null;
  issues: IssueView[];
}
export interface IssueSummary {
  total: number;
  open: number;
  byStatus: Record<string, number>;
}
export interface IssueTracker {
  parts: PartView[];
  crossCutting: IssueView[];
  summary: IssueSummary;
  empty: boolean;
}

type RawIssue = {
  id: string;
  partId: string | null;
  charLabel: string | null;
  title: string;
  synopsis: string | null;
  status: string;
  owner: string | null;
  challenges: { id: string; title: string; body: string }[];
  actions: { id: string; body: string; owner: string | null; done: boolean }[];
};

const issueInclude = {
  challenges: { orderBy: { position: "asc" } },
  actions: { orderBy: { position: "asc" } },
} as const;

function toIssueView(i: RawIssue): IssueView {
  return {
    id: i.id,
    partId: i.partId,
    charLabel: i.charLabel,
    title: i.title,
    synopsis: i.synopsis,
    status: i.status,
    owner: i.owner,
    challenges: i.challenges.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    actions: i.actions.map((a) => ({ id: a.id, body: a.body, owner: a.owner, done: a.done })),
  };
}

export async function loadIssueTracker(projectId: string): Promise<IssueTracker> {
  const [parts, cross] = await Promise.all([
    prisma.part.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: { issues: { orderBy: { position: "asc" }, include: issueInclude } },
    }),
    prisma.issue.findMany({
      where: { projectId, partId: null },
      orderBy: { position: "asc" },
      include: issueInclude,
    }),
  ]);

  const partViews: PartView[] = parts.map((p) => ({
    id: p.id,
    name: p.name,
    drawingNumber: p.drawingNumber,
    revision: p.revision,
    cavities: p.cavities,
    issues: p.issues.map(toIssueView),
  }));
  const crossCutting = cross.map(toIssueView);

  const byStatus: Record<string, number> = Object.fromEntries(
    ISSUE_STATUSES.map((s) => [s.value, 0])
  );
  let total = 0;
  for (const i of [...partViews.flatMap((p) => p.issues), ...crossCutting]) {
    byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
    total += 1;
  }

  return {
    parts: partViews,
    crossCutting,
    summary: { total, open: byStatus.open ?? 0, byStatus },
    empty: total === 0 && partViews.length === 0,
  };
}

/** Lightweight counts for the project-page summary/link. */
export async function loadIssueSummary(projectId: string): Promise<IssueSummary> {
  const grouped = await prisma.issue.groupBy({
    by: ["status"],
    where: { projectId },
    _count: { _all: true },
  });
  const byStatus: Record<string, number> = Object.fromEntries(
    ISSUE_STATUSES.map((s) => [s.value, 0])
  );
  let total = 0;
  for (const g of grouped) {
    byStatus[g.status] = g._count._all;
    total += g._count._all;
  }
  return { total, open: byStatus.open ?? 0, byStatus };
}

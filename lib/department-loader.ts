import { prisma } from "./prisma";
import { startOfWeek, addDaysUTC } from "./time-tracking";

/*
 * Loader for the v2 Department page (department-head view). Everything is
 * derived from time entries, action items and project rows — read-only.
 */

export interface DeptMember {
  id: string;
  name: string;
  title: string | null;
  hoursThisWeek: number;
  hoursLast4Weeks: number;
}

export interface DeptFollowUp {
  id: string;
  projectId: string;
  projectName: string;
  body: string;
  dueIso: string | null;
  overdue: boolean;
  ageDays: number;
}

export interface DeptProject {
  id: string;
  name: string;
  health: string;
  status: string;
  ownerName: string | null;
  lastUpdatedIso: string;
  /** Hours this department logged on the project in the last 30 days. */
  teamHours30d: number;
}

export interface DepartmentView {
  members: DeptMember[];
  followUps: DeptFollowUp[];
  projects: DeptProject[];
}

export async function loadDepartment(dept: string): Promise<DepartmentView> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const weekStart = startOfWeek(today);
  const fourWeeksAgo = addDaysUTC(weekStart, -21);
  const thirtyDaysAgo = addDaysUTC(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
    -30
  );

  const users = await prisma.user.findMany({
    where: { department: dept, active: true },
    select: { id: true, name: true, title: true },
    orderBy: { name: "asc" },
  });
  const userIds = users.map((u) => u.id);

  const [weekHours, monthHours, recentByProject, followUpRows, ownedProjects] =
    await Promise.all([
      prisma.timeEntry.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, entryDate: { gte: weekStart } },
        _sum: { hours: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, entryDate: { gte: fourWeeksAgo } },
        _sum: { hours: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["projectId"],
        where: { userId: { in: userIds }, entryDate: { gte: thirtyDaysAgo } },
        _sum: { hours: true },
      }),
      prisma.actionItem.findMany({
        where: { ownerDept: dept, completedAt: null },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      }),
      prisma.projectRow.findMany({
        where: {
          ownerId: { in: userIds },
          status: { in: ["not_started", "active", "on_hold"] },
        },
        select: { id: true },
      }),
    ]);

  const weekByUser = new Map(weekHours.map((g) => [g.userId, g._sum.hours ?? 0]));
  const monthByUser = new Map(monthHours.map((g) => [g.userId, g._sum.hours ?? 0]));
  const hoursByProject = new Map(
    recentByProject.map((g) => [g.projectId, g._sum.hours ?? 0])
  );

  // Projects the team touches: logged time in the last 30 days, or owned by
  // a member. The 999- bucket is non-project time — skip it.
  const projectIds = new Set<string>([
    ...recentByProject.map((g) => g.projectId),
    ...ownedProjects.map((p) => p.id),
  ]);
  projectIds.forEach((id) => {
    if (id.startsWith("999")) projectIds.delete(id);
  });

  const projectRows = await prisma.projectRow.findMany({
    where: { id: { in: [...projectIds] } },
    include: { owner: { select: { name: true } } },
    orderBy: { id: "asc" },
  });

  return {
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      title: u.title,
      hoursThisWeek: weekByUser.get(u.id) ?? 0,
      hoursLast4Weeks: monthByUser.get(u.id) ?? 0,
    })),
    followUps: followUpRows.map((a) => {
      const dueIso = a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null;
      return {
        id: a.id,
        projectId: a.project.id,
        projectName: a.project.name,
        body: a.body,
        dueIso,
        overdue: dueIso != null && dueIso < todayIso,
        ageDays: Math.floor((today.getTime() - a.createdAt.getTime()) / 86400000),
      };
    }),
    projects: projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      health: p.health ?? "on_track",
      status: p.status,
      ownerName: p.owner?.name ?? null,
      lastUpdatedIso: p.lastUpdatedAt.toISOString().slice(0, 10),
      teamHours30d: hoursByProject.get(p.id) ?? 0,
    })),
  };
}

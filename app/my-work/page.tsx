import Link from "next/link";
import { SectionShell } from "@/components/section-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  loadWeekGrid,
  parseYmd,
  startOfWeek,
  addDaysUTC,
  ymd,
} from "@/lib/time-tracking";
import { WeekGrid } from "./week-grid";
import { MyTasks, type MyTaskGroup } from "./my-tasks";

/*
 * v2 My Work — the engineer's single page: open subtasks (checkbox to
 * complete) + the weekly time grid, merged. Replaces bouncing between
 * /board and /my-week.
 */

function dayHeader(d: Date): string {
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${day} ${md}`;
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "viewer") {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-12">
        <h1 className="font-serif text-2xl font-medium text-noble-black">My Work</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Time tracking and task lists are for engineering roles. Try the{" "}
          <Link href="/department" className="underline">
            Department view
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  const { week } = await searchParams;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const weekStart = startOfWeek(week ? parseYmd(week) : today);

  const [grid, openSubtasks] = await Promise.all([
    loadWeekGrid(user.id, weekStart),
    prisma.subtask.findMany({
      where: { ownerId: user.id, completedAt: null },
      include: {
        milestone: {
          select: {
            title: true,
            targetDate: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { position: "asc" }],
    }),
  ]);

  const groups = new Map<string, MyTaskGroup>();
  for (const s of openSubtasks) {
    const p = s.milestone.project;
    const g =
      groups.get(p.id) ?? groups.set(p.id, { projectId: p.id, projectName: p.name, tasks: [] }).get(p.id)!;
    const dueIso = s.dueDate ? s.dueDate.toISOString().slice(0, 10) : null;
    g.tasks.push({
      id: s.id,
      title: s.title,
      dueIso,
      overdue: dueIso != null && dueIso < todayIso,
      milestoneTitle: s.milestone.title,
      milestoneTargetIso: s.milestone.targetDate
        ? s.milestone.targetDate.toISOString().slice(0, 10)
        : null,
    });
  }

  const dayDates = [0, 1, 2, 3, 4].map((i) => addDaysUTC(weekStart, i));
  const prevWeek = ymd(addDaysUTC(weekStart, -7));
  const nextWeek = ymd(addDaysUTC(weekStart, 7));
  const dayTotals = [0, 1, 2, 3, 4].map((i) =>
    grid.rows.reduce((s, r) => s + r.hours[i], 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  const openCount = openSubtasks.length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-medium text-noble-black">My Work</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user.name} · your open tasks and this week&rsquo;s hours, one page.
        </p>
      </div>

      <SectionShell
        title={`My tasks (${openCount})`}
        actions={
          <Link
            href="/board"
            className="rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-noble-black/70 hover:bg-noble-stone/40"
          >
            Full board →
          </Link>
        }
      >
        <MyTasks groups={[...groups.values()]} />
      </SectionShell>

      <SectionShell
        title="My hours"
        actions={
          <span className="flex items-center gap-2 text-sm">
            <Link
              href={`/my-work?week=${prevWeek}`}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
            >
              ← Prev
            </Link>
            <span className="font-mono text-xs text-[var(--muted)]">
              Week of {grid.weekStartIso}
            </span>
            <Link
              href={`/my-work?week=${nextWeek}`}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
            >
              Next →
            </Link>
          </span>
        }
      >
        {grid.closed ? (
          <div className="mb-3 rounded-md bg-noble-red/10 px-3 py-2 text-xs text-noble-red">
            This month is closed. Time entries are locked. Ask Admin to reopen if
            changes are required.
          </div>
        ) : null}
        <WeekGrid
          rows={grid.rows}
          dayHeaders={dayDates.map(dayHeader)}
          dayDateIsos={grid.days}
          weekStartIso={grid.weekStartIso}
          noteByProject={grid.noteByProject}
          dayTotals={dayTotals}
          grandTotal={grandTotal}
          disabled={grid.closed}
        />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Auto-saves on blur. Use <span className="font-mono">999-999</span> for
          non-project work and explain it in the Notes column. If a project is
          missing, ask Admin to assign it to you.
        </p>
      </SectionShell>
    </div>
  );
}

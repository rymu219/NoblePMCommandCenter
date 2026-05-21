import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadWeekGrid, parseYmd, startOfWeek, addDaysUTC, ymd } from "@/lib/time-tracking";
import { WeekGrid } from "./week-grid";

function dayHeader(d: Date): string {
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${day} ${md}`;
}

export default async function MyWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "viewer") {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-12">
        <h1 className="font-serif text-2xl font-medium text-noble-black">
          My Week
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Time tracking is restricted to Engineering. Your role is read-only.
        </p>
      </div>
    );
  }

  const { week } = await searchParams;
  const today = new Date();
  const weekStart = startOfWeek(week ? parseYmd(week) : today);
  const grid = await loadWeekGrid(user.id, weekStart);
  const dayDates = [0, 1, 2, 3, 4].map((i) => addDaysUTC(weekStart, i));

  const prevWeek = ymd(addDaysUTC(weekStart, -7));
  const nextWeek = ymd(addDaysUTC(weekStart, 7));

  const dayTotals = [0, 1, 2, 3, 4].map((i) =>
    grid.rows.reduce((s, r) => s + r.hours[i], 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            My Week
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {user.name} · Daily hours per project. Auto-saves on blur. Tab
            through cells; weekly totals roll up automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/my-week?week=${prevWeek}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
          >
            ← Prev
          </Link>
          <span className="font-mono text-xs text-[var(--muted)]">
            Week of {grid.weekStartIso}
          </span>
          <Link
            href={`/my-week?week=${nextWeek}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
          >
            Next →
          </Link>
        </div>
      </div>

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

      <p className="mt-4 text-xs text-[var(--muted)]">
        Tip: if a project you worked on isn&rsquo;t listed, ask Admin to assign
        it to you. Use <span className="font-mono">999-999</span> for
        non-project work and explain it in the Notes column.
      </p>
    </div>
  );
}

import Link from "next/link";
import type { PortfolioMetrics } from "@/lib/dashboard-metrics";
import { scheduleMeta } from "@/lib/status";

/*
 * The dashboard strip that leads the home page above the narrative report:
 * KPI tiles, a status-mix bar, a schedule-confidence heatmap, an upcoming-
 * milestones timeline, and a "what's blocked right now" strip. All values
 * are derived (see lib/dashboard-metrics) — light Noble brand throughout.
 */
export function PortfolioDashboard({ m }: { m: PortfolioMetrics }) {
  return (
    <section className="mb-8 space-y-4 no-print">
      <KpiTiles m={m} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Schedule confidence">
          <ScheduleHeatmap cells={m.scheduleHeatmap} />
        </Panel>
        <Panel title="Status mix">
          <StatusMix mix={m.statusMix} total={m.activeCount} />
          <UpcomingMilestones items={m.upcomingMilestones} />
        </Panel>
      </div>
      <Panel title="What's blocked right now">
        <BlockedStrip items={m.blockedNow} />
      </Panel>
    </section>
  );
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function KpiTiles({ m }: { m: PortfolioMetrics }) {
  const headroomTone =
    m.budget.headroom < 0 ? "text-noble-red" : "text-[#0F6E56]";
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Tile label="Active projects" value={String(m.activeCount)} />
      <Tile
        label="At risk"
        value={String(m.atRiskCount)}
        tone={m.atRiskCount > 0 ? "text-[#BA7517]" : undefined}
      />
      <Tile
        label="Blocked"
        value={String(m.blockedCount)}
        tone={m.blockedCount > 0 ? "text-noble-red" : undefined}
      />
      <Tile
        label="Budget headroom"
        value={m.budget.hasData ? fmtUsd(m.budget.headroom) : "—"}
        tone={m.budget.hasData ? headroomTone : undefined}
        sub={
          m.budget.hasData
            ? `${fmtUsd(m.budget.forecast)} of ${fmtUsd(m.budget.total)}`
            : "no budgets set"
        }
      />
      <Tile
        label="Overdue actions"
        value={String(m.overdueActions)}
        tone={m.overdueActions > 0 ? "text-noble-red" : undefined}
        sub={`${m.openActions} open`}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-3">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
        {label}
      </div>
      <div className={`mt-1 font-serif text-2xl font-medium ${tone ?? "text-noble-black"}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div> : null}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-noble-black/60">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ScheduleHeatmap({
  cells,
}: {
  cells: PortfolioMetrics["scheduleHeatmap"];
}) {
  if (cells.length === 0) {
    return <Empty text="No status posted yet." />;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {cells.map((c) => {
        const meta = scheduleMeta(c.scheduleConfidence);
        const cls = meta
          ? meta.pill
          : "bg-noble-fog text-noble-black/55";
        return (
          <Link
            key={c.projectId}
            href={`/projects/${c.projectId}`}
            title={`${c.name} — ${meta?.display ?? "not set"}`}
            className={`rounded px-2 py-1 text-[10px] font-medium ${cls} hover:opacity-85`}
          >
            {c.projectId}
          </Link>
        );
      })}
    </div>
  );
}

function StatusMix({
  mix,
  total,
}: {
  mix: PortfolioMetrics["statusMix"];
  total: number;
}) {
  const sum = mix.reduce((s, x) => s + x.count, 0);
  if (sum === 0) return <Empty text="No status posted yet." />;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {mix.map((s) => (
          <div
            key={s.value}
            className={s.pill}
            style={{ width: `${(s.count / sum) * 100}%` }}
            title={`${s.display}: ${s.count}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-noble-black/70">
        {mix.map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${s.pill}`} />
            {s.display} {s.count}
          </span>
        ))}
        {sum < total ? (
          <span className="text-[var(--muted)]">· {total - sum} no status</span>
        ) : null}
      </div>
    </div>
  );
}

function UpcomingMilestones({
  items,
}: {
  items: PortfolioMetrics["upcomingMilestones"];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3">
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-noble-black/60">
        Upcoming milestones
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.slice(0, 6).map((it) => {
          const overdue = it.daysOut < 0;
          return (
            <li key={it.projectId} className="flex items-baseline gap-2">
              <span
                className={`w-16 shrink-0 text-right text-[11px] font-medium tabular-nums ${
                  overdue
                    ? "text-noble-red"
                    : it.daysOut <= 7
                      ? "text-[#BA7517]"
                      : "text-[var(--muted)]"
                }`}
              >
                {overdue ? `${-it.daysOut}d late` : `${it.daysOut}d`}
              </span>
              <span className="text-noble-black/85">
                <Link
                  href={`/projects/${it.projectId}`}
                  className="text-noble-navy hover:underline"
                >
                  {it.name}
                </Link>
                <span className="text-[var(--muted)]"> — {it.milestone}</span>
                <span className="ml-1 text-[11px] text-[var(--muted)]">
                  ({it.date.toISOString().slice(0, 10)})
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BlockedStrip({
  items,
}: {
  items: PortfolioMetrics["blockedNow"];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm italic text-[var(--muted)]">
        Nothing at risk or blocked right now.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Link
          key={it.projectId}
          href={`/projects/${it.projectId}`}
          className={`rounded-md border-l-4 bg-[var(--surface)]/60 px-3 py-2 hover:bg-noble-stone/40 ${
            it.label === "blocked" ? "border-noble-red" : "border-[#BA7517]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-noble-black">
              {it.name}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                it.label === "blocked" ? "text-noble-red" : "text-[#BA7517]"
              }`}
            >
              {it.label === "blocked" ? "Blocked" : "At risk"}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-noble-black/75">
            {it.topFocus || it.qualifier || "—"}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic text-[var(--muted)]">{text}</p>;
}

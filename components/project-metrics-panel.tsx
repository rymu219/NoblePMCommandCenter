import type { ProjectMetrics } from "@/lib/project-metrics";
import { scheduleMeta, statusMeta } from "@/lib/status";

/*
 * "At a glance" dashboard for a single project: KPI tiles, an hours-burn
 * sparkline, a budget bar, a status-over-time strip, and action-item aging.
 * All derived (see lib/project-metrics) — light Noble brand throughout.
 */
export function ProjectMetricsPanel({ m }: { m: ProjectMetrics }) {
  const sched = scheduleMeta(m.schedule.confidence);
  const burnPct =
    m.hours.estimated && m.hours.estimated > 0
      ? Math.round((m.hours.logged / m.hours.estimated) * 100)
      : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Budget"
          value={m.budget.hasData ? fmtUsd(forecastOrSpent(m.budget)) : "—"}
          sub={
            m.budget.hasData
              ? `of ${m.budget.total != null ? fmtUsd(m.budget.total) : "—"}`
              : "no budget set"
          }
        />
        <Tile
          label="Hours logged"
          value={String(m.hours.logged)}
          sub={
            m.hours.estimated != null
              ? `of ${m.hours.estimated} est${burnPct != null ? ` · ${burnPct}%` : ""}`
              : "no estimate"
          }
          tone={burnPct != null && burnPct > 100 ? "text-noble-red" : undefined}
        />
        <Tile
          label="Schedule"
          value={sched?.display ?? "—"}
          tone={
            m.schedule.confidence === "late"
              ? "text-noble-red"
              : m.schedule.confidence === "slipping"
                ? "text-[#BA7517]"
                : m.schedule.confidence === "ahead"
                  ? "text-[#0F6E56]"
                  : undefined
          }
        />
        <Tile
          label="Next milestone"
          value={
            m.schedule.daysToMilestone != null
              ? m.schedule.daysToMilestone < 0
                ? `${-m.schedule.daysToMilestone}d late`
                : `${m.schedule.daysToMilestone}d`
              : "—"
          }
          sub={m.schedule.nextMilestone ?? "not set"}
          tone={
            m.schedule.daysToMilestone != null && m.schedule.daysToMilestone < 0
              ? "text-noble-red"
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Hours burn">
          <BurnCurve
            curve={m.hours.burnCurve}
            estimated={m.hours.estimated}
          />
        </Panel>
        <Panel title="Budget">
          <BudgetBar budget={m.budget} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Status over time">
          <StatusStrip history={m.statusHistory} />
        </Panel>
        <Panel title="Action items">
          <ActionAging actions={m.actions} />
        </Panel>
      </div>
    </div>
  );
}

function forecastOrSpent(b: ProjectMetrics["budget"]): number {
  return b.forecast ?? b.spent ?? 0;
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-3">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
        {label}
      </div>
      <div className={`mt-1 font-serif text-xl font-medium ${tone ?? "text-noble-black"}`}>
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

function BurnCurve({
  curve,
  estimated,
}: {
  curve: ProjectMetrics["hours"]["burnCurve"];
  estimated: number | null;
}) {
  if (curve.length === 0) {
    return <Empty text="No time logged yet." />;
  }
  const W = 320;
  const H = 80;
  const pad = 4;
  const maxY = Math.max(
    curve[curve.length - 1].cum,
    estimated ?? 0
  ) || 1;
  const n = curve.length;
  const x = (i: number) =>
    n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - (v / maxY) * (H - 2 * pad);
  const line = curve.map((p, i) => `${x(i)},${y(p.cum)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${x(n - 1)},${H - pad}`;
  const estY = estimated != null ? y(estimated) : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <polygon points={area} fill="var(--color-noble-navy)" opacity={0.12} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-noble-navy)"
          strokeWidth={2}
        />
        {estY != null ? (
          <line
            x1={pad}
            x2={W - pad}
            y1={estY}
            y2={estY}
            stroke="var(--color-noble-red)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
        <span>{curve[0].weekStart}</span>
        <span className="font-medium text-noble-black">
          {curve[curve.length - 1].cum}h cumulative
          {estimated != null ? (
            <span className="ml-1 text-noble-red">· est {estimated}h</span>
          ) : null}
        </span>
        <span>{curve[curve.length - 1].weekStart}</span>
      </div>
    </div>
  );
}

function BudgetBar({ budget }: { budget: ProjectMetrics["budget"] }) {
  if (!budget.hasData) {
    return <Empty text="No budget figures set." />;
  }
  const total = budget.total ?? 0;
  const spent = budget.spent ?? 0;
  const committed = budget.committed ?? 0;
  const forecast = budget.forecast ?? 0;
  // Scale to the larger of total / forecast so overruns are visible.
  const scale = Math.max(total, forecast, spent + committed) || 1;
  const pct = (v: number) => `${Math.min((v / scale) * 100, 100)}%`;
  const over = total > 0 && forecast > total;

  return (
    <div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-noble-fog">
        <div
          className="absolute inset-y-0 left-0 bg-noble-navy"
          style={{ width: pct(spent) }}
          title={`Spent ${fmtUsd(spent)}`}
        />
        {committed > 0 ? (
          <div
            className="absolute inset-y-0 bg-noble-navy/45"
            style={{ left: pct(spent), width: pct(committed) }}
            title={`Committed ${fmtUsd(committed)}`}
          />
        ) : null}
        {total > 0 ? (
          <div
            className="absolute inset-y-0 w-0.5 bg-noble-black"
            style={{ left: pct(total) }}
            title={`Budget ${fmtUsd(total)}`}
          />
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-noble-black/75 sm:grid-cols-4">
        <Stat label="Budget" value={budget.total != null ? fmtUsd(total) : "—"} />
        <Stat label="Spent" value={budget.spent != null ? fmtUsd(spent) : "—"} />
        <Stat
          label="Committed"
          value={budget.committed != null ? fmtUsd(committed) : "—"}
        />
        <Stat
          label="Forecast"
          value={budget.forecast != null ? fmtUsd(forecast) : "—"}
          tone={over ? "text-noble-red" : undefined}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-noble-black/50">
        {label}
      </div>
      <div className={`font-medium ${tone ?? "text-noble-black"}`}>{value}</div>
    </div>
  );
}

function StatusStrip({
  history,
}: {
  history: ProjectMetrics["statusHistory"];
}) {
  if (history.length === 0) {
    return <Empty text="No status history yet." />;
  }
  return (
    <div>
      <div className="flex gap-1">
        {history.map((h, i) => {
          const meta = statusMeta(h.label);
          return (
            <div
              key={i}
              className={`h-6 flex-1 rounded ${meta.bar}`}
              title={`${h.date.toISOString().slice(0, 10)} — ${meta.display}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
        <span>{history[0].date.toISOString().slice(0, 10)}</span>
        <span className="font-medium text-noble-black">
          {statusMeta(history[history.length - 1].label).display}
        </span>
        <span>{history[history.length - 1].date.toISOString().slice(0, 10)}</span>
      </div>
    </div>
  );
}

function ActionAging({
  actions,
}: {
  actions: ProjectMetrics["actions"];
}) {
  if (actions.open === 0) {
    return <Empty text="No open action items." />;
  }
  return (
    <div>
      <div className="flex items-baseline gap-4">
        <div>
          <div className="font-serif text-xl font-medium text-noble-black">
            {actions.open}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-noble-black/55">
            open
          </div>
        </div>
        {actions.overdue > 0 ? (
          <div>
            <div className="font-serif text-xl font-medium text-noble-red">
              {actions.overdue}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-noble-black/55">
              overdue
            </div>
          </div>
        ) : null}
        {actions.oldestDays != null ? (
          <div>
            <div className="font-serif text-xl font-medium text-noble-black">
              {actions.oldestDays}d
            </div>
            <div className="text-[10px] uppercase tracking-wider text-noble-black/55">
              oldest
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-noble-fog">
        {actions.fresh > 0 ? (
          <div
            className="bg-[#0F6E56]"
            style={{ width: `${(actions.fresh / actions.open) * 100}%` }}
            title={`${actions.fresh} ≤ 7d`}
          />
        ) : null}
        {actions.aging > 0 ? (
          <div
            className="bg-[#BA7517]"
            style={{ width: `${(actions.aging / actions.open) * 100}%` }}
            title={`${actions.aging} 8–30d`}
          />
        ) : null}
        {actions.stale > 0 ? (
          <div
            className="bg-noble-red"
            style={{ width: `${(actions.stale / actions.open) * 100}%` }}
            title={`${actions.stale} 31d+`}
          />
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-noble-black/70">
        <Legend swatch="bg-[#0F6E56]" label={`≤7d ${actions.fresh}`} />
        <Legend swatch="bg-[#BA7517]" label={`8–30d ${actions.aging}`} />
        <Legend swatch="bg-noble-red" label={`31d+ ${actions.stale}`} />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic text-[var(--muted)]">{text}</p>;
}

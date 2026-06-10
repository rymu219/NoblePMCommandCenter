import Link from "next/link";
import { healthMeta } from "./health";
import type { PortfolioProject } from "@/lib/portfolio-loader";

/*
 * Portfolio timeline — every project's open milestones on one date axis.
 * Server-rendered SVG per row (no client JS); the label column is HTML so
 * rows link to their project page. Fully derived from Milestone rows.
 */

const ROW_H = 26;
const CHART_W = 740;
const COLOR_OVERDUE = "#cf202f";
const COLOR_OPEN = "#11335d";

const DAY = 24 * 60 * 60 * 1000;

function parseIso(s: string): number {
  return new Date(`${s}T00:00:00.000Z`).getTime();
}

export function PortfolioTimeline({
  projects,
  todayIso,
}: {
  projects: PortfolioProject[];
  todayIso: string;
}) {
  const rows = projects.filter((p) => p.openMilestones.length > 0);
  if (rows.length === 0) return null;

  const today = parseIso(todayIso);
  const times = [today];
  for (const p of rows) for (const m of p.openMilestones) times.push(parseIso(m.targetIso));
  let min = Math.min(...times);
  let max = Math.max(...times);
  const minD = new Date(min - 7 * DAY);
  min = Date.UTC(minD.getUTCFullYear(), minD.getUTCMonth(), 1);
  const maxD = new Date(max + 14 * DAY);
  max = Date.UTC(maxD.getUTCFullYear(), maxD.getUTCMonth() + 1, 1);

  const x = (t: number) => ((t - min) / (max - min)) * CHART_W;

  const months: Array<{ x: number; label: string }> = [];
  const cursor = new Date(min);
  while (cursor.getTime() < max) {
    months.push({
      x: x(cursor.getTime()),
      label:
        cursor.getUTCMonth() === 0
          ? `${cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${cursor.getUTCFullYear()}`
          : cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex">
        {/* label column (HTML so rows are links) */}
        <div className="w-[230px] shrink-0">
          <div className="h-[22px]" />
          {rows.map((p) => {
            const meta = healthMeta(p.health);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex h-[26px] items-center gap-1.5 truncate pr-2 text-[11px] text-noble-black hover:underline"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.hex }}
                  title={meta.label}
                />
                <span className="font-mono text-[var(--muted)]">{p.id}</span>
                <span className="truncate">{p.name}</span>
              </Link>
            );
          })}
        </div>

        {/* chart */}
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${CHART_W} ${22 + rows.length * ROW_H}`}
            className="block w-full"
            role="img"
            aria-label="Portfolio timeline"
          >
            {months.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.x}
                  y1={18}
                  x2={m.x}
                  y2={22 + rows.length * ROW_H}
                  stroke="#e7e4da"
                  strokeWidth={1}
                />
                <text x={m.x + 3} y={11} fontSize={9.5} fill="#8a8779">
                  {m.label}
                </text>
              </g>
            ))}
            {rows.map((p, i) => {
              const cy = 22 + i * ROW_H + ROW_H / 2;
              return (
                <g key={p.id}>
                  <line
                    x1={0}
                    y1={cy}
                    x2={CHART_W}
                    y2={cy}
                    stroke="#f1efe8"
                    strokeWidth={1}
                  />
                  {p.openMilestones.map((m) => {
                    const cx = x(parseIso(m.targetIso));
                    const c = m.overdue ? COLOR_OVERDUE : COLOR_OPEN;
                    const r = 4.5;
                    return (
                      <path
                        key={m.id}
                        d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
                        fill={c}
                        stroke={c}
                      >
                        <title>{`${m.title} — ${m.targetIso}`}</title>
                      </path>
                    );
                  })}
                </g>
              );
            })}
            <line
              x1={x(today)}
              y1={14}
              x2={x(today)}
              y2={22 + rows.length * ROW_H}
              stroke="#cf202f"
              strokeWidth={1.5}
            />
            <text x={x(today) + 3} y={20} fontSize={8.5} fill="#cf202f" fontWeight={600}>
              TODAY
            </text>
          </svg>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: COLOR_OPEN }} />
          Open milestone (target date)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: COLOR_OVERDUE }} />
          Overdue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-noble-red" /> Today
        </span>
        <span>Hover a diamond for the milestone; click a project to open it.</span>
      </div>
    </div>
  );
}

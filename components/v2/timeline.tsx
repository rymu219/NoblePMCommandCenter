import { DASH, type TrackColor } from "@/components/dashboard/colors";
import type { V2Phase, V2TimelineMilestone } from "@/lib/project-v2-loader";

/*
 * v2 project timeline — a server-rendered SVG, no client JS. One date
 * axis; phase bars on top, then one row per milestone. Milestones render
 * as diamonds at their target date; a slipped milestone also shows its
 * baseline (hollow) connected by a red drift line, so schedule movement
 * is visible at a glance. Data comes straight from Phase + Milestone
 * rows — editing the milestone list IS editing this chart.
 */

const W = 1000;
const LABEL_W = 218;
const ROW_H = 26;
const PHASE_ROW_H = 24;
const HEADER_H = 26;
const PAD_BOTTOM = 8;

const COLOR_DONE = "#0F6E56";
const COLOR_OVERDUE = "#cf202f";
const COLOR_OPEN = "#11335d"; // noble navy-ish for upcoming work

function parseIso(s: string): number {
  return new Date(`${s}T00:00:00.000Z`).getTime();
}

const DAY = 24 * 60 * 60 * 1000;

interface MonthTick {
  x: number;
  label: string;
}

export function ProjectTimeline({
  phases,
  milestones,
  todayIso,
}: {
  phases: V2Phase[];
  milestones: V2TimelineMilestone[];
  todayIso: string;
}) {
  const dated = milestones.filter((m) => m.targetIso || m.actualIso);
  if (phases.length === 0 && dated.length === 0) return null;

  const today = parseIso(todayIso);
  const times: number[] = [today];
  for (const p of phases) times.push(parseIso(p.startIso), parseIso(p.endIso));
  for (const m of dated) {
    for (const d of [m.baselineIso, m.targetIso, m.actualIso]) {
      if (d) times.push(parseIso(d));
    }
  }
  let min = Math.min(...times);
  let max = Math.max(...times);
  // Snap the domain to month edges with a little air on each side.
  const minD = new Date(min);
  min = Date.UTC(minD.getUTCFullYear(), minD.getUTCMonth(), 1);
  const maxD = new Date(max + 14 * DAY);
  max = Date.UTC(maxD.getUTCFullYear(), maxD.getUTCMonth() + 1, 1);

  const innerW = W - LABEL_W - 12;
  const x = (t: number) => LABEL_W + ((t - min) / (max - min)) * innerW;

  const months: MonthTick[] = [];
  const cursor = new Date(min);
  while (cursor.getTime() < max) {
    const t = cursor.getTime();
    months.push({
      x: x(t),
      label:
        cursor.getUTCMonth() === 0
          ? `${cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${cursor.getUTCFullYear()}`
          : cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const phasesH = phases.length * PHASE_ROW_H;
  const H = HEADER_H + phasesH + dated.length * ROW_H + PAD_BOTTOM;
  const chartTop = HEADER_H;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Project timeline"
      >
        {/* month grid */}
        {months.map((m, i) => (
          <g key={i}>
            <line
              x1={m.x}
              y1={chartTop - 6}
              x2={m.x}
              y2={H - PAD_BOTTOM}
              stroke="#e7e4da"
              strokeWidth={1}
            />
            <text x={m.x + 4} y={14} fontSize={10} fill="#8a8779">
              {m.label}
            </text>
          </g>
        ))}

        {/* phase bars */}
        {phases.map((p, i) => {
          const y = chartTop + i * PHASE_ROW_H;
          const x1 = x(parseIso(p.startIso));
          const x2 = x(parseIso(p.endIso));
          const fill = DASH.track[(p.color as TrackColor) in DASH.track ? (p.color as TrackColor) : "slate"];
          return (
            <g key={p.id}>
              <text
                x={LABEL_W - 10}
                y={y + PHASE_ROW_H / 2 + 3.5}
                fontSize={10.5}
                textAnchor="end"
                fill={p.isCurrent ? "#111921" : "#8a8779"}
                fontWeight={p.isCurrent ? 600 : 400}
              >
                {p.name}
              </text>
              <rect
                x={x1}
                y={y + 4}
                width={Math.max(x2 - x1, 3)}
                height={PHASE_ROW_H - 9}
                rx={3}
                fill={fill}
                opacity={p.isCurrent ? 0.95 : 0.55}
              />
            </g>
          );
        })}

        {/* milestone rows */}
        {dated.map((m, i) => {
          const y = chartTop + phasesH + i * ROW_H + ROW_H / 2;
          const done = !!m.actualIso;
          const target = m.targetIso ? parseIso(m.targetIso) : null;
          const actual = m.actualIso ? parseIso(m.actualIso) : null;
          const baseline = m.baselineIso ? parseIso(m.baselineIso) : null;
          const at = actual ?? target!;
          const overdue = !done && target != null && target < today;
          const color = done ? COLOR_DONE : overdue ? COLOR_OVERDUE : COLOR_OPEN;
          const slipped = baseline != null && target != null && target !== baseline;
          return (
            <g key={m.id}>
              <text
                x={LABEL_W - 10}
                y={y + 3.5}
                fontSize={10.5}
                textAnchor="end"
                fill="#111921"
              >
                {m.title.length > 34 ? `${m.title.slice(0, 33)}…` : m.title}
              </text>
              <line
                x1={LABEL_W}
                y1={y}
                x2={W - 12}
                y2={y}
                stroke="#f1efe8"
                strokeWidth={1}
              />
              {slipped ? (
                <>
                  <line
                    x1={x(baseline!)}
                    y1={y}
                    x2={x(at)}
                    y2={y}
                    stroke={COLOR_OVERDUE}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <Diamond cx={x(baseline!)} cy={y} r={4.5} stroke={COLOR_OVERDUE} fill="white" />
                </>
              ) : null}
              <Diamond cx={x(at)} cy={y} r={5.5} stroke={color} fill={color} />
              {done ? (
                <text x={x(at) + 9} y={y + 3.5} fontSize={9.5} fill={COLOR_DONE}>
                  ✓ {m.actualIso}
                </text>
              ) : (
                <text x={x(at) + 9} y={y + 3.5} fontSize={9.5} fill={overdue ? COLOR_OVERDUE : "#8a8779"}>
                  {m.targetIso}
                </text>
              )}
            </g>
          );
        })}

        {/* today marker */}
        <line
          x1={x(today)}
          y1={chartTop - 6}
          x2={x(today)}
          y2={H - PAD_BOTTOM}
          stroke="#cf202f"
          strokeWidth={1.5}
        />
        <text
          x={x(today) + 4}
          y={chartTop + 2}
          fontSize={9}
          fill="#cf202f"
          fontWeight={600}
        >
          TODAY
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--muted)]">
        <LegendSwatch color={COLOR_OPEN} label="Upcoming" />
        <LegendSwatch color={COLOR_OVERDUE} label="Overdue / slipped from baseline" />
        <LegendSwatch color={COLOR_DONE} label="Complete" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-noble-red" /> Today
        </span>
      </div>
    </div>
  );
}

function Diamond({
  cx,
  cy,
  r,
  stroke,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  fill: string;
}) {
  return (
    <path
      d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
      stroke={stroke}
      strokeWidth={1.5}
      fill={fill}
    />
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rotate-45"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

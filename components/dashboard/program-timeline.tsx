import { DASH, type TrackColor } from "./colors";

export interface PhaseRow {
  name: string;
  startDate: Date;
  endDate: Date;
  color: TrackColor;
  isCurrent?: boolean;
}

interface Props {
  phases: PhaseRow[];
  today: Date;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ROW_HEIGHT = 26;
const ROW_GAP = 8;
const LABEL_COLUMN = 150;
const X_MONTH = 100;
const Y_PAD_TOP = 40;
const Y_PAD_BOTTOM = 30;
const Y_AXIS_LABEL_GAP = 12;

function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) +
    (b.getUTCDate() - a.getUTCDate()) / 30
  );
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function formatRange(a: Date, b: Date): string {
  const M = MONTH_NAMES[a.getUTCMonth()];
  const N = MONTH_NAMES[b.getUTCMonth()];
  return `${M} ${a.getUTCDate()} – ${N} ${b.getUTCDate()}`;
}

/**
 * Mini-Gantt showing one row per phase with a month axis at bottom and a
 * red TODAY vertical marker. Matches the 647-008 PDF dashboard.
 */
export function ProgramTimeline({ phases, today }: Props) {
  if (phases.length === 0) {
    return (
      <div
        className="rounded-md p-6 text-center text-sm"
        style={{
          background: DASH.panel,
          color: DASH.muted,
          border: `1px dashed ${DASH.border}`,
        }}
      >
        No phases logged yet. Add them via the Phases editor below the dashboard.
      </div>
    );
  }

  // Establish the axis: start of the earliest phase's month, end of the
  // latest phase's month (rounded up to month boundary).
  const minDate = phases.reduce(
    (d, p) => (p.startDate < d ? p.startDate : d),
    phases[0].startDate
  );
  const maxDate = phases.reduce(
    (d, p) => (p.endDate > d ? p.endDate : d),
    phases[0].endDate
  );
  const axisStart = startOfMonth(minDate);
  const axisEnd = startOfMonth(
    new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, 1))
  );
  const totalMonths = monthsBetween(axisStart, axisEnd);
  const chartW = totalMonths * X_MONTH;
  const totalH = Y_PAD_TOP + phases.length * (ROW_HEIGHT + ROW_GAP) + Y_PAD_BOTTOM;

  function x(d: Date): number {
    return LABEL_COLUMN + monthsBetween(axisStart, d) * X_MONTH;
  }

  // Month axis ticks
  const months: Array<{ d: Date; x: number; label: string }> = [];
  for (let m = 0; m <= totalMonths; m++) {
    const d = new Date(Date.UTC(axisStart.getUTCFullYear(), axisStart.getUTCMonth() + m, 1));
    months.push({ d, x: LABEL_COLUMN + m * X_MONTH, label: MONTH_NAMES[d.getUTCMonth()] });
  }

  const todayX = x(today);
  const showToday = today >= axisStart && today <= axisEnd;

  return (
    <div
      className="overflow-x-auto rounded-md"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <svg
        viewBox={`0 0 ${LABEL_COLUMN + chartW + 30} ${totalH}`}
        className="block"
        style={{ width: "100%", minWidth: 720 }}
      >
        {/* Month gridlines */}
        {months.map((m, i) => (
          <line
            key={i}
            x1={m.x}
            x2={m.x}
            y1={Y_PAD_TOP - 10}
            y2={totalH - Y_PAD_BOTTOM + 4}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* TODAY marker */}
        {showToday ? (
          <g>
            <line
              x1={todayX}
              x2={todayX}
              y1={Y_PAD_TOP - 18}
              y2={totalH - Y_PAD_BOTTOM + 4}
              stroke={DASH.red}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <rect
              x={todayX - 30}
              y={Y_PAD_TOP - 32}
              width={60}
              height={20}
              rx={3}
              fill={DASH.red}
            />
            <text
              x={todayX}
              y={Y_PAD_TOP - 18}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              letterSpacing={2}
              fill="#ffffff"
            >
              TODAY
            </text>
          </g>
        ) : null}

        {/* Phase rows */}
        {phases.map((p, i) => {
          const y = Y_PAD_TOP + i * (ROW_HEIGHT + ROW_GAP);
          const px = x(p.startDate);
          const pw = Math.max(8, x(p.endDate) - px);
          const fill = DASH.track[p.color];
          const labelColor = p.isCurrent ? DASH.yellow : "#ffffff";
          // The PDF places the date range BELOW or ABOVE the bar depending on space.
          // We draw it inside the bar when the bar is wide enough; otherwise above.
          const inside = pw > 110;
          return (
            <g key={i}>
              <text
                x={LABEL_COLUMN - 10}
                y={y + ROW_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={p.isCurrent ? 700 : 500}
                fill={labelColor}
              >
                {p.name}
              </text>
              <rect
                x={px}
                y={y}
                width={pw}
                height={ROW_HEIGHT}
                rx={2}
                fill={fill}
                opacity={p.color === "yellow" || p.color === "red" ? 0.95 : 0.9}
              />
              <text
                x={inside ? px + pw / 2 : px + pw + 6}
                y={inside ? y + ROW_HEIGHT / 2 : y + ROW_HEIGHT / 2}
                textAnchor={inside ? "middle" : "start"}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill={
                  inside
                    ? p.color === "yellow"
                      ? "#0d141d"
                      : "#ffffff"
                    : "rgba(255,255,255,0.85)"
                }
              >
                {formatRange(p.startDate, p.endDate)}
              </text>
            </g>
          );
        })}

        {/* Month labels at bottom */}
        {months.map((m, i) => (
          <text
            key={i}
            x={m.x}
            y={totalH - Y_PAD_BOTTOM + Y_AXIS_LABEL_GAP + 6}
            textAnchor="middle"
            fontSize={11}
            fill={DASH.muted}
          >
            {m.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

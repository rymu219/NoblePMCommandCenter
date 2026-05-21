import type { SequentialStep } from "@/lib/types";
import { ROLE_META } from "@/lib/types";

interface Props {
  totalDays: number;
  workingStartHour: number;
  workingEndHour: number;
  steps: SequentialStep[];
}

/*
 * Hour-scale sequential detail. x scale: 1 calendar day = (plotW / totalDays).
 * Night/non-working hours (after workingEndHour, before next day's start) get a
 * subtle fill, matching the source template.
 */
export function GanttDetail({
  totalDays,
  workingStartHour,
  workingEndHour,
  steps,
}: Props) {
  const x0 = 190;
  const x1 = 850;
  const plotW = x1 - x0;
  const totalHours = totalDays * 24;
  const hourW = plotW / totalHours;

  const rowH = 28;
  const svgH = 24 + steps.length * rowH + 8;

  const stepColor = (kind: SequentialStep["kind"]) => {
    if (kind === "process") return ROLE_META.automation; // matches template orange
    if (kind === "quality") return ROLE_META.quality;
    // cure → hatch pattern handled separately
    return ROLE_META.process;
  };

  return (
    <div className="gantt-wrap overflow-x-auto">
      <svg viewBox={`0 0 ${x1 + 10} ${svgH}`} width="100%">
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width={5}
            height={5}
            patternTransform="rotate(45)"
          >
            <line x1={0} y1={0} x2={0} y2={5} stroke="#888" strokeWidth={0.8} strokeOpacity={0.25} />
          </pattern>
        </defs>

        {/* Day separators + night shading */}
        {Array.from({ length: totalDays + 1 }).map((_, d) => {
          const x = x0 + d * 24 * hourW;
          return (
            <line key={d} x1={x} x2={x} y1={20} y2={svgH - 4} stroke="#b4b2a9" strokeWidth={0.5} />
          );
        })}
        {Array.from({ length: totalDays }).map((_, d) => {
          // Night band: from end-of-work-day to next day's start.
          const nightX = x0 + (d * 24 + workingEndHour) * hourW;
          const nightWidth = (24 - workingEndHour + workingStartHour) * hourW;
          return (
            <rect
              key={d}
              x={nightX}
              y={28}
              width={nightWidth}
              height={svgH - 32}
              fill="#f1efe8"
              opacity={0.6}
            />
          );
        })}

        {/* Day labels */}
        {Array.from({ length: totalDays }).map((_, d) => {
          const center = x0 + (d + 0.5) * 24 * hourW;
          return (
            <text
              key={d}
              x={center}
              y={14}
              textAnchor="middle"
              fontSize={10}
              fontWeight={500}
              fill="#73726c"
            >
              Day {d + 1}
            </text>
          );
        })}

        {/* Step rows */}
        {steps.map((s, i) => {
          const bx = x0 + s.startHour * hourW;
          const bw = s.durationHours * hourW;
          const y = 28 + i * rowH;
          const cure = s.kind === "cure";
          const meta = cure ? null : stepColor(s.kind);
          return (
            <g key={i}>
              <text
                x={x0 - 5}
                y={y + 14}
                textAnchor="end"
                fontSize={12}
                fill="#73726c"
              >
                {s.label}
              </text>
              <rect
                x={bx}
                y={y + 2}
                width={bw}
                height={20}
                rx={3}
                fill={cure ? "url(#hatch)" : meta!.fill}
                stroke={cure ? "#888780" : meta!.stroke}
                strokeWidth={0.5}
              />
              {s.note ? (
                <text
                  x={bx + bw / 2}
                  y={y + 15}
                  textAnchor="middle"
                  fontSize={10}
                  fill={cure ? "#73726c" : meta!.textOnFill}
                >
                  {s.note}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

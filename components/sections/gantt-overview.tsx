import type { GanttBar, GanttGate } from "@/lib/types";
import { ganttBarStyle } from "@/lib/types";

interface Props {
  totalWeeks: number;
  bars: GanttBar[];
  gates: GanttGate[];
}

/*
 * Week-scale Gantt. SVG matches the geometry of the source template:
 * left label column ~190px, plot extends to x=850. Heavier gate line
 * at the dependency boundary (e.g. mold returns).
 */
export function GanttOverview({ totalWeeks, bars, gates }: Props) {
  const x0 = 190;
  const x1 = 850;
  const plotW = x1 - x0;
  const wkW = plotW / totalWeeks;

  // Group bars by their "group" so we can render group bands and labels.
  const groupOrder: string[] = [];
  const grouped: Record<string, GanttBar[]> = {};
  bars.forEach((b) => {
    if (!grouped[b.group]) {
      grouped[b.group] = [];
      groupOrder.push(b.group);
    }
    grouped[b.group].push(b);
  });

  const rowH = 22;
  const groupHeaderH = 18;
  const totalRows = bars.length + groupOrder.length;
  const svgH = 18 + totalRows * rowH + 24;

  let y = 18;
  const renderRows: React.ReactNode[] = [];

  groupOrder.forEach((g) => {
    // group header
    renderRows.push(
      <g key={`g-${g}`}>
        <text
          x={x0 - 5}
          y={y + 13}
          textAnchor="end"
          className="fill-noble-black"
          fontSize={12}
          fontWeight={500}
        >
          {g}
        </text>
        <line
          x1={0}
          x2={x1 + 10}
          y1={y + groupHeaderH}
          y2={y + groupHeaderH}
          stroke="#d3d1c7"
          strokeWidth={0.5}
        />
      </g>
    );
    y += groupHeaderH;

    grouped[g].forEach((b) => {
      const meta = ganttBarStyle(b);
      const bx = x0 + (b.startWeek - 1) * wkW;
      const bw = b.durationWeeks * wkW;
      renderRows.push(
        <g key={`b-${g}-${b.label}`}>
          <text
            x={x0 - 5}
            y={y + 14}
            textAnchor="end"
            fill="#73726c"
            fontSize={12}
          >
            {b.label}
          </text>
          <rect
            x={bx}
            y={y + 3}
            width={bw}
            height={rowH - 6}
            rx={3}
            fill={meta.fill}
            stroke={meta.stroke}
            strokeWidth={0.5}
          />
          {b.note ? (
            <text
              x={bx + bw / 2}
              y={y + 15}
              textAnchor="middle"
              fill={meta.textOnFill}
              fontSize={10}
            >
              {b.note}
            </text>
          ) : null}
        </g>
      );
      y += rowH;
    });
  });

  return (
    <div className="gantt-wrap overflow-x-auto">
      <svg
        viewBox={`0 0 ${x1 + 10} ${svgH}`}
        width="100%"
        role="img"
        aria-label="Project schedule overview"
      >
        {/* Week grid */}
        {Array.from({ length: totalWeeks + 1 }).map((_, i) => {
          const x = x0 + i * wkW;
          const isGate = gates.some(
            (g) => Math.abs(g.atWeek - i) < 0.51 && i !== 0
          );
          return (
            <line
              key={i}
              x1={x}
              x2={x}
              y1={18}
              y2={svgH - 8}
              stroke={isGate ? "#888780" : "#d3d1c7"}
              strokeWidth={isGate ? 1.5 : 0.5}
            />
          );
        })}
        {/* Week labels */}
        {Array.from({ length: totalWeeks }).map((_, i) => {
          const x = x0 + (i + 0.5) * wkW;
          return (
            <text
              key={i}
              x={x}
              y={13}
              textAnchor="middle"
              fontSize={10}
              fill="#73726c"
            >
              {i + 1}
            </text>
          );
        })}
        <text x={100} y={13} textAnchor="middle" fontSize={10} fill="#73726c">
          Week →
        </text>
        {renderRows}
        {/* Gate label */}
        {gates.map((g, i) => {
          const x = x0 + g.atWeek * wkW;
          return (
            <text
              key={i}
              x={x + 2}
              y={svgH - 2}
              textAnchor="start"
              fontSize={10}
              fill="#73726c"
            >
              ▲ {g.label} — gate
            </text>
          );
        })}
      </svg>
    </div>
  );
}

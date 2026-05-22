import { DASH, type TrackColor } from "./colors";

export interface BudgetTrackRow {
  name: string;
  amount: number;
  color: TrackColor;
}

interface Props {
  tracks: BudgetTrackRow[];
  /** Total budget — drives the right-side $XXXK BUDGET annotation. */
  budgetTotal: number;
  /** Forecast total — drives the right-side $XXXK FORECAST annotation. */
  forecastTotal: number;
  /** Headroom amount (budget - forecast). Renders as the yellow tail. */
  headroom: number;
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${n < 0 ? "-" : ""}$${Math.round(abs / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function BudgetDetail({ tracks, budgetTotal, forecastTotal, headroom }: Props) {
  // The bar width represents budgetTotal. Each track + headroom sums to it.
  const total = Math.max(budgetTotal, tracks.reduce((s, t) => s + t.amount, 0) + Math.max(headroom, 0));
  const segments: Array<BudgetTrackRow & { width: number }> = tracks.map((t) => ({
    ...t,
    width: total > 0 ? (t.amount / total) * 100 : 0,
  }));
  const headroomWidth = total > 0 ? (Math.max(headroom, 0) / total) * 100 : 0;
  const forecastPercent = total > 0 ? (forecastTotal / total) * 100 : 100;

  return (
    <div
      className="rounded-md p-4"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <div className="relative">
        {/* Forecast tick anchored above the bar */}
        <div className="relative h-6 text-[10px] font-semibold tracking-[0.18em]" style={{ color: DASH.muted }}>
          <div
            className="absolute -translate-x-1/2"
            style={{ left: `${forecastPercent}%`, top: 0, color: "#ffffff" }}
          >
            <div className="whitespace-nowrap text-right -translate-x-[100%] pr-1">
              {fmtMoney(forecastTotal)} FORECAST
            </div>
          </div>
        </div>

        {/* The stacked bar */}
        <div className="flex h-12 overflow-hidden rounded-md">
          {segments.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-base font-bold text-white"
              style={{ background: DASH.track[s.color], width: `${s.width}%` }}
            >
              {fmtMoney(s.amount)}
            </div>
          ))}
          {headroomWidth > 0 ? (
            <div
              className="flex items-center justify-center text-sm font-bold"
              style={{
                background: DASH.track.yellow,
                width: `${headroomWidth}%`,
                color: "#0d141d",
              }}
            >
              {headroomWidth >= 6 ? fmtMoney(headroom) : null}
            </div>
          ) : null}
        </div>

        {/* Budget tick anchored below the bar */}
        <div className="mt-1 flex justify-end text-[10px] font-semibold tracking-[0.18em] text-white">
          {fmtMoney(budgetTotal)} BUDGET
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px]" style={{ color: DASH.muted }}>
        {tracks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-4 rounded-[2px]"
              style={{ background: DASH.track[t.color] }}
            />
            {t.name}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-4 rounded-[2px]"
            style={{ background: DASH.track.yellow }}
          />
          Headroom
        </div>
      </div>
    </div>
  );
}

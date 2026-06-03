import { DASH } from "@/components/dashboard/colors";
import { DIMENSION_ORDER, DIMENSIONS, type ProjectSVI, type SviSubScore } from "@/lib/svi";

/*
 * Executive interpretation card for the project dashboard (dark theme). Shows
 * the composite + band, trailing trend, the four sub-score numbers with a per-
 * dimension confidence dot, and a plain-language concern + recommended action.
 * Deliberately NO reason-level breakdown — that stays on the admin Execution page.
 */

/** Band/score tone → hex, reusing the dashboard palette. */
function scoreColor(score: number): string {
  if (score >= 85) return "#3f8f5a"; // strong green
  if (score >= 70) return DASH.green; // stable green
  if (score >= 55) return DASH.yellow; // fragile amber
  if (score >= 40) return DASH.amber; // at-risk orange
  return DASH.red; // critical
}

const CONFIDENCE_LABEL: Record<ProjectSVI["confidence"], string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
};

function TrendBadge({ trend }: { trend: ProjectSVI["trend"] }) {
  if (!trend.available) {
    return <span style={{ color: DASH.muted }}>No trend yet</span>;
  }
  const sign = trend.deltaPoints > 0 ? "+" : "";
  const color =
    trend.direction === "improving" ? "#3f8f5a" : trend.direction === "deteriorating" ? DASH.red : DASH.muted;
  const arrow = trend.direction === "improving" ? "▲" : trend.direction === "deteriorating" ? "▼" : "▬";
  return (
    <span style={{ color }}>
      {arrow} {sign}
      {trend.deltaPoints} pts
      {trend.consecutiveDown >= 2 ? ` · down ${trend.consecutiveDown} wks` : ""}
    </span>
  );
}

function SubRow({ sub }: { sub: SviSubScore }) {
  const meta = DIMENSIONS[sub.key];
  const color = scoreColor(sub.score);
  const confDot = sub.confidence === "high" ? 1 : sub.confidence === "moderate" ? 0.6 : 0.3;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#ffffff", opacity: confDot }}
            title={`${CONFIDENCE_LABEL[sub.confidence]} · ${sub.observations} obs`}
          />
          <span className="text-sm font-medium" style={{ color: DASH.text }}>
            {meta.label}
          </span>
          <span className="text-[10px] tracking-wide" style={{ color: DASH.muted }}>
            {meta.technical}
          </span>
        </div>
        <span className="font-mono text-sm tabular-nums" style={{ color }}>
          {sub.score.toFixed(0)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${sub.score}%`, background: color }} />
      </div>
    </div>
  );
}

export function SviCard({ svi }: { svi: ProjectSVI }) {
  const color = scoreColor(svi.composite);
  return (
    <div className="overflow-hidden rounded-md" style={{ background: DASH.panel }}>
      <div className="h-1.5" style={{ background: color }} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold tracking-[0.28em]" style={{ color: DASH.yellow }}>
            SYSTEMIC VITALITY INDEX
          </span>
          <span className="text-[11px] italic" style={{ color: DASH.muted }}>
            {CONFIDENCE_LABEL[svi.confidence]}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="flex items-end gap-3">
            <span className="text-[52px] font-bold leading-none tracking-tight" style={{ color }}>
              {svi.composite.toFixed(0)}
            </span>
            <div className="pb-1">
              <div className="text-sm font-semibold" style={{ color: DASH.text }}>
                {svi.band.label}
              </div>
              <div className="mt-0.5 text-[11px]">
                <TrendBadge trend={svi.trend} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {DIMENSION_ORDER.map((k) => (
            <SubRow key={k} sub={svi.subs[k]} />
          ))}
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: DASH.border }}>
          <p className="text-[13px] leading-relaxed" style={{ color: DASH.text }}>
            {svi.concern}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: DASH.yellow }}>
            → {svi.action}
          </p>
        </div>
      </div>
    </div>
  );
}

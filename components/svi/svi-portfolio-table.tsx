import Link from "next/link";
import { DIMENSION_ORDER, DIMENSIONS } from "@/lib/svi";
import type { PortfolioSVIRow } from "@/lib/svi-loader";

/*
 * Admin portfolio view of the SVI — every active project, worst composite first.
 * Light theme (matches the Execution page). Rows link to the project dashboard
 * where the full executive card lives.
 */

function scoreClass(score: number): string {
  if (score >= 70) return "text-[#0F6E56]";
  if (score >= 55) return "text-[#BA7517]";
  if (score >= 40) return "text-[#A85510]";
  return "text-noble-red";
}

const CONF_LABEL: Record<string, string> = { high: "High", moderate: "Moderate", low: "Low" };

function trendCell(trend: PortfolioSVIRow["svi"]["trend"]): string {
  if (!trend.available) return "—";
  const arrow = trend.direction === "improving" ? "▲" : trend.direction === "deteriorating" ? "▼" : "▬";
  const down = trend.consecutiveDown >= 2 ? ` ↓${trend.consecutiveDown}w` : "";
  return `${arrow} ${trend.deltaPoints > 0 ? "+" : ""}${trend.deltaPoints}${down}`;
}

export function SviPortfolioTable({ rows }: { rows: PortfolioSVIRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-white px-3 py-4 text-xs text-[var(--muted)]">
        No active projects to score yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface)] text-xs text-[var(--muted)]">
            <th className="px-3 py-1.5 text-left font-medium">Project</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Composite Systemic Vitality Index">
              SVI
            </th>
            <th className="px-2 py-1.5 text-left font-medium">Band</th>
            {DIMENSION_ORDER.map((k) => (
              <th
                key={k}
                className="px-2 py-1.5 text-right font-medium"
                title={`${DIMENSIONS[k].label} — ${DIMENSIONS[k].technical}`}
              >
                {DIMENSIONS[k].label.split(" ")[0]}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-medium">Conf.</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Composite trend vs ~4 weeks prior">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.projectId} className="border-t border-[var(--border)] hover:bg-noble-stone/20">
              <td className="px-3 py-1.5">
                <Link
                  href={`/projects/${r.projectId}/dashboard`}
                  className="text-noble-black hover:underline"
                >
                  <span className="font-mono text-xs text-[var(--muted)]">{r.projectId}</span>{" "}
                  {r.projectName}
                </Link>
              </td>
              <td className={`px-2 py-1.5 text-right font-mono font-semibold tabular-nums ${scoreClass(r.svi.composite)}`}>
                {r.svi.composite.toFixed(0)}
              </td>
              <td className="px-2 py-1.5 text-xs text-[var(--muted)]">{r.svi.band.label}</td>
              {DIMENSION_ORDER.map((k) => (
                <td
                  key={k}
                  className={`px-2 py-1.5 text-right font-mono tabular-nums ${scoreClass(r.svi.subs[k].score)} ${
                    r.svi.weakest === k ? "font-semibold underline decoration-dotted" : ""
                  }`}
                >
                  {r.svi.subs[k].score.toFixed(0)}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right text-xs text-[var(--muted)]">
                {CONF_LABEL[r.svi.confidence]}
              </td>
              <td
                className={`px-2 py-1.5 text-right font-mono text-xs tabular-nums ${
                  r.svi.trend.direction === "deteriorating"
                    ? "text-noble-red"
                    : r.svi.trend.direction === "improving"
                      ? "text-[#0F6E56]"
                      : "text-[var(--muted)]"
                }`}
              >
                {trendCell(r.svi.trend)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

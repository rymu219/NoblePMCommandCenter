import Link from "next/link";
import { categoryLabel, methodLabel, slipReasonLabel } from "@/lib/quality";
import type { QualityBoardData, QualityRow } from "@/lib/quality-loader";

/*
 * Read-only Quality readout for a single project page. Surfaces the quality
 * inspections linked to this project (open work + completed results) so a PM
 * doesn't have to scan the global board. Editing stays on The Board.
 */

const headCls =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-noble-black/60";
const cellCls = "px-3 py-2 align-top";

function MethodPill({ method }: { method: string }) {
  return (
    <span className="rounded-full bg-noble-navy/10 px-2 py-0.5 text-[11px] font-medium text-noble-navy">
      {methodLabel(method)}
    </span>
  );
}

function SlipBadge({ row }: { row: QualityRow }) {
  if (!row.slipReason) return null;
  return (
    <span
      title={row.slipNote ?? undefined}
      className="rounded-full bg-[#BA7517]/15 px-2 py-0.5 text-[11px] font-medium text-[#BA7517]"
    >
      {slipReasonLabel(row.slipReason)}
      {row.slipDays && row.slipDays > 0 ? ` · +${row.slipDays}d` : ""}
    </span>
  );
}

export function ProjectQuality({ active, completed }: QualityBoardData) {
  const overdue = active.filter((r) => r.overdue).length;
  const nextTarget = active.find((r) => r.targetIso && !r.overdue)?.targetIso ?? null;

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Stat value={active.length} label="open" />
        <Stat value={overdue} label="overdue" tone={overdue > 0 ? "red" : "muted"} />
        <Stat value={completed.length} label="completed" />
        {nextTarget ? (
          <span className="text-[var(--muted)]">
            · next target <span className="font-medium text-noble-black">{nextTarget}</span>
          </span>
        ) : null}
        <Link
          href="/board"
          className="no-print ml-auto rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-noble-black hover:bg-noble-stone/40"
        >
          Manage on The Board →
        </Link>
      </div>

      {/* Open inspections */}
      {active.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className={headCls}>Item</th>
                <th className={headCls}>Category</th>
                <th className={headCls}>Method</th>
                <th className={headCls}>Target</th>
                <th className={headCls}>Slip</th>
              </tr>
            </thead>
            <tbody>
              {active.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                  <td className={`${cellCls} font-medium text-noble-black`}>{row.item}</td>
                  <td className={cellCls}>
                    {row.category ? (
                      categoryLabel(row.category)
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className={cellCls}>
                    <MethodPill method={row.method} />
                  </td>
                  <td className={cellCls}>
                    <span className={row.overdue ? "text-noble-red" : ""}>
                      {row.targetIso ?? "—"}
                    </span>
                    {row.overdue ? (
                      <span className="ml-1 text-[11px] text-noble-red">overdue</span>
                    ) : null}
                  </td>
                  <td className={cellCls}>
                    <SlipBadge row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-3 text-sm text-[var(--muted)]">
          No open quality inspections for this project.
        </p>
      )}

      {/* Completed results */}
      {completed.length > 0 ? (
        <details className="rounded-lg border border-[var(--border)] bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-noble-black/70">
            Completed inspections ({completed.length})
          </summary>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-[var(--border)]">
                <th className={headCls}>Item</th>
                <th className={headCls}>Method</th>
                <th className={headCls}>Completed</th>
                <th className={headCls}>Result</th>
                <th className={headCls}>Why it slipped</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                  <td className={`${cellCls} font-medium text-noble-black`}>{row.item}</td>
                  <td className={cellCls}>
                    <MethodPill method={row.method} />
                  </td>
                  <td className={cellCls}>{row.completedIso ?? "—"}</td>
                  <td className={cellCls}>
                    {row.lateDays == null ? (
                      "—"
                    ) : row.lateDays > 0 ? (
                      <span className="text-noble-red">+{row.lateDays}d late</span>
                    ) : (
                      <span className="text-[#0F6E56]">on time</span>
                    )}
                  </td>
                  <td className={cellCls}>
                    {row.slipReason ? <SlipBadge row={row} /> : <span className="text-[var(--muted)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}

function Stat({
  value,
  label,
  tone = "muted",
}: {
  value: number;
  label: string;
  tone?: "muted" | "red";
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tone === "red" && value > 0
          ? "bg-noble-red/10 text-noble-red"
          : "bg-noble-stone/50 text-noble-black/80"
      }`}
    >
      {value} {label}
    </span>
  );
}

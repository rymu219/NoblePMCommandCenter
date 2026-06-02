import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { loadExecutionReport, type ExecutionReport } from "@/lib/execution-loader";
import { PageHero } from "@/components/page-hero";
import { StatChip } from "@/components/stat-chip";
import { SectionShell } from "@/components/section-shell";
import type { SlippageRow } from "@/lib/slippage";

/*
 * Execution analytics — admin-only. The diagnostic view: not just THAT we miss
 * dates, but WHY. Reads the private MilestoneReplan log (never shown to
 * engineers) for the cause breakdown + replan churn, alongside the baseline
 * slip metrics. Four lenses: estimation accuracy, replan churn, accountability
 * by engineer, cause breakdown.
 */
export default async function ExecutionPage() {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const report: ExecutionReport = await loadExecutionReport();
  const { kpis } = report;

  const fmtDays = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}d`);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <PageHero
        eyebrow="Execution — Engineering"
        title="Why we miss dates"
        subtitle="Private to admins. Estimation accuracy, replan churn, and the causes behind every slipped commitment — the evidence for where to strengthen execution."
        actions={
          <Link
            href="/board/report"
            className="no-print rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40"
          >
            Slippage report →
          </Link>
        }
        stats={
          <>
            <StatChip
              value={kpis.onTimePct === null ? "—" : `${kpis.onTimePct}%`}
              label="On time vs baseline"
              accent="var(--color-noble-navy)"
            />
            <StatChip
              value={fmtDays(kpis.medianSlipDays)}
              label="Median slip"
              accent="var(--color-noble-brick)"
            />
            <StatChip
              value={fmtDays(kpis.avgSlipDays)}
              label="Avg slip"
              accent="var(--color-noble-slate)"
            />
            <StatChip
              value={kpis.overdueOpen}
              label="Overdue open"
              accent="var(--color-noble-red)"
            />
            <StatChip
              value={kpis.avgReplansPerMilestone.toFixed(2)}
              label="Replans / milestone"
              accent="var(--color-noble-gold)"
            />
            <StatChip
              value={`${kpis.pctReplanned}%`}
              label="Milestones replanned"
              accent="var(--color-noble-navy)"
            />
          </>
        }
      />

      <SectionShell title="Why dates slip">
        <CauseBreakdown rows={report.causeBreakdown} />
      </SectionShell>

      <SectionShell title="Replan churn — dates that keep moving">
        <ChurnTable rows={report.churn} />
      </SectionShell>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionShell title="Estimation accuracy by month">
          <SlippageTable
            firstCol="Month"
            caption="Milestone delivery vs the original baseline commitment."
            rows={report.estimationByMonth}
          />
        </SectionShell>
        <SectionShell title="Accountability by engineer">
          <SlippageTable
            firstCol="Engineer"
            caption="Subtask delivery vs each subtask's due date."
            rows={report.byEngineer}
          />
        </SectionShell>
      </div>
    </div>
  );
}

/** The Pareto: causes ranked by how often they push a committed date. */
function CauseBreakdown({ rows }: { rows: ExecutionReport["causeBreakdown"] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-white px-3 py-4 text-xs text-[var(--muted)]">
        No date moves recorded yet. Causes appear here as soon as a committed
        target is pushed or re-baselined.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface)] text-xs text-[var(--muted)]">
            <th className="px-3 py-1.5 text-left font-medium">Cause</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Number of date moves">
              Moves
            </th>
            <th className="px-2 py-1.5 text-right font-medium" title="Net days pushed later">
              Days pushed
            </th>
            <th className="w-2/5 px-3 py-1.5 text-left font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.reason} className="border-t border-[var(--border)]">
              <td className="px-3 py-1.5 text-noble-black">{r.label}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{r.count}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                {r.totalDaysPushed}
              </td>
              <td className="px-3 py-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-noble-stone/40">
                  <div
                    className="h-full rounded-full bg-noble-brick"
                    style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Milestones whose committed dates have moved the most. */
function ChurnTable({ rows }: { rows: ExecutionReport["churn"] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-white px-3 py-4 text-xs text-[var(--muted)]">
        No milestones have been replanned yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface)] text-xs text-[var(--muted)]">
            <th className="px-3 py-1.5 text-left font-medium">Milestone</th>
            <th className="px-3 py-1.5 text-left font-medium">Project</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Times the date moved">
              Replans
            </th>
            <th className="px-2 py-1.5 text-right font-medium" title="Net days pushed later">
              Days pushed
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.milestoneId} className="border-t border-[var(--border)]">
              <td className="px-3 py-1.5 text-noble-black">{r.title}</td>
              <td className="px-3 py-1.5 text-[var(--muted)]">{r.projectName}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                <span className={r.replans >= 3 ? "text-noble-red" : ""}>{r.replans}</span>
              </td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                {r.totalDaysPushed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shared SlippageRow table — same columns as the slippage report. */
function SlippageTable({
  firstCol,
  caption,
  rows,
}: {
  firstCol: string;
  caption: string;
  rows: SlippageRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <p className="text-xs text-[var(--muted)]">{caption}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-xs text-[var(--muted)]">Nothing completed in scope yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface)] text-xs text-[var(--muted)]">
              <th className="px-3 py-1.5 text-left font-medium">{firstCol}</th>
              <th className="px-2 py-1.5 text-right font-medium" title="Completed items with a deadline">
                Done
              </th>
              <th className="px-2 py-1.5 text-right font-medium">Late</th>
              <th className="px-2 py-1.5 text-right font-medium">On time</th>
              <th className="px-2 py-1.5 text-right font-medium" title="Average days late (early counts negative)">
                Avg days
              </th>
              <th className="px-2 py-1.5 text-right font-medium" title="Open items currently overdue">
                Overdue
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[var(--border)]">
                <td className="px-3 py-1.5 text-noble-black">{r.label}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">{r.completed}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.late > 0 ? <span className="text-noble-red">{r.late}</span> : r.late}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.onTimePct === null ? "—" : `${r.onTimePct}%`}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.completed ? r.avgDaysLate.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.overdueOpen > 0 ? <span className="text-noble-red">{r.overdueOpen}</span> : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

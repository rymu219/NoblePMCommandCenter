import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadSlippageReport, type SlippageReport } from "@/lib/board-loader";
import type { SlippageRow } from "@/lib/slippage";

/*
 * Read-only slippage report. The evidence view: how often and by how much we
 * miss dates. Scoped by role (engineer → own; admin/viewer → portfolio).
 *   - Subtask rows measure days-late vs each subtask's own due date.
 *   - Milestone rows measure days-late vs the ORIGINAL baseline commitment.
 */
export default async function SlippageReportPage() {
  const user = await requireUser();
  const report: SlippageReport = await loadSlippageReport(user);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Slippage Report
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{report.scopeNote}</p>
        </div>
        <Link
          href="/board"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40"
        >
          ← Back to board
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Table
          title="Subtasks by engineer"
          caption="Days late vs each subtask's due date."
          firstCol="Engineer"
          rows={report.byEngineer}
        />
        <Table
          title="Milestones by project"
          caption="Days late vs the original baseline commitment."
          firstCol="Project"
          rows={report.byProject}
        />
        <Table
          title="Subtasks completed by month"
          caption="Trend of subtask delivery over time."
          firstCol="Month"
          rows={report.subtasksByMonth}
        />
        <Table
          title="Milestones completed by month"
          caption="Trend of milestone delivery over time."
          firstCol="Month"
          rows={report.milestonesByMonth}
        />
      </div>
    </div>
  );
}

function Table({
  title,
  caption,
  firstCol,
  rows,
}: {
  title: string;
  caption: string;
  firstCol: string;
  rows: SlippageRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-semibold text-noble-black">{title}</h2>
        <p className="text-xs text-[var(--muted)]">{caption}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-xs text-[var(--muted)]">
          Nothing completed in scope yet.
        </p>
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
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.completed}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.late > 0 ? (
                    <span className="text-noble-red">{r.late}</span>
                  ) : (
                    r.late
                  )}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.onTimePct === null ? "—" : `${r.onTimePct}%`}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.completed ? r.avgDaysLate.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {r.overdueOpen > 0 ? (
                    <span className="text-noble-red">{r.overdueOpen}</span>
                  ) : (
                    0
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

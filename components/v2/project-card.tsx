import Link from "next/link";
import { healthMeta } from "./health";
import type { PortfolioProject } from "@/lib/portfolio-loader";

/* Health-colored project card for the Portfolio grid. Entirely derived. */

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

export function ProjectCard({ project }: { project: PortfolioProject }) {
  const meta = healthMeta(project.health);
  const { budgetTotal, spentTotal } = project;
  const spentPct =
    budgetTotal && budgetTotal > 0 && spentTotal != null
      ? Math.min((spentTotal / budgetTotal) * 100, 100)
      : null;
  const overBudget =
    budgetTotal != null && spentTotal != null && spentTotal > budgetTotal;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block overflow-hidden rounded-lg border border-[var(--border)] bg-white transition hover:border-noble-black/30 hover:shadow-sm"
    >
      <div className="h-1.5" style={{ backgroundColor: meta.hex }} />
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span className="font-mono tracking-wider">{project.id}</span>
          {project.status === "on_hold" ? <span>· on hold</span> : null}
          {project.status === "not_started" ? <span>· not started</span> : null}
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.pill}`}
          >
            {meta.label}
          </span>
        </div>
        <div className="mt-1 truncate font-serif text-[15px] font-medium leading-snug text-noble-black">
          {project.name}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">
          {project.ownerName ?? "—"} · updated {project.lastUpdatedIso}
        </div>

        {project.nextMilestone ? (
          <div
            className={`mt-2 flex items-center gap-1.5 text-xs ${
              project.nextMilestone.overdue ? "text-noble-red" : "text-noble-black/80"
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-current" />
            <span className="truncate">
              {project.nextMilestone.title} — {project.nextMilestone.targetIso}
              {project.nextMilestone.overdue ? " (overdue)" : ""}
            </span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-[var(--muted)]">No dated open milestones</div>
        )}

        {spentPct != null ? (
          <div className="mt-2.5">
            <div className="h-1.5 overflow-hidden rounded bg-[var(--surface)]">
              <div
                className={overBudget ? "h-full bg-noble-red" : "h-full bg-noble-black/70"}
                style={{ width: `${spentPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
              <span>{fmtShort(spentTotal!)} spent</span>
              <span>of {fmtShort(budgetTotal!)}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-2 flex gap-3 text-[10px] text-[var(--muted)]">
          {project.openRiskCount > 0 ? (
            <span>{project.openRiskCount} open risks</span>
          ) : null}
          {project.openFollowUpCount > 0 ? (
            <span>{project.openFollowUpCount} follow-ups</span>
          ) : null}
          {project.openMilestones.length > 0 ? (
            <span>{project.openMilestones.length} open milestones</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

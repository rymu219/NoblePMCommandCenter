import type { ProjectMilestoneView } from "@/lib/board-loader";
import { cueBadge, driftBadge } from "@/app/board/cue-style";
import { AddMilestone, EditMilestone } from "@/app/board/milestone-editor";

/*
 * Project-page milestone list. The same milestones shown on the board, here
 * scoped to one project with progress counted across all engineers. Admins and
 * the project owner can add/edit inline via the board's editor islands (single
 * editing implementation).
 */
export function ProjectMilestones({
  projectId,
  milestones,
  canEdit,
}: {
  projectId: string;
  milestones: ProjectMilestoneView[];
  canEdit: boolean;
}) {
  if (milestones.length === 0 && !canEdit) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No milestones yet for this project.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {milestones.map((m) => (
        <MilestoneRow key={m.id} milestone={m} canEdit={canEdit} />
      ))}
      {canEdit ? (
        <div className="no-print mt-1">
          <AddMilestone projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
}

function MilestoneRow({
  milestone,
  canEdit,
}: {
  milestone: ProjectMilestoneView;
  canEdit: boolean;
}) {
  const cue = cueBadge(milestone.cue, milestone.vsBaseline);
  const drift = driftBadge(milestone.driftDays);
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-noble-black">
              {milestone.title}
            </span>
            {cue ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cue.className}`}
              >
                {cue.label}
              </span>
            ) : null}
            {drift ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${drift.className}`}
              >
                {drift.label}
              </span>
            ) : null}
            {milestone.totalCount > 0 ? (
              <span className="rounded bg-noble-stone/50 px-1.5 py-0.5 text-[10px] font-medium text-noble-black/70">
                {milestone.doneCount}/{milestone.totalCount} done
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-[var(--muted)]">
            <span>target {milestone.targetIso}</span>
            {milestone.actualIso ? <span>done {milestone.actualIso}</span> : null}
            {milestone.driftDays > 0 ? (
              <span>baseline {milestone.baselineIso}</span>
            ) : null}
          </div>
        </div>
        {canEdit ? (
          <div className="no-print">
            <EditMilestone milestone={milestone} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

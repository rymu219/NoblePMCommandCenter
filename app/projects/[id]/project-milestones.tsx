import type { ProjectMilestoneView } from "@/lib/board-loader";
import { cueBadge, driftBadge, needsDateBadge } from "@/app/board/cue-style";
import {
  AddMilestone,
  EditMilestone,
  MilestoneComplete,
} from "@/app/board/milestone-editor";
import { ThankYouLine } from "@/app/board/thank-you";

/*
 * Project-page milestone list — the permanent record ("not forgotten"): all
 * milestones for the project, open ones first (soonest target), then completed.
 * Admins and the project owner can add/edit inline via the board's editor
 * islands (single editing implementation).
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

  const open = milestones.filter((m) => !m.actualIso);
  const completed = milestones.filter((m) => m.actualIso);

  return (
    <div className="flex flex-col gap-2">
      {open.map((m) => (
        <MilestoneRow key={m.id} milestone={m} canEdit={canEdit} />
      ))}

      {completed.length > 0 ? (
        <details className="group mt-1">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-noble-black/70">
            Completed — with thanks ({completed.length})
            <span className="text-[var(--muted)] group-open:hidden">▸</span>
            <span className="hidden text-[var(--muted)] group-open:inline">▾</span>
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {completed.map((m) => (
              <MilestoneRow key={m.id} milestone={m} canEdit={canEdit} />
            ))}
          </div>
        </details>
      ) : null}

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
  const needsDate = needsDateBadge(milestone.targetIso, milestone.actualIso);
  const done = milestone.actualIso !== null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-sm font-medium ${
                done ? "text-noble-black/80" : "text-noble-black"
              }`}
            >
              {milestone.title}
            </span>
            {needsDate ? <Badge badge={needsDate} /> : null}
            {cue ? <Badge badge={cue} /> : null}
            {drift ? <Badge badge={drift} /> : null}
            {milestone.totalCount > 0 ? (
              <span className="rounded bg-noble-stone/50 px-1.5 py-0.5 text-[10px] font-medium text-noble-black/70">
                {milestone.doneCount}/{milestone.totalCount} done
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-[var(--muted)]">
            {milestone.targetIso ? <span>target {milestone.targetIso}</span> : null}
            {milestone.actualIso ? <span>done {milestone.actualIso}</span> : null}
            {milestone.driftDays > 0 && milestone.baselineIso ? (
              <span>baseline {milestone.baselineIso}</span>
            ) : null}
          </div>
          {milestone.notes ? (
            <p className="mt-1 text-[11px] text-[var(--muted)] italic whitespace-pre-wrap">
              {milestone.notes}
            </p>
          ) : null}
          {done ? (
            <div className="mt-1">
              <ThankYouLine name="team" />
            </div>
          ) : null}
          {canEdit ? (
            <div className="no-print mt-1.5">
              <MilestoneComplete milestoneId={milestone.id} isComplete={done} />
            </div>
          ) : null}
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

function Badge({ badge }: { badge: { label: string; className: string } }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

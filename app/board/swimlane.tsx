import type { BoardMilestone, BoardSwimlane } from "@/lib/board-loader";
import { cueBadge, driftBadge } from "./cue-style";
import { SubtaskRow } from "./subtask-row";
import { AddSubtask } from "./add-subtask";
import { AddMilestone, AddMilestoneToLane, EditMilestone } from "./milestone-editor";

/*
 * One engineer's lane: their assigned, milestone-bearing projects → milestone
 * cards → their own subtasks. Server-rendered; interactivity lives in the
 * client islands (SubtaskRow, AddSubtask, Add/EditMilestone).
 */
export function Swimlane({
  lane,
  canEditMilestones,
  canEditSubtasks,
}: {
  lane: BoardSwimlane;
  canEditMilestones: boolean;
  canEditSubtasks: boolean;
}) {
  return (
    <section className="flex w-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <header className="rounded-t-lg border-b border-[var(--border)] bg-noble-black px-3 py-2">
        <h2 className="text-sm font-semibold text-white">{lane.ownerName}</h2>
      </header>
      <div className="flex flex-col gap-3 p-3">
        {lane.projects.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No milestones on assigned projects yet.
          </p>
        ) : (
          lane.projects.map((p) => (
            <div key={p.id} className="rounded-md border border-[var(--border)] bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-2.5 py-1.5">
                <span className="truncate text-xs font-semibold text-noble-black">
                  <span className="font-mono text-[var(--muted)]">{p.id}</span>{" "}
                  {p.name}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {p.milestones.map((m) => (
                  <MilestoneCard
                    key={m.id}
                    milestone={m}
                    ownerId={lane.ownerId}
                    canEditMilestones={canEditMilestones}
                    canEditSubtasks={canEditSubtasks && !lane.isUnassigned}
                  />
                ))}
                {canEditMilestones ? <AddMilestone projectId={p.id} /> : null}
              </div>
            </div>
          ))
        )}
        {canEditMilestones && !lane.isUnassigned ? (
          <AddMilestoneToLane projects={lane.assignableProjects} />
        ) : null}
      </div>
    </section>
  );
}

function MilestoneCard({
  milestone,
  ownerId,
  canEditMilestones,
  canEditSubtasks,
}: {
  milestone: BoardMilestone;
  ownerId: string;
  canEditMilestones: boolean;
  canEditSubtasks: boolean;
}) {
  const cue = cueBadge(milestone.cue, milestone.vsBaseline);
  const drift = driftBadge(milestone.driftDays);
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start gap-2 px-2 py-1.5">
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
        {canEditMilestones ? <EditMilestone milestone={milestone} /> : null}
      </div>

      <div className="border-t border-[var(--border)] bg-white">
        {milestone.subtasks.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-[var(--muted)]">No subtasks.</p>
        ) : (
          milestone.subtasks.map((s, i) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              canEdit={canEditSubtasks}
              isFirst={i === 0}
              isLast={i === milestone.subtasks.length - 1}
            />
          ))
        )}
        {canEditSubtasks ? (
          <AddSubtask milestoneId={milestone.id} ownerId={ownerId} />
        ) : null}
      </div>
    </div>
  );
}

import type {
  BoardMilestoneCard,
  BoardSection,
  BoardSwimlane,
} from "@/lib/board-loader";
import { cueBadge, driftBadge, needsDateBadge } from "./cue-style";
import { SubtaskRow } from "./subtask-row";
import { AddSubtask } from "./add-subtask";
import {
  AddMilestoneToLane,
  EditMilestone,
  EngagementToggle,
} from "./milestone-editor";
import { ThankYouLine } from "./thank-you";

/*
 * One engineer's lane, organized into status sections: Needs a date / Overdue /
 * Upcoming / On the horizon / Supporting, plus a collapsible "Completed — with
 * thanks" archive. Server-rendered; interactivity lives in the client islands.
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
      <div className="flex flex-col gap-4 p-3">
        {lane.sections.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No milestones on assigned projects yet.
          </p>
        ) : (
          lane.sections.map((section) => (
            <SectionBlock
              key={section.key}
              section={section}
              ownerId={lane.ownerId}
              ownerName={lane.ownerName}
              isUnassigned={lane.isUnassigned}
              canEditMilestones={canEditMilestones}
              canEditSubtasks={canEditSubtasks && !lane.isUnassigned}
            />
          ))
        )}
        {canEditMilestones && !lane.isUnassigned ? (
          <AddMilestoneToLane projects={lane.assignableProjects} />
        ) : null}
      </div>
    </section>
  );
}

const SECTION_ACCENT: Record<string, string> = {
  undated: "bg-noble-red",
  overdue: "bg-noble-red",
  upcoming: "bg-noble-gold",
  horizon: "bg-noble-black/40",
  supporting: "bg-[var(--color-role-process)]",
  completed: "bg-[var(--color-role-process)]",
};

function SectionBlock({
  section,
  ownerId,
  ownerName,
  isUnassigned,
  canEditMilestones,
  canEditSubtasks,
}: {
  section: BoardSection;
  ownerId: string;
  ownerName: string;
  isUnassigned: boolean;
  canEditMilestones: boolean;
  canEditSubtasks: boolean;
}) {
  const accent = SECTION_ACCENT[section.key] ?? "bg-noble-black/40";

  // The completed archive collapses so it stays "out of the way but not gone".
  if (section.key === "completed") {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-noble-black/70">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          {section.label} ({section.milestones.length})
          <span className="text-[var(--muted)] group-open:hidden">▸</span>
          <span className="hidden text-[var(--muted)] group-open:inline">▾</span>
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {section.milestones.map((m) => (
            <CompletedCard
              key={m.id}
              milestone={m}
              ownerName={ownerName}
              canEditMilestones={canEditMilestones}
            />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-noble-black/70">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        {section.label} ({section.milestones.length})
      </h3>
      {section.milestones.map((m) => (
        <MilestoneCard
          key={m.id}
          milestone={m}
          ownerId={ownerId}
          isUnassigned={isUnassigned}
          canEditMilestones={canEditMilestones}
          canEditSubtasks={canEditSubtasks}
        />
      ))}
    </div>
  );
}

function ProjectLabel({ m }: { m: BoardMilestoneCard }) {
  return (
    <div className="truncate text-[11px] text-[var(--muted)]">
      <span className="font-mono">{m.projectId}</span> · {m.projectName}
    </div>
  );
}

function MilestoneCard({
  milestone,
  ownerId,
  isUnassigned,
  canEditMilestones,
  canEditSubtasks,
}: {
  milestone: BoardMilestoneCard;
  ownerId: string;
  isUnassigned: boolean;
  canEditMilestones: boolean;
  canEditSubtasks: boolean;
}) {
  const cue = cueBadge(milestone.cue, milestone.vsBaseline);
  const drift = driftBadge(milestone.driftDays);
  const needsDate = needsDateBadge(milestone.targetIso, milestone.actualIso);
  return (
    <div className="rounded-md border border-[var(--border)] bg-white">
      <div className="flex items-start gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <ProjectLabel m={milestone} />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-noble-black">
              {milestone.title}
            </span>
            {needsDate ? (
              <Badge badge={needsDate} />
            ) : null}
            {cue ? <Badge badge={cue} /> : null}
            {drift ? <Badge badge={drift} /> : null}
            {milestone.totalCount > 0 ? (
              <span className="rounded bg-noble-stone/50 px-1.5 py-0.5 text-[10px] font-medium text-noble-black/70">
                {milestone.doneCount}/{milestone.totalCount} done
              </span>
            ) : null}
          </div>
          {milestone.targetIso || milestone.driftDays > 0 ? (
            <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-[var(--muted)]">
              {milestone.targetIso ? <span>target {milestone.targetIso}</span> : null}
              {milestone.driftDays > 0 && milestone.baselineIso ? (
                <span>baseline {milestone.baselineIso}</span>
              ) : null}
            </div>
          ) : null}
          {milestone.notes ? (
            <p className="mt-1 text-[11px] text-[var(--muted)] italic whitespace-pre-wrap">
              {milestone.notes}
            </p>
          ) : null}
          {canEditMilestones && !isUnassigned ? (
            <div className="no-print mt-1.5">
              <EngagementToggle
                milestoneId={milestone.id}
                userId={ownerId}
                isSupport={milestone.isSupport}
              />
            </div>
          ) : null}
        </div>
        {canEditMilestones ? <EditMilestone milestone={milestone} /> : null}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface)]/40">
        {milestone.subtasks.length === 0 ? (
          <p className="px-2.5 py-1.5 text-xs text-[var(--muted)]">No subtasks.</p>
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

function CompletedCard({
  milestone,
  ownerName,
  canEditMilestones,
}: {
  milestone: BoardMilestoneCard;
  ownerName: string;
  canEditMilestones: boolean;
}) {
  const late = cueBadge(milestone.cue, milestone.vsBaseline); // done / done-late
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-2.5 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProjectLabel m={milestone} />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-noble-black/80">
              {milestone.title}
            </span>
            {late ? <Badge badge={late} /> : null}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
            {milestone.actualIso ? `done ${milestone.actualIso}` : "done"}
          </div>
          <div className="mt-1">
            <ThankYouLine name={ownerName} />
          </div>
        </div>
        {canEditMilestones ? <EditMilestone milestone={milestone} /> : null}
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

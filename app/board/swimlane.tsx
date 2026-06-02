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
  MilestoneComplete,
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
  const openCount = lane.sections
    .filter((s) => s.key !== "completed")
    .reduce((n, s) => n + s.milestones.length, 0);

  return (
    <section className="card animate-rise flex w-full flex-col overflow-hidden bg-[var(--surface)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--border)] bg-noble-black px-3 py-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-noble-gold text-[11px] font-bold text-noble-black"
          aria-hidden
        >
          {initials(lane.ownerName)}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {lane.ownerName}
        </h2>
        <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
          {openCount} open
        </span>
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

/** Faint tint behind a section's summary pill, paired with SECTION_ACCENT. */
const SECTION_TINT: Record<string, string> = {
  undated: "bg-noble-red/8 text-noble-red",
  overdue: "bg-noble-red/8 text-noble-red",
  upcoming: "bg-noble-gold/20 text-noble-black",
  horizon: "bg-noble-black/5 text-noble-black/70",
  supporting: "bg-[var(--color-role-process)]/10 text-[var(--color-role-process)]",
  completed: "bg-[var(--color-role-process)]/10 text-[var(--color-role-process)]",
};

/** Left-border accent color for an active milestone card, by slippage cue. */
function cueAccentVar(cue: string, needsDate: boolean): string {
  if (needsDate) return "var(--color-noble-red)";
  switch (cue) {
    case "overdue":
    case "done-late":
      return "var(--color-noble-red)";
    case "due-soon":
      return "var(--color-noble-gold)";
    default:
      return "var(--color-noble-navy)";
  }
}

/** Up to two initials from a display name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const tint = SECTION_TINT[section.key] ?? "bg-noble-black/5 text-noble-black/70";
  const isCompleted = section.key === "completed";

  // Every section is collapsible; only "Upcoming" is expanded by default so the
  // lane opens focused on what's due soon.
  return (
    <details className="group" open={section.key === "upcoming"}>
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tint}`}
        >
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          {section.label}
          <span className="opacity-70">· {section.milestones.length}</span>
        </span>
        <span className="text-[var(--muted)] group-open:hidden">▸</span>
        <span className="hidden text-[var(--muted)] group-open:inline">▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {section.milestones.map((m) =>
          isCompleted ? (
            <CompletedCard
              key={m.id}
              milestone={m}
              ownerName={ownerName}
              canEditMilestones={canEditMilestones}
            />
          ) : (
            <MilestoneCard
              key={m.id}
              milestone={m}
              ownerId={ownerId}
              isUnassigned={isUnassigned}
              canEditMilestones={canEditMilestones}
              canEditSubtasks={canEditSubtasks}
            />
          )
        )}
      </div>
    </details>
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
  const accent = cueAccentVar(milestone.cue, needsDate !== null);
  const pct =
    milestone.totalCount > 0
      ? Math.round((milestone.doneCount / milestone.totalCount) * 100)
      : 0;
  return (
    <div
      className="card-interactive overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
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
          </div>
          {milestone.totalCount > 0 ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-noble-stone/40"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Subtasks complete"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-role-process)] transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-medium text-noble-black/70">
                {milestone.doneCount}/{milestone.totalCount}
              </span>
            </div>
          ) : null}
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
          {canEditMilestones ? (
            <div className="no-print mt-1.5 flex flex-wrap items-center gap-1.5">
              <MilestoneComplete milestoneId={milestone.id} isComplete={false} />
              {!isUnassigned ? (
                <EngagementToggle
                  milestoneId={milestone.id}
                  userId={ownerId}
                  isSupport={milestone.isSupport}
                />
              ) : null}
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
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--color-role-process)]/[0.05] px-2.5 py-2"
      style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-role-process)" }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProjectLabel m={milestone} />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className="text-[var(--color-role-process)]"
              aria-hidden
            >
              ✓
            </span>
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
          {canEditMilestones ? (
            <div className="no-print mt-1.5">
              <MilestoneComplete milestoneId={milestone.id} isComplete={true} />
            </div>
          ) : null}
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

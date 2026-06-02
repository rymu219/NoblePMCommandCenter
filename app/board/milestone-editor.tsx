"use client";

import { useState, useTransition } from "react";
import type { ProjectMilestoneView } from "@/lib/board-loader";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  rebaselineMilestoneAction,
  setEngagementAction,
  setMilestoneDoneAction,
  updateMilestoneAction,
} from "./board-actions";

/*
 * Milestone controls (admin or project owner). Modes:
 *   - create: a "+ Add milestone" affordance under a known project.
 *   - create-to-lane: a "+ Add milestone" with a project picker, for an
 *     engineer's swimlane where the project isn't fixed yet.
 *   - edit: a gear on the milestone card → title, notes, target date, actual
 *     completion date, plus guarded re-baseline and delete.
 *   - engagement: a per-lane Direct⇄Supporting toggle.
 *
 * The target date is OPTIONAL everywhere — a milestone can be jotted down before
 * its date is known, and the board flags it "needs a date".
 */

const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm";
const fieldLabelCls = "text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]";
const primaryBtn =
  "rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60";
const secondaryBtn =
  "rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40";

/** Title + optional target + notes — shared by the two create forms. */
function MilestoneFields({ autoFocusTitle }: { autoFocusTitle?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={fieldLabelCls}>Title</label>
        <input
          name="title"
          placeholder="Milestone title"
          required
          autoFocus={autoFocusTitle}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={fieldLabelCls}>Target date (optional)</label>
        <input name="targetDate" type="date" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={fieldLabelCls}>Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Context, scope, dependencies…"
          className={`${inputCls} resize-y`}
        />
      </div>
    </>
  );
}

export function AddMilestone({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondaryBtn}>
        + Add milestone
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("projectId", projectId);
        startTransition(async () => {
          try {
            await createMilestoneAction(fd);
            setOpen(false);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Could not add milestone.");
          }
        });
      }}
      className="flex flex-col gap-3 rounded-md border border-dashed border-[var(--border-strong)] bg-white p-3"
    >
      <MilestoneFields autoFocusTitle />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={primaryBtn}>
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryBtn}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * "+ Add milestone" for an engineer's swimlane: the project isn't fixed, so the
 * PM picks one of the engineer's assigned projects first, then enters the
 * milestone. Reuses createMilestoneAction (projectId comes from the select).
 */
export function AddMilestoneToLane({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-xs text-noble-black/70 hover:bg-noble-stone/40"
      >
        + Add milestone
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          try {
            await createMilestoneAction(fd);
            setOpen(false);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Could not add milestone.");
          }
        });
      }}
      className="flex flex-col gap-3 rounded-md border border-dashed border-[var(--border-strong)] bg-white p-3"
    >
      <div className="flex flex-col gap-1">
        <label className={fieldLabelCls}>Project</label>
        <select name="projectId" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Choose a project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {p.name}
            </option>
          ))}
        </select>
      </div>
      <MilestoneFields />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={primaryBtn}>
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryBtn}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EditMilestone({ milestone }: { milestone: ProjectMilestoneView }) {
  const [open, setOpen] = useState(false);
  const [rebaseline, setRebaseline] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<void>, fd: FormData, close = true) {
    fd.set("id", milestone.id);
    startTransition(async () => {
      try {
        await action(fd);
        if (close) setOpen(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Edit milestone"
        title="Edit milestone"
        onClick={() => setOpen(true)}
        className="rounded px-1 text-xs text-noble-black/55 hover:bg-noble-stone/40 hover:text-noble-black"
      >
        ⚙
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <form action={(fd) => run(updateMilestoneAction, fd)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className={fieldLabelCls}>Title</label>
          <input name="title" defaultValue={milestone.title} required className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={fieldLabelCls}>Target date (optional)</label>
            <input
              name="targetDate"
              type="date"
              defaultValue={milestone.targetIso ?? ""}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabelCls}>Actual completion</label>
            <input
              name="actualDate"
              type="date"
              defaultValue={milestone.actualIso ?? ""}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelCls}>Notes (optional)</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={milestone.notes ?? ""}
            placeholder="Context, scope, dependencies…"
            className={`${inputCls} resize-y`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className={primaryBtn}>
            Save
          </button>
          <button type="button" onClick={() => setOpen(false)} className={secondaryBtn}>
            Cancel
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setRebaseline((v) => !v)}
            className={secondaryBtn}
          >
            Re-baseline
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete milestone "${milestone.title}" and its subtasks?`)) {
                run(deleteMilestoneAction, new FormData());
              }
            }}
            className="rounded-md border border-noble-red/40 px-3 py-1.5 text-xs text-noble-red hover:bg-noble-red/10 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </form>

      {rebaseline ? (
        <form
          action={(fd) => run(rebaselineMilestoneAction, fd, false)}
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]"
        >
          <span className="w-full">
            Reset baseline — corrects the original commitment
            {milestone.baselineIso ? ` (currently ${milestone.baselineIso})` : ""}.
          </span>
          <input
            name="baselineDate"
            type="date"
            defaultValue={milestone.baselineIso ?? ""}
            required
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
          />
          <button type="submit" disabled={pending} className={primaryBtn}>
            Apply
          </button>
        </form>
      ) : null}
    </div>
  );
}

/**
 * One-click "Mark complete" / "Reopen" for a milestone. Stamps today's date
 * as the actual completion (or clears it). Shown to admins / the project
 * owner; the gear editor still allows a specific completion date.
 */
export function MilestoneComplete({
  milestoneId,
  isComplete,
}: {
  milestoneId: string;
  isComplete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() => {
        const fd = new FormData();
        fd.set("id", milestoneId);
        fd.set("complete", isComplete ? "false" : "true");
        startTransition(async () => {
          try {
            await setMilestoneDoneAction(fd);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Could not update milestone.");
          }
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        title={isComplete ? "Reopen — clears the completion date" : "Mark complete (today)"}
        className={
          isComplete
            ? "rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-noble-black/65 hover:bg-noble-stone/40 disabled:opacity-50"
            : "rounded border border-[#0F6E56]/40 px-1.5 py-0.5 text-[10px] font-medium text-[#0F6E56] hover:bg-[#0F6E56]/10 disabled:opacity-50"
        }
      >
        {isComplete ? "↺ Reopen" : "✓ Mark complete"}
      </button>
    </form>
  );
}

/**
 * Per-lane Direct⇄Supporting toggle for one engineer on one milestone.
 * Shown to admins on active milestone cards in an engineer's swimlane.
 */
export function EngagementToggle({
  milestoneId,
  userId,
  isSupport,
}: {
  milestoneId: string;
  userId: string;
  isSupport: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => {
        fd.set("milestoneId", milestoneId);
        fd.set("userId", userId);
        fd.set("support", isSupport ? "false" : "true");
        startTransition(async () => {
          try {
            await setEngagementAction(fd);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Could not change engagement.");
          }
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        title={isSupport ? "Make this a direct milestone" : "Move to Supporting"}
        className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-noble-black/65 hover:bg-noble-stone/40 disabled:opacity-50"
      >
        {isSupport ? "↑ Make direct" : "→ Supporting"}
      </button>
    </form>
  );
}

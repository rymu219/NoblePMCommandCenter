"use client";

import { useState, useTransition } from "react";
import type { BoardMilestone } from "@/lib/board-loader";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  rebaselineMilestoneAction,
  updateMilestoneAction,
} from "./board-actions";

/*
 * Admin-only milestone controls. Two modes:
 *   - create: a "+ Add milestone" affordance under a project.
 *   - edit: a gear on the milestone card → title, target date, actual
 *     completion date, plus guarded re-baseline and delete.
 */

export function AddMilestone({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-noble-black/70 hover:bg-noble-stone/40"
      >
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
      className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-[var(--border-strong)] bg-white px-2 py-2"
    >
      <input
        name="title"
        placeholder="Milestone title"
        required
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
      />
      <label className="text-xs text-[var(--muted)]">
        Target{" "}
        <input
          name="targetDate"
          type="date"
          required
          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-noble-black px-2 py-1 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
      >
        Create
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
      >
        Cancel
      </button>
    </form>
  );
}

export function EditMilestone({ milestone }: { milestone: BoardMilestone }) {
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
    <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
      <form
        action={(fd) => run(updateMilestoneAction, fd)}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={milestone.title}
          required
          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <label>
            Target{" "}
            <input
              name="targetDate"
              type="date"
              defaultValue={milestone.targetIso}
              required
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
            />
          </label>
          <label>
            Actual{" "}
            <input
              name="actualDate"
              type="date"
              defaultValue={milestone.actualIso ?? ""}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-noble-black px-2 py-1 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
          >
            Cancel
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setRebaseline((v) => !v)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
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
            className="rounded-md border border-noble-red/40 px-2 py-1 text-xs text-noble-red hover:bg-noble-red/10 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </form>

      {rebaseline ? (
        <form
          action={(fd) => run(rebaselineMilestoneAction, fd, false)}
          className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]"
        >
          <span>
            Reset baseline (corrects the original commitment; current{" "}
            {milestone.baselineIso}):
          </span>
          <input
            name="baselineDate"
            type="date"
            defaultValue={milestone.baselineIso}
            required
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-noble-black px-2 py-1 font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
          >
            Apply
          </button>
        </form>
      ) : null}
    </div>
  );
}

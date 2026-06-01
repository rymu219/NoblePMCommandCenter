"use client";

import { useState, useTransition } from "react";
import { createSubtaskAction } from "./board-actions";

/*
 * Inline "add a subtask" control shown under a milestone in an engineer's
 * lane. ownerId is the lane's engineer; the server action forces self for
 * engineers and honours it for admins creating on an engineer's behalf.
 */
export function AddSubtask({
  milestoneId,
  ownerId,
}: {
  milestoneId: string;
  ownerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 ml-6 rounded px-1 py-0.5 text-xs text-noble-black/55 hover:bg-noble-stone/40 hover:text-noble-black"
      >
        + Add subtask
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("milestoneId", milestoneId);
        fd.set("ownerId", ownerId);
        startTransition(async () => {
          try {
            await createSubtaskAction(fd);
            setOpen(false);
          } catch (e) {
            alert(e instanceof Error ? e.message : "Could not add subtask.");
          }
        });
      }}
      className="mt-1 flex flex-wrap items-center gap-2 py-1 pl-6 pr-2"
    >
      <input
        name="title"
        placeholder="Subtask title"
        required
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
      />
      <input
        name="dueDate"
        type="date"
        title="Optional due date"
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-noble-black px-2 py-1 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
      >
        Add
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

"use client";

import { useState, useTransition } from "react";
import type { BoardSubtask } from "@/lib/board-loader";
import { cueBadge } from "./cue-style";
import { ThanksFlash } from "./thank-you";
import {
  deleteSubtaskAction,
  moveSubtaskAction,
  toggleSubtaskAction,
  updateSubtaskAction,
} from "./board-actions";

/*
 * One subtask line: done checkbox, title, due date + cue badge, and (for the
 * owner/admin) inline edit, delete, and up/down reorder. Auto-saves via the
 * server actions; reverts/alerts on failure like the My Week grid.
 */
export function SubtaskRow({
  subtask,
  canEdit,
  isFirst,
  isLast,
}: {
  subtask: BoardSubtask;
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState(0);
  const done = subtask.completedAtIso !== null;
  const badge = cueBadge(subtask.cue, subtask.daysLate);

  function run(action: (fd: FormData) => Promise<void>, fd: FormData) {
    fd.set("id", subtask.id);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  function toggle() {
    const fd = new FormData();
    fd.set("done", done ? "false" : "true");
    if (!done) setFlash((f) => f + 1); // celebrate completion
    run(toggleSubtaskAction, fd);
  }

  function move(dir: "up" | "down") {
    const fd = new FormData();
    fd.set("dir", dir);
    run(moveSubtaskAction, fd);
  }

  function remove() {
    if (!confirm(`Delete subtask "${subtask.title}"?`)) return;
    run(deleteSubtaskAction, new FormData());
  }

  if (editing) {
    return (
      <form
        action={(fd) => {
          run(updateSubtaskAction, fd);
          setEditing(false);
        }}
        className="flex flex-wrap items-center gap-2 py-1 pl-6 pr-2"
      >
        <input
          name="title"
          defaultValue={subtask.title}
          required
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
        />
        <input
          name="dueDate"
          type="date"
          defaultValue={subtask.dueDateIso ?? ""}
          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-noble-black px-2 py-1 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 py-1 pl-2 pr-2 text-sm ${
        pending ? "opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={done}
        disabled={!canEdit || pending}
        onChange={toggle}
        className="h-4 w-4 shrink-0 accent-[var(--color-role-process)]"
        aria-label={done ? "Mark not done" : "Mark done"}
      />
      <span
        className={`min-w-0 flex-1 truncate ${
          done ? "text-[var(--muted)] line-through" : "text-noble-black"
        }`}
        title={subtask.title}
      >
        {subtask.title}
      </span>
      {subtask.dueDateIso ? (
        <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
          {subtask.dueDateIso}
        </span>
      ) : null}
      {badge ? (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      ) : null}
      <ThanksFlash trigger={flash} />
      {canEdit ? (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn label="Move up" disabled={isFirst || pending} onClick={() => move("up")}>
            ↑
          </IconBtn>
          <IconBtn label="Move down" disabled={isLast || pending} onClick={() => move("down")}>
            ↓
          </IconBtn>
          <IconBtn label="Edit" disabled={pending} onClick={() => setEditing(true)}>
            ✎
          </IconBtn>
          <IconBtn label="Delete" disabled={pending} onClick={remove}>
            ✕
          </IconBtn>
        </span>
      ) : null}
    </div>
  );
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-1 text-xs text-noble-black/60 hover:bg-noble-stone/40 hover:text-noble-black disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

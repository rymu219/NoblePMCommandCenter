"use client";

import { useState, useTransition } from "react";
import { OWNER_DEPTS } from "@/lib/status";
import { SaveError } from "@/components/save-error";
import { addFollowUpAction } from "@/app/projects/[id]/v2-actions";

/* Inline "+ Add follow-up" — creates an ActionItem for the daily report list. */
export function AddFollowUp({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false);
  const [dept, setDept] = useState("engineering");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="no-print mt-2 text-xs font-medium text-noble-black/60 hover:text-noble-black"
      >
        + Add follow-up
      </button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("ownerDept", dept);
        fd.set("body", body.trim());
        fd.set("dueDate", due);
        await addFollowUpAction(fd);
        setBody("");
        setDue("");
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div className="no-print mt-2 rounded-md border border-dashed border-noble-black/30 bg-white px-3 py-2">
      <div className="flex flex-wrap gap-1.5">
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
        >
          {OWNER_DEPTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.display}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
        />
      </div>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
        placeholder="Who needs to do what?"
        onKeyDown={(e) => {
          if (e.key === "Enter" && body.trim()) save();
        }}
        className="mt-1.5 w-full rounded border border-[var(--border)] px-2 py-1 text-sm text-noble-black focus:border-noble-black/40 focus:outline-none"
      />
      <SaveError message={error} />
      <div className="mt-2 flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={save}
          disabled={pending || !body.trim()}
          className="rounded-md bg-noble-black px-3 py-1 font-medium text-white hover:bg-noble-black/85 disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          disabled={pending}
          className="px-2 py-1 text-[var(--muted)] hover:text-noble-black"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

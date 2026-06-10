"use client";

import { useState, useTransition } from "react";
import { MarkdownLite } from "./markdown";
import { SaveError } from "@/components/save-error";
import { saveNotesAction } from "@/app/projects/[id]/v2-actions";

/* Free-form project notes — click the text (or Edit) to swap in a textarea. */
export function NotesCard({
  projectId,
  notes,
  canEdit,
}: {
  projectId: string;
  notes: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!notes && !canEdit) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("notes", draft.trim());
        await saveNotesAction(fd);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  if (editing) {
    return (
      <div className="no-print rounded-lg border border-noble-black/30 bg-white p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          autoFocus
          placeholder="Anything off-template. **bold** supported; blank line = new paragraph."
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm leading-relaxed text-noble-black focus:border-noble-black/40 focus:outline-none"
        />
        <SaveError message={error} />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-noble-black px-3 py-1 font-medium text-white hover:bg-noble-black/85 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(notes ?? "");
              setEditing(false);
            }}
            disabled={pending}
            className="px-2 py-1 text-[var(--muted)] hover:text-noble-black"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      {notes ? (
        <MarkdownLite text={notes} />
      ) : (
        <p className="text-sm text-[var(--muted)]">No notes yet.</p>
      )}
      {canEdit ? (
        <button
          type="button"
          onClick={() => {
            setDraft(notes ?? "");
            setEditing(true);
          }}
          className="no-print mt-2 text-xs font-medium text-noble-black/60 hover:text-noble-black"
        >
          {notes ? "Edit notes" : "+ Add notes"}
        </button>
      ) : null}
    </div>
  );
}

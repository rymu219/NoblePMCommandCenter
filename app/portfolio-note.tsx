"use client";

import { useState, useTransition } from "react";
import { savePortfolioNoteAction } from "./dashboard-actions";

/*
 * Inline-editable portfolio note (Priority Callout / Key Risks /
 * Forward-Looking). Renders the body when not in edit mode; click
 * "Edit" to open a textarea that saves on Save.
 */

interface Props {
  kind: "priority_callout" | "key_risks" | "forward_looking";
  initialBody: string;
  placeholder: string;
  canEdit: boolean;
}

export function PortfolioNote({ kind, initialBody, placeholder, canEdit }: Props) {
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBody);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function save() {
    setBusy(true);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("body", draft);
    startTransition(async () => {
      try {
        await savePortfolioNoteAction(fd);
        setBody(draft);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Save failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  if (editing) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(4, draft.split("\n").length + 1)}
          placeholder={placeholder}
          className="w-full rounded-md border border-[var(--border)] bg-white p-3 text-sm leading-relaxed focus:border-noble-red/40 focus:outline-none"
        />
        <div className="mt-2 flex justify-end gap-2 no-print">
          <button
            type="button"
            onClick={() => {
              setDraft(body);
              setEditing(false);
            }}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <RenderedBody body={body} placeholder={placeholder} />
      {canEdit ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="no-print absolute right-0 top-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-noble-black/70 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-noble-stone/40"
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function RenderedBody({ body, placeholder }: { body: string; placeholder: string }) {
  const lines = body.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) {
    return (
      <p className="text-sm italic text-[var(--muted)]">{placeholder}</p>
    );
  }
  const allBulleted = lines.every((l) => /^[-•·]\s+/.test(l));
  if (allBulleted) {
    return (
      <ul className="list-disc pl-5 text-sm leading-relaxed text-noble-black/85">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^[-•·]\s+/, "")}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-1 text-sm leading-relaxed text-noble-black/85">
      {lines.map((l, i) =>
        /^[-•·]\s+/.test(l) ? (
          <div key={i} className="pl-4 relative">
            <span className="absolute left-0 text-noble-red">·</span>
            {l.replace(/^[-•·]\s+/, "")}
          </div>
        ) : (
          <p key={i}>{l}</p>
        )
      )}
    </div>
  );
}

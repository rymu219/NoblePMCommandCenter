"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import {
  addDecisionAction,
  updateDecisionAction,
  deleteDecisionAction,
} from "@/app/projects/[id]/v2-actions";
import type { V2Decision } from "@/lib/project-v2-loader";

/*
 * Decisions log as editable rows. Newest first; click a row to edit in
 * place; "+ Log decision" appends.
 */
export function DecisionsList({
  projectId,
  decisions,
  canEdit,
  defaultAuthor,
}: {
  projectId: string;
  decisions: V2Decision[];
  canEdit: boolean;
  defaultAuthor?: string;
}) {
  if (decisions.length === 0 && !canEdit) {
    return <p className="text-sm text-[var(--muted)]">No decisions logged.</p>;
  }

  const sorted = [...decisions].sort((a, b) =>
    (b.decidedOnIso ?? "").localeCompare(a.decidedOnIso ?? "")
  );

  return (
    <div className="flex flex-col gap-1.5">
      {canEdit ? <AddDecision projectId={projectId} defaultAuthor={defaultAuthor} /> : null}
      {sorted.map((d) => (
        <DecisionRow key={d.id} decision={d} canEdit={canEdit} />
      ))}
    </div>
  );
}

function DecisionFields({
  body,
  setBody,
  decidedOn,
  setDecidedOn,
  source,
  setSource,
  author,
  setAuthor,
}: {
  body: string;
  setBody: (v: string) => void;
  decidedOn: string;
  setDecidedOn: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  author: string;
  setAuthor: (v: string) => void;
}) {
  return (
    <>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        autoFocus
        placeholder="What was decided?"
        className="w-full rounded border border-[var(--border)] px-2 py-1 text-sm text-noble-black focus:border-noble-black/40 focus:outline-none"
      />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <input
          type="date"
          value={decidedOn}
          onChange={(e) => setDecidedOn(e.target.value)}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
        >
          <option value="unilateral">Unilateral</option>
          <option value="meeting">Meeting</option>
        </select>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Decided by"
          className="min-w-0 flex-1 rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
        />
      </div>
    </>
  );
}

function DecisionRow({ decision, canEdit }: { decision: V2Decision; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(decision.body);
  const [decidedOn, setDecidedOn] = useState(decision.decidedOnIso ?? "");
  const [source, setSource] = useState(decision.source);
  const [author, setAuthor] = useState(decision.author ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", decision.id);
        fd.set("body", body.trim());
        fd.set("decidedOn", decidedOn);
        fd.set("source", source);
        fd.set("author", author.trim());
        await updateDecisionAction(fd);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this decision? This cannot be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", decision.id);
      await deleteDecisionAction(fd);
    });
  }

  if (editing) {
    return (
      <div className="no-print rounded-md border border-noble-black/30 bg-white px-3 py-2">
        <DecisionFields
          {...{ body, setBody, decidedOn, setDecidedOn, source, setSource, author, setAuthor }}
        />
        <SaveError message={error} />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={save}
            disabled={pending || !body.trim()}
            className="rounded-md bg-noble-black px-3 py-1 font-medium text-white hover:bg-noble-black/85 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="px-2 py-1 text-[var(--muted)] hover:text-noble-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="ml-auto px-2 py-1 font-medium text-noble-red hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => canEdit && setEditing(true)}
      disabled={!canEdit}
      title={canEdit ? "Click to edit" : undefined}
      className={`rounded-md border border-[var(--border)] bg-white px-3 py-2 text-left ${
        canEdit ? "hover:bg-noble-stone/20" : "cursor-default"
      }`}
    >
      <span className="text-sm leading-snug text-noble-black/90">{decision.body}</span>
      <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
        {decision.decidedOnIso ?? "undated"}
        {decision.author ? ` · ${decision.author}` : ""}
        {decision.source === "meeting" ? " · meeting" : ""}
      </span>
    </button>
  );
}

function AddDecision({
  projectId,
  defaultAuthor,
}: {
  projectId: string;
  defaultAuthor?: string;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [decidedOn, setDecidedOn] = useState(todayIso);
  const [source, setSource] = useState("unilateral");
  const [author, setAuthor] = useState(defaultAuthor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="no-print self-start text-xs font-medium text-noble-black/60 hover:text-noble-black"
      >
        + Log decision
      </button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("body", body.trim());
        fd.set("decidedOn", decidedOn);
        fd.set("source", source);
        fd.set("author", author.trim());
        await addDecisionAction(fd);
        setBody("");
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div className="no-print rounded-md border border-dashed border-noble-black/30 bg-white px-3 py-2">
      <DecisionFields
        {...{ body, setBody, decidedOn, setDecidedOn, source, setSource, author, setAuthor }}
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

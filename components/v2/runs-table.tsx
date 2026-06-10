"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import {
  addRunAction,
  updateRunAction,
  deleteRunAction,
} from "@/app/projects/[id]/v2-actions";
import type { V2Run } from "@/lib/project-v2-loader";

/*
 * Parts & material by run — a table whose rows edit in place. Click a row
 * to swap it for inputs; the totals row is derived.
 */
export function RunsTable({
  projectId,
  runs,
  canEdit,
}: {
  projectId: string;
  runs: V2Run[];
  canEdit: boolean;
}) {
  if (runs.length === 0 && !canEdit) {
    return <p className="text-sm text-[var(--muted)]">No runs logged.</p>;
  }

  const totals = runs.reduce(
    (acc, r) => ({ parts: acc.parts + r.parts, lbs: acc.lbs + r.lbs, kg: acc.kg + r.kg }),
    { parts: 0, lbs: 0, kg: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
            <th className="px-3 py-2">Run</th>
            <th className="px-3 py-2">Purpose</th>
            <th className="px-3 py-2 text-right">Parts</th>
            <th className="px-3 py-2 text-right">lbs</th>
            <th className="px-3 py-2 text-right">kg</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <RunRow key={r.id} run={r} canEdit={canEdit} />
          ))}
          {runs.length > 1 ? (
            <tr className="border-t border-[var(--border)] font-medium text-noble-black">
              <td className="px-3 py-2">Total</td>
              <td />
              <td className="px-3 py-2 text-right font-mono">{totals.parts.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{totals.lbs.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
              <td className="px-3 py-2 text-right font-mono">{totals.kg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
            </tr>
          ) : null}
          {canEdit ? <AddRunRow projectId={projectId} /> : null}
        </tbody>
      </table>
    </div>
  );
}

interface RunDraft {
  name: string;
  purpose: string;
  parts: string;
  lbs: string;
  kg: string;
}

function RunInputsRow({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  pending,
  error,
}: {
  draft: RunDraft;
  setDraft: (d: RunDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  pending: boolean;
  error: string | null;
}) {
  const cell = "rounded border border-[var(--border)] px-1.5 py-1 text-sm text-noble-black focus:border-noble-black/40 focus:outline-none";
  return (
    <>
      <tr className="no-print border-t border-[var(--border)] bg-noble-stone/15">
        <td className="px-2 py-1.5">
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Run name"
            className={`w-full ${cell}`}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
            placeholder="Purpose"
            className={`w-full ${cell}`}
          />
        </td>
        {(["parts", "lbs", "kg"] as const).map((f) => (
          <td key={f} className="px-2 py-1.5">
            <input
              value={draft[f]}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
              inputMode="decimal"
              className={`w-20 text-right font-mono ${cell}`}
            />
          </td>
        ))}
      </tr>
      <tr className="no-print bg-noble-stone/15">
        <td colSpan={5} className="px-2 pb-2">
          <SaveError message={error} />
          <div className="mt-1 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !draft.name.trim()}
              className="rounded-md bg-noble-black px-3 py-1 font-medium text-white hover:bg-noble-black/85 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="px-2 py-1 text-[var(--muted)] hover:text-noble-black"
            >
              Cancel
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="ml-auto px-2 py-1 font-medium text-noble-red hover:underline"
              >
                Delete
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  );
}

function RunRow({ run, canEdit }: { run: V2Run; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RunDraft>({
    name: run.name,
    purpose: run.purpose ?? "",
    parts: String(run.parts),
    lbs: String(run.lbs),
    kg: String(run.kg),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", run.id);
        fd.set("name", draft.name.trim());
        fd.set("purpose", draft.purpose.trim());
        fd.set("parts", draft.parts);
        fd.set("lbs", draft.lbs);
        fd.set("kg", draft.kg);
        await updateRunAction(fd);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this run? This cannot be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", run.id);
      await deleteRunAction(fd);
    });
  }

  if (editing) {
    return (
      <RunInputsRow
        draft={draft}
        setDraft={setDraft}
        onSave={save}
        onCancel={() => setEditing(false)}
        onDelete={remove}
        pending={pending}
        error={error}
      />
    );
  }

  return (
    <tr
      onClick={() => canEdit && setEditing(true)}
      title={canEdit ? "Click to edit" : undefined}
      className={`border-t border-[var(--border)] text-noble-black/90 ${
        canEdit ? "cursor-pointer hover:bg-noble-stone/20" : ""
      }`}
    >
      <td className="px-3 py-2 font-medium">{run.name}</td>
      <td className="px-3 py-2 text-[var(--muted)]">{run.purpose ?? ""}</td>
      <td className="px-3 py-2 text-right font-mono">{run.parts.toLocaleString()}</td>
      <td className="px-3 py-2 text-right font-mono">{run.lbs.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
      <td className="px-3 py-2 text-right font-mono">{run.kg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
    </tr>
  );
}

function AddRunRow({ projectId }: { projectId: string }) {
  const empty: RunDraft = { name: "", purpose: "", parts: "", lbs: "", kg: "" };
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!adding) {
    return (
      <tr className="no-print border-t border-[var(--border)]">
        <td colSpan={5} className="px-3 py-1.5">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium text-noble-black/60 hover:text-noble-black"
          >
            + Add run
          </button>
        </td>
      </tr>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("name", draft.name.trim());
        fd.set("purpose", draft.purpose.trim());
        fd.set("parts", draft.parts);
        fd.set("lbs", draft.lbs);
        fd.set("kg", draft.kg);
        await addRunAction(fd);
        setDraft(empty);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <RunInputsRow
      draft={draft}
      setDraft={setDraft}
      onSave={save}
      onCancel={() => setAdding(false)}
      pending={pending}
      error={error}
    />
  );
}

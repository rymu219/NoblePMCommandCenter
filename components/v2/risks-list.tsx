"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import {
  addRiskAction,
  updateRiskAction,
  setRiskStatusAction,
  deleteRiskAction,
} from "@/app/projects/[id]/v2-actions";
import type { V2Risk } from "@/lib/project-v2-loader";

/*
 * Risks & pre-conditions as individually editable rows: checkbox resolves,
 * clicking a row opens it for editing in place, "+ Add risk" appends.
 */
export function RisksList({
  projectId,
  risks,
  canEdit,
}: {
  projectId: string;
  risks: V2Risk[];
  canEdit: boolean;
}) {
  const open = risks.filter((r) => r.status !== "resolved");
  const resolved = risks.filter((r) => r.status === "resolved");

  if (risks.length === 0 && !canEdit) {
    return <p className="text-sm text-[var(--muted)]">No open risks.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {open.map((r) => (
        <RiskRow key={r.id} risk={r} canEdit={canEdit} />
      ))}
      {open.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No open risks.</p>
      ) : null}
      {resolved.length > 0 ? (
        <details className="group mt-1">
          <summary className="cursor-pointer list-none text-xs font-semibold text-noble-black/60">
            Resolved ({resolved.length}) <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </summary>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {resolved.map((r) => (
              <RiskRow key={r.id} risk={r} canEdit={canEdit} />
            ))}
          </div>
        </details>
      ) : null}
      {canEdit ? <AddRisk projectId={projectId} /> : null}
    </div>
  );
}

function RiskRow({ risk, canEdit }: { risk: V2Risk; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(risk.body);
  const [owner, setOwner] = useState(risk.owner ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const resolved = risk.status === "resolved";

  function toggle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", risk.id);
      fd.set("resolved", String(!resolved));
      await setRiskStatusAction(fd);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", risk.id);
        fd.set("body", body.trim());
        fd.set("owner", owner.trim());
        await updateRiskAction(fd);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this risk? This cannot be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", risk.id);
      await deleteRiskAction(fd);
    });
  }

  if (editing) {
    return (
      <div className="no-print rounded-md border border-noble-black/30 bg-white px-3 py-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          autoFocus
          className="w-full rounded border border-[var(--border)] px-2 py-1 text-sm text-noble-black focus:border-noble-black/40 focus:outline-none"
        />
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Owner(s) — free text"
          className="mt-1.5 w-full rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
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
    <div
      className={`flex items-start gap-2.5 rounded-md border border-[var(--border)] bg-white px-3 py-2 ${
        resolved ? "opacity-70" : ""
      }`}
    >
      {canEdit ? (
        <input
          type="checkbox"
          checked={resolved}
          onChange={toggle}
          disabled={pending}
          title={resolved ? "Reopen" : "Mark resolved"}
          className="no-print mt-1 h-3.5 w-3.5 accent-[#0F6E56]"
        />
      ) : (
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${resolved ? "bg-[#0F6E56]" : "bg-noble-red"}`} />
      )}
      <button
        type="button"
        onClick={() => canEdit && setEditing(true)}
        disabled={!canEdit}
        className={`min-w-0 flex-1 text-left text-sm leading-snug text-noble-black/90 ${
          canEdit ? "rounded hover:bg-noble-stone/30" : "cursor-default"
        } ${resolved ? "line-through decoration-noble-black/30" : ""}`}
        title={canEdit ? "Click to edit" : undefined}
      >
        {risk.body}
        {risk.owner ? (
          <span className="ml-1.5 whitespace-nowrap text-[11px] text-[var(--muted)]">— {risk.owner}</span>
        ) : null}
      </button>
    </div>
  );
}

function AddRisk({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [owner, setOwner] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="no-print mt-0.5 self-start text-xs font-medium text-noble-black/60 hover:text-noble-black"
      >
        + Add risk
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
        fd.set("owner", owner.trim());
        await addRiskAction(fd);
        setBody("");
        setOwner("");
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div className="no-print rounded-md border border-dashed border-noble-black/30 bg-white px-3 py-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        autoFocus
        placeholder="What could derail this project?"
        className="w-full rounded border border-[var(--border)] px-2 py-1 text-sm text-noble-black focus:border-noble-black/40 focus:outline-none"
      />
      <input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="Owner(s) — free text"
        className="mt-1.5 w-full rounded border border-[var(--border)] px-2 py-1 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
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

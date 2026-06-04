"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import { ISSUE_STATUSES, statusBadge, statusLabel } from "@/lib/issues";
import { IMPORT_PROMPT } from "@/lib/issues-import";
import type { IssueTracker, IssueView, PartView } from "@/lib/issues-loader";
import {
  importIssuesAction,
  addPartAction,
  deletePartAction,
  addIssueAction,
  setIssueStatusAction,
  deleteIssueAction,
  addIssueActionItemAction,
  toggleIssueActionDoneAction,
  deleteIssueActionItemAction,
  addChallengeAction,
  deleteChallengeAction,
} from "./issue-actions";

const inputCls = "rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm";
const fieldLabelCls = "text-[10px] font-semibold uppercase tracking-wider text-noble-black/60";
const btnLight =
  "rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40";
const btnDark =
  "rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60";

// Shared transition runner; exposed via a hook so sub-components share state.
function useRun() {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function run(fn: () => Promise<void>, onDone?: () => void) {
    setErr(null);
    setBusy(true);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusy(false);
      }
    });
  }
  return { run, busy, err, setErr };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function IssuesBoard({
  projectId,
  tracker,
  canEdit,
}: {
  projectId: string;
  tracker: IssueTracker;
  canEdit: boolean;
}) {
  const [showImport, setShowImport] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const allParts = tracker.parts;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-noble-black">{tracker.summary.total} issues</span>
          {ISSUE_STATUSES.map((s) => (
            <span key={s.value} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
              {tracker.summary.byStatus[s.value] ?? 0} {s.label}
            </span>
          ))}
          {canEdit ? (
            <div className="no-print ml-auto flex flex-wrap gap-2">
              <button type="button" className={btnLight} onClick={() => setShowImport((v) => !v)}>
                Import from Claude
              </button>
              <button type="button" className={btnLight} onClick={() => setShowAddPart((v) => !v)}>
                + Part
              </button>
              <button type="button" className={btnLight} onClick={() => setShowAddIssue((v) => !v)}>
                + Issue
              </button>
              <button type="button" className={btnLight} onClick={() => window.print()}>
                Print
              </button>
            </div>
          ) : (
            <button type="button" className={`${btnLight} no-print ml-auto`} onClick={() => window.print()}>
              Print
            </button>
          )}
        </div>

        {/* At-a-glance per-part counts */}
        {allParts.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
            {allParts.map((p) => (
              <span key={p.id} className="rounded-md bg-noble-stone/40 px-2 py-0.5">
                {p.name}: {p.issues.length}
              </span>
            ))}
            {tracker.crossCutting.length > 0 ? (
              <span className="rounded-md bg-noble-stone/40 px-2 py-0.5">
                Cross-cutting: {tracker.crossCutting.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {canEdit && showImport ? (
        <ImportPanel projectId={projectId} onClose={() => setShowImport(false)} />
      ) : null}
      {canEdit && showAddPart ? (
        <AddPartForm projectId={projectId} onClose={() => setShowAddPart(false)} />
      ) : null}
      {canEdit && showAddIssue ? (
        <AddIssueForm projectId={projectId} parts={allParts} onClose={() => setShowAddIssue(false)} />
      ) : null}

      {tracker.empty ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-6 text-center text-sm text-[var(--muted)]">
          No issues yet.{" "}
          {canEdit ? "Use “Import from Claude” to paste a generated tracker, or add a part/issue." : null}
        </p>
      ) : null}

      {/* Parts */}
      {allParts.map((part) => (
        <PartSection key={part.id} part={part} canEdit={canEdit} />
      ))}

      {/* Cross-cutting */}
      {tracker.crossCutting.length > 0 ? (
        <section>
          <h2 className="mb-2 border-l-4 border-noble-slate pl-2 font-serif text-lg font-medium text-noble-black">
            Cross-cutting
          </h2>
          <div className="space-y-3">
            {tracker.crossCutting.map((issue) => (
              <IssueCard key={issue.id} issue={issue} canEdit={canEdit} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PartSection({ part, canEdit }: { part: PartView; canEdit: boolean }) {
  const { run, busy, err } = useRun();
  return (
    <section>
      <div className="mb-2 flex items-end gap-3 border-l-4 border-noble-navy pl-2">
        <h2 className="font-serif text-lg font-medium text-noble-black">{part.name}</h2>
        <span className="text-xs text-[var(--muted)]">
          {part.drawingNumber ? <span className="font-mono">{part.drawingNumber}</span> : null}
          {part.revision ? ` · Rev ${part.revision}` : ""}
          {part.cavities ? ` · ${part.cavities} cavities` : ""}
          {` · ${part.issues.length} issues`}
        </span>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete part "${part.name}"? Its issues become cross-cutting.`))
                run(() => deletePartAction(part.id));
            }}
            disabled={busy}
            className="no-print ml-auto text-xs text-noble-red hover:underline disabled:opacity-60"
          >
            Delete part
          </button>
        ) : null}
      </div>
      <SaveError message={err} />
      {part.issues.length === 0 ? (
        <p className="px-2 text-xs text-[var(--muted)]">No issues for this part.</p>
      ) : (
        <div className="space-y-3">
          {part.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} canEdit={canEdit} />
          ))}
        </div>
      )}
    </section>
  );
}

function IssueCard({ issue, canEdit }: { issue: IssueView; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<"action" | "challenge" | null>(null);
  const { run, busy, err } = useRun();
  const bodyCls = open ? "block" : "hidden print:block";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <StatusBadge status={issue.status} />
        {issue.charLabel ? (
          <span className="rounded bg-noble-stone/50 px-1.5 py-0.5 font-mono text-[11px] text-noble-black/70">
            {issue.charLabel}
          </span>
        ) : null}
        <span className="font-medium text-noble-black">{issue.title}</span>
        {issue.owner ? <span className="text-[11px] text-[var(--muted)]">· {issue.owner}</span> : null}
        <span className="no-print ml-auto text-[var(--muted)]">{open ? "▲" : "▼"}</span>
      </button>

      <div className={`${bodyCls} border-t border-[var(--border)] px-3 py-3`}>
        {issue.synopsis ? <p className="text-sm text-noble-black/80">{issue.synopsis}</p> : null}

        {/* Challenges */}
        {issue.challenges.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className={fieldLabelCls}>Challenges</div>
            {issue.challenges.map((c) => (
              <div key={c.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-noble-black">{c.title}</span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => run(() => deleteChallengeAction(c.id))}
                      className="no-print text-[11px] text-noble-red hover:underline"
                    >
                      remove
                    </button>
                  ) : null}
                </div>
                {c.body ? <p className="mt-1 text-sm text-noble-black/75">{c.body}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Actions */}
        {issue.actions.length > 0 ? (
          <div className="mt-3 space-y-1">
            <div className={fieldLabelCls}>Action items</div>
            <ol className="space-y-1">
              {issue.actions.map((a, i) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={a.done}
                    disabled={!canEdit || busy}
                    onChange={(e) => run(() => toggleIssueActionDoneAction(a.id, e.target.checked))}
                    className="mt-1"
                  />
                  <span className={a.done ? "text-noble-black/50 line-through" : "text-noble-black/85"}>
                    <span className="text-[var(--muted)]">{i + 1}.</span> {a.body}
                    {a.owner ? <span className="text-[11px] text-[var(--muted)]"> — {a.owner}</span> : null}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => run(() => deleteIssueActionItemAction(a.id))}
                      className="no-print ml-auto text-[11px] text-noble-red hover:underline"
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {/* Triage controls */}
        {canEdit ? (
          <div className="no-print mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
            <label className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
              Status
              <select
                defaultValue={issue.status}
                onChange={(e) => run(() => setIssueStatusAction(issue.id, e.target.value))}
                className={inputCls}
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={btnLight} onClick={() => setAdding("action")}>
              + Action
            </button>
            <button type="button" className={btnLight} onClick={() => setAdding("challenge")}>
              + Challenge
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this issue?")) run(() => deleteIssueAction(issue.id));
              }}
              className="ml-auto text-xs text-noble-red hover:underline"
            >
              Delete issue
            </button>
          </div>
        ) : null}

        {adding === "action" ? (
          <form
            action={(fd) => run(() => addIssueActionItemAction(issue.id, fd), () => setAdding(null))}
            className="no-print mt-2 flex flex-wrap items-end gap-2"
          >
            <label className="flex-1 min-w-[200px]">
              <span className={fieldLabelCls}>Action</span>
              <input name="body" className={`${inputCls} mt-1 block w-full`} placeholder="Specific next step…" />
            </label>
            <label>
              <span className={fieldLabelCls}>Owner</span>
              <input name="owner" className={`${inputCls} mt-1 block`} placeholder="name / role" />
            </label>
            <button type="submit" disabled={busy} className={btnDark}>
              Add
            </button>
          </form>
        ) : null}
        {adding === "challenge" ? (
          <form
            action={(fd) => run(() => addChallengeAction(issue.id, fd), () => setAdding(null))}
            className="no-print mt-2 space-y-2"
          >
            <input name="title" className={`${inputCls} block w-full`} placeholder="Challenge title" />
            <textarea name="body" rows={2} className={`${inputCls} block w-full`} placeholder="Why it's difficult…" />
            <button type="submit" disabled={busy} className={btnDark}>
              Add challenge
            </button>
          </form>
        ) : null}

        <SaveError message={err} />
      </div>
    </div>
  );
}

function ImportPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { run, busy, err } = useRun();
  const [showPrompt, setShowPrompt] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-noble-black">Import from Claude</h3>
        <button type="button" onClick={() => setShowPrompt((v) => !v)} className="text-xs text-noble-navy hover:underline">
          {showPrompt ? "Hide" : "Show"} the prompt to use
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Run your transcript through Claude with the prompt below, then paste the JSON it returns. New parts/issues are
        appended — your in-app edits are never overwritten.
      </p>
      {showPrompt ? (
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-[var(--surface)] p-2 text-[11px] whitespace-pre-wrap text-noble-black/80">
          {IMPORT_PROMPT}
        </pre>
      ) : null}
      <form action={(fd) => run(() => importIssuesAction(projectId, fd), onClose)} className="mt-2">
        <textarea
          name="json"
          rows={8}
          required
          placeholder='{ "parts": [ { "name": "...", "issues": [ ... ] } ] }'
          className={`${inputCls} block w-full font-mono text-xs`}
        />
        <SaveError message={err} />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnLight}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={btnDark}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddPartForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { run, busy, err } = useRun();
  return (
    <form
      action={(fd) => run(() => addPartAction(projectId, fd), onClose)}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[160px]">
          <span className={fieldLabelCls}>Part name</span>
          <input name="name" className={`${inputCls} mt-1 block w-full`} />
        </label>
        <label>
          <span className={fieldLabelCls}>Drawing #</span>
          <input name="drawingNumber" className={`${inputCls} mt-1 block`} />
        </label>
        <label>
          <span className={fieldLabelCls}>Rev</span>
          <input name="revision" className={`${inputCls} mt-1 block w-16`} />
        </label>
        <label>
          <span className={fieldLabelCls}>Cavities</span>
          <input type="number" min={0} name="cavities" className={`${inputCls} mt-1 block w-20`} />
        </label>
        <button type="submit" disabled={busy} className={btnDark}>
          Add part
        </button>
        <button type="button" onClick={onClose} className={btnLight}>
          Cancel
        </button>
      </div>
      <SaveError message={err} />
    </form>
  );
}

function AddIssueForm({
  projectId,
  parts,
  onClose,
}: {
  projectId: string;
  parts: PartView[];
  onClose: () => void;
}) {
  const { run, busy, err } = useRun();
  return (
    <form
      action={(fd) => run(() => addIssueAction(projectId, fd), onClose)}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className={fieldLabelCls}>Part</span>
          <select name="partId" className={`${inputCls} mt-1 block`}>
            <option value="">Cross-cutting</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabelCls}>Char #</span>
          <input name="charLabel" className={`${inputCls} mt-1 block w-24`} />
        </label>
        <label className="flex-1 min-w-[180px]">
          <span className={fieldLabelCls}>Title</span>
          <input name="title" required className={`${inputCls} mt-1 block w-full`} />
        </label>
        <label>
          <span className={fieldLabelCls}>Status</span>
          <select name="status" className={`${inputCls} mt-1 block`}>
            {ISSUE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabelCls}>Owner</span>
          <input name="owner" className={`${inputCls} mt-1 block w-28`} />
        </label>
      </div>
      <label className="mt-2 block">
        <span className={fieldLabelCls}>Synopsis</span>
        <input name="synopsis" className={`${inputCls} mt-1 block w-full`} placeholder="What's wrong and why it matters" />
      </label>
      <SaveError message={err} />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnLight}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={btnDark}>
          Add issue
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import {
  DEV_CHECKLIST_TEMPLATE,
  DEV_CONTACT_ROLES,
  deptLabel,
  deptShort,
} from "@/lib/dev-checklist";
import type { DevChecklist, DevTaskView } from "@/lib/dev-checklist-loader";
import {
  applyDevChecklistAction,
  updateDevTaskAction,
  toggleDevTaskAction,
  saveDevContactsAction,
} from "./dev-checklist-actions";

const DESC: Record<string, string> = Object.fromEntries(
  DEV_CHECKLIST_TEMPLATE.map((t) => [t.key, t.description])
);

const inputCls = "rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm";
const fieldLabelCls = "text-[10px] font-semibold uppercase tracking-wider text-noble-black/60";

function ProgressBar({ pct, tone = "navy" }: { pct: number; tone?: "navy" | "green" }) {
  const color = tone === "green" || pct >= 100 ? "bg-[#0F6E56]" : "bg-noble-navy";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-noble-stone/40">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DeptBadges({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <span className="ml-1 inline-flex gap-1 align-middle">
      {codes.map((c) => (
        <span
          key={c}
          title={deptLabel(c)}
          className="rounded-full bg-noble-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-noble-navy"
        >
          {deptShort(c)}
        </span>
      ))}
    </span>
  );
}

export function DevChecklistBlock({
  projectId,
  checklist,
  canEdit,
}: {
  projectId: string;
  checklist: DevChecklist;
  canEdit: boolean;
}) {
  const { phases, summary, contacts, empty } = checklist;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContacts, setEditingContacts] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(key: string, fn: () => Promise<void>, onDone?: () => void) {
    setErr(null);
    setBusyId(key);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusyId(null);
      }
    });
  }

  if (empty) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <p className="text-sm text-[var(--muted)]">
          This project has no manufacturing-development checklist yet.
        </p>
        {canEdit ? (
          <div className="no-print mt-3">
            <button
              type="button"
              onClick={() => run("apply", () => applyDevChecklistAction(projectId))}
              disabled={busyId === "apply"}
              className="rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-60"
            >
              {busyId === "apply" ? "Applying…" : "Apply standard checklist"}
            </button>
            <SaveError message={err} />
          </div>
        ) : null}
      </div>
    );
  }

  const contactList = DEV_CONTACT_ROLES.map((r) => ({ ...r, value: contacts[r.key] ?? "" }));
  const hasContacts = contactList.some((c) => c.value);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[180px] flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-noble-black">
                {summary.completed}/{summary.total} tasks complete
              </span>
              <span className="font-mono text-sm tabular-nums text-noble-black/70">{summary.pct}%</span>
            </div>
            <div className="mt-1">
              <ProgressBar pct={summary.pct} />
            </div>
          </div>
          <div className="text-xs text-[var(--muted)]">
            Current phase:{" "}
            <span className="font-medium text-noble-black">
              {summary.currentPhase
                ? `${summary.currentPhase} — ${
                    summary.byPhase.find((p) => p.phase === summary.currentPhase)?.name ?? ""
                  }`
                : "Complete"}
            </span>
          </div>
          {summary.overdue > 0 ? (
            <span className="rounded-full bg-noble-red/10 px-2 py-0.5 text-xs font-medium text-noble-red">
              {summary.overdue} overdue
            </span>
          ) : null}
        </div>
      </div>

      {/* Contacts */}
      {editingContacts ? (
        <form
          action={(fd) =>
            run("contacts", () => saveDevContactsAction(projectId, fd), () => setEditingContacts(false))
          }
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 p-3"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {contactList.map((c) => (
              <label key={c.key} className="block">
                <span className={fieldLabelCls}>{c.label}</span>
                <input name={c.key} defaultValue={c.value} className={`${inputCls} mt-1 block w-full`} />
              </label>
            ))}
          </div>
          <SaveError message={err} />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingContacts(false)}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyId === "contacts"}
              className="rounded-md bg-noble-red px-3 py-1 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
            >
              {busyId === "contacts" ? "Saving…" : "Save contacts"}
            </button>
          </div>
        </form>
      ) : hasContacts || canEdit ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs">
          {contactList
            .filter((c) => c.value)
            .map((c) => (
              <span key={c.key} className="text-[var(--muted)]">
                {c.label}: <span className="text-noble-black">{c.value}</span>
              </span>
            ))}
          {!hasContacts ? <span className="text-[var(--muted)]">No contacts set.</span> : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditingContacts(true)}
              className="no-print ml-auto text-[var(--muted)] hover:text-noble-black hover:underline"
            >
              Edit contacts
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Phases */}
      {phases.map((group) => {
        const ps = summary.byPhase.find((p) => p.phase === group.phase);
        return (
          <div key={group.phase} className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2">
              <h4 className="text-sm font-semibold text-noble-black">
                Phase {group.phase} — {group.name}
              </h4>
              <span className="text-xs text-[var(--muted)]">
                {ps?.completed}/{ps?.total}
              </span>
              <div className="ml-auto w-28">
                <ProgressBar pct={ps?.pct ?? 0} />
              </div>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-3 py-1.5 text-left font-semibold">Done</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Task</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Target</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Completed</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Dur.</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Notes</th>
                  {canEdit ? <th className="px-3 py-1.5 text-left font-semibold no-print">·</th> : null}
                </tr>
              </thead>
              <tbody>
                {group.tasks.map((task) =>
                  editingId === task.id ? (
                    <tr key={task.id} className="border-t border-[var(--border)]">
                      <td colSpan={canEdit ? 7 : 6} className="px-3 py-2">
                        <TaskEditForm
                          task={task}
                          busy={busyId === task.id}
                          error={err}
                          onCancel={() => {
                            setEditingId(null);
                            setErr(null);
                          }}
                          onSubmit={(fd) =>
                            run(task.id, () => updateDevTaskAction(task.id, fd), () =>
                              setEditingId(null)
                            )
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={task.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={task.complete}
                          disabled={!canEdit || busyId === task.id}
                          onChange={(e) =>
                            run(task.id, () => toggleDevTaskAction(task.id, e.target.checked))
                          }
                          aria-label={`Mark ${task.label} complete`}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className={task.complete ? "text-noble-black/50 line-through" : "text-noble-black"}>
                          {task.label}
                        </span>
                        <DeptBadges codes={task.departments} />
                        {DESC[task.key] ? (
                          <span className="ml-1 cursor-help text-[var(--muted)]" title={DESC[task.key]}>
                            ⓘ
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className={task.overdue ? "text-noble-red" : ""}>{task.targetIso ?? "—"}</span>
                        {task.overdue ? (
                          <span className="ml-1 text-[11px] text-noble-red">overdue</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top">{task.completionIso ?? "—"}</td>
                      <td className="px-3 py-2 align-top">{task.durationDays ?? "—"}</td>
                      <td className="px-3 py-2 align-top text-[var(--muted)]">{task.notes ?? "—"}</td>
                      {canEdit ? (
                        <td className="px-3 py-2 align-top no-print">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(task.id);
                              setErr(null);
                            }}
                            className="text-xs text-noble-black/70 hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function TaskEditForm({
  task,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  task: DevTaskView;
  busy: boolean;
  error: string | null;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/50 p-3"
    >
      <div className="text-sm font-medium text-noble-black">
        {task.label}
        <DeptBadges codes={task.departments} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className={fieldLabelCls}>Target date</span>
          <input type="date" name="targetDate" defaultValue={task.targetIso ?? ""} className={`${inputCls} mt-1 block`} />
        </label>
        <label>
          <span className={fieldLabelCls}>Completion date</span>
          <input
            type="date"
            name="completionDate"
            defaultValue={task.completionIso ?? ""}
            className={`${inputCls} mt-1 block`}
          />
        </label>
        <label>
          <span className={fieldLabelCls}>Duration (days)</span>
          <input
            type="number"
            min={0}
            name="durationDays"
            defaultValue={task.durationDays ?? ""}
            className={`${inputCls} mt-1 block w-24`}
          />
        </label>
        <label className="min-w-[200px] flex-1">
          <span className={fieldLabelCls}>Notes</span>
          <input name="notes" defaultValue={task.notes ?? ""} className={`${inputCls} mt-1 block w-full`} />
        </label>
      </div>
      <SaveError message={error} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-noble-red px-3 py-1 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

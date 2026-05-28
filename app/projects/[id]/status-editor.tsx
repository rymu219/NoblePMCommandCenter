"use client";

import { useState, useTransition } from "react";
import { saveStatusUpdateAction } from "./status-actions";
import {
  BUDGET_CONFIDENCE,
  COMMON_BLOCK_HEADINGS,
  OWNER_DEPTS,
  SCHEDULE_CONFIDENCE,
  STATUS_LABELS,
  type StatusBlock,
} from "@/lib/status";

interface BlockEdit extends StatusBlock {
  id: number;
}
interface ActionEdit {
  id: number;
  ownerDept: string;
  body: string;
  dueDate: string;
}

interface Props {
  projectId: string;
  defaultStatusLabel?: string;
  defaultQualifier?: string;
  defaultReportDate?: string; // yyyy-mm-dd
}

let _id = 1;
const nextId = () => _id++;

export function StatusEditor({
  projectId,
  defaultStatusLabel,
  defaultQualifier,
  defaultReportDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(defaultStatusLabel ?? "in_progress");
  const [qualifier, setQualifier] = useState(defaultQualifier ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(defaultReportDate ?? today);
  const [scheduleConfidence, setScheduleConfidence] = useState("");
  const [budgetConfidence, setBudgetConfidence] = useState("");
  const [nextMilestone, setNextMilestone] = useState("");
  const [nextMilestoneDate, setNextMilestoneDate] = useState("");
  const [topFocus, setTopFocus] = useState("");
  const [blocks, setBlocks] = useState<BlockEdit[]>([
    { id: nextId(), heading: "Update", body: "" },
  ]);
  const [actions, setActions] = useState<ActionEdit[]>([]);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addBlock(heading: string) {
    setBlocks((bs) => [...bs, { id: nextId(), heading, body: "" }]);
  }
  function updateBlock(id: number, patch: Partial<BlockEdit>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function removeBlock(id: number) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
  }

  function addAction() {
    setActions((as) => [
      ...as,
      { id: nextId(), ownerDept: "engineering", body: "", dueDate: "" },
    ]);
  }
  function updateAction(id: number, patch: Partial<ActionEdit>) {
    setActions((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function removeAction(id: number) {
    setActions((as) => as.filter((a) => a.id !== id));
  }

  function submit() {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("statusLabel", label);
    fd.set("statusQualifier", qualifier);
    fd.set("reportDate", reportDate);
    fd.set("scheduleConfidence", scheduleConfidence);
    fd.set("budgetConfidence", budgetConfidence);
    fd.set("nextMilestone", nextMilestone);
    fd.set("nextMilestoneDate", nextMilestoneDate);
    fd.set("topFocus", topFocus);
    fd.set(
      "payload",
      JSON.stringify({
        blocks: blocks
          .filter((b) => b.heading.trim() || b.body.trim())
          .map((b) => ({ heading: b.heading.trim(), body: b.body })),
        actionItems: actions
          .filter((a) => a.body.trim())
          .map((a) => ({
            ownerDept: a.ownerDept,
            body: a.body,
            dueDate: a.dueDate || null,
          })),
      })
    );
    startTransition(async () => {
      try {
        await saveStatusUpdateAction(projectId, fd);
        setOpen(false);
        setBlocks([{ id: nextId(), heading: "Update", body: "" }]);
        setActions([]);
        setScheduleConfidence("");
        setBudgetConfidence("");
        setNextMilestone("");
        setNextMilestoneDate("");
        setTopFocus("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85"
      >
        + New status update
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-white p-4">
      <div className="flex items-end gap-3">
        <label className="block flex-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
            Status
          </span>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          >
            {STATUS_LABELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.display}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-[2]">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
            Qualifier (free text)
          </span>
          <input
            value={qualifier}
            onChange={(e) => setQualifier(e.target.value)}
            placeholder="Structured Delay / External Pressure + Info Gap / etc."
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
            Date
          </span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {/* Skeleton header — fast structured fields that drive the dashboard. */}
      <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-3">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
          Quick read <span className="font-normal normal-case text-[var(--muted)]">— ~15s, powers the dashboard</span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
              Schedule
            </span>
            <select
              value={scheduleConfidence}
              onChange={(e) => setScheduleConfidence(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
            >
              <option value="">— not set —</option>
              {SCHEDULE_CONFIDENCE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.display}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
              Budget
            </span>
            <select
              value={budgetConfidence}
              onChange={(e) => setBudgetConfidence(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
            >
              <option value="">— not set —</option>
              {BUDGET_CONFIDENCE.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.display}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
              Next milestone
            </span>
            <input
              value={nextMilestone}
              onChange={(e) => setNextMilestone(e.target.value)}
              placeholder="Mold ship / First article…"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
              Milestone date
            </span>
            <input
              type="date"
              value={nextMilestoneDate}
              onChange={(e) => setNextMilestoneDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
            Top focus / blocker
          </span>
          <input
            value={topFocus}
            onChange={(e) => setTopFocus(e.target.value)}
            placeholder="One line — the single thing that matters most right now."
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {blocks.map((b) => (
          <div key={b.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-2">
            <div className="flex items-center gap-2">
              <input
                value={b.heading}
                onChange={(e) => updateBlock(b.id, { heading: e.target.value })}
                placeholder="Block heading"
                className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wider"
              />
              <span className="text-[10px] text-[var(--muted)]">quick-pick →</span>
              <div className="flex flex-wrap gap-1">
                {COMMON_BLOCK_HEADINGS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => updateBlock(b.id, { heading: h })}
                    className="rounded-full bg-white px-2 py-0.5 text-[10px] text-noble-black/70 ring-1 ring-[var(--border)] hover:bg-noble-stone/40"
                  >
                    {h}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeBlock(b.id)}
                className="ml-auto text-xs text-noble-red hover:underline"
              >
                Remove
              </button>
            </div>
            <textarea
              value={b.body}
              onChange={(e) => updateBlock(b.id, { body: e.target.value })}
              placeholder="Lines starting with - or • render as bullets. Plain lines render as paragraphs."
              rows={3}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm leading-relaxed"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => addBlock("")}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-noble-black/80 hover:bg-noble-stone/40"
        >
          + Add block
        </button>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
          Action items
        </div>
        <div className="mt-2 space-y-2">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <select
                value={a.ownerDept}
                onChange={(e) => updateAction(a.id, { ownerDept: e.target.value })}
                className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
              >
                {OWNER_DEPTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.display}
                  </option>
                ))}
              </select>
              <input
                value={a.body}
                onChange={(e) => updateAction(a.id, { body: e.target.value })}
                placeholder="Action item…"
                className="flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={a.dueDate}
                onChange={(e) => updateAction(a.id, { dueDate: e.target.value })}
                className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeAction(a.id)}
                className="text-xs text-noble-red hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAction}
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-noble-black/80 hover:bg-noble-stone/40"
          >
            + Add action item
          </button>
        </div>
      </div>

      {err ? (
        <p className="mt-3 rounded-md bg-noble-red/10 px-3 py-1.5 text-xs text-noble-red">
          {err}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save status update"}
        </button>
      </div>
    </div>
  );
}

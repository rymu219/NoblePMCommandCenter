"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import {
  QUALITY_CATEGORIES,
  QUALITY_METHODS,
  QUALITY_SLIP_REASONS,
  categoryLabel,
  methodLabel,
  slipReasonLabel,
} from "@/lib/quality";
import type { QualityRow } from "@/lib/quality-loader";
import {
  createQualityInspectionAction,
  updateQualityInspectionAction,
  completeQualityInspectionAction,
  reopenQualityInspectionAction,
  deleteQualityInspectionAction,
} from "./quality-actions";

const inputCls =
  "rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm";
const cellCls = "px-3 py-2 align-top";
const headCls =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-noble-black/60";
const fieldLabelCls =
  "text-[10px] font-semibold uppercase tracking-wider text-noble-black/60";

interface FormInitial {
  item: string;
  category: string;
  method: string;
  targetIso: string;
  estDurationDays: string;
}

/**
 * Add / edit form for one inspection. On edit, if the target date moves away
 * from its original value (and a baseline exists), a standard slip reason is
 * required — mirroring the milestone replan capture.
 */
function InspectionForm({
  mode,
  initial,
  hasBaseline,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "add" | "edit";
  initial: FormInitial;
  hasBaseline: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (fd: FormData) => void;
  onCancel?: () => void;
}) {
  const [item, setItem] = useState(initial.item);
  const [category, setCategory] = useState(initial.category);
  const [method, setMethod] = useState(initial.method);
  const [target, setTarget] = useState(initial.targetIso);
  const [est, setEst] = useState(initial.estDurationDays);
  const [slipReason, setSlipReason] = useState("");
  const [slipNote, setSlipNote] = useState("");

  const targetMoved =
    mode === "edit" && hasBaseline && target !== "" && target !== initial.targetIso;

  function submit() {
    const fd = new FormData();
    fd.set("item", item);
    fd.set("category", category);
    fd.set("method", method);
    fd.set("targetDate", target);
    fd.set("estDurationDays", est);
    if (targetMoved) {
      fd.set("slipReason", slipReason);
      fd.set("slipNote", slipNote);
    }
    onSubmit(fd);
  }

  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[180px]">
          <span className={fieldLabelCls}>Item</span>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="What is being inspected…"
            className={`${inputCls} mt-1 block w-full`}
          />
        </label>
        <label>
          <span className={fieldLabelCls}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputCls} mt-1 block`}
          >
            <option value="" disabled>
              Pick…
            </option>
            {QUALITY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabelCls}>Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`${inputCls} mt-1 block`}
          >
            <option value="" disabled>
              Pick…
            </option>
            {QUALITY_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabelCls}>Target date</span>
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`${inputCls} mt-1 block`}
          />
        </label>
        <label>
          <span className={fieldLabelCls}>Est. (days)</span>
          <input
            type="number"
            min={0}
            value={est}
            onChange={(e) => setEst(e.target.value)}
            className={`${inputCls} mt-1 block w-24`}
          />
        </label>
      </div>

      {targetMoved ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-[#BA7517]/10 p-2">
          <label>
            <span className={fieldLabelCls}>
              Reason for the date change
            </span>
            <select
              value={slipReason}
              onChange={(e) => setSlipReason(e.target.value)}
              required
              className={`${inputCls} mt-1 block`}
            >
              <option value="" disabled>
                Pick a reason…
              </option>
              {QUALITY_SLIP_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 min-w-[200px]">
            <span className={fieldLabelCls}>Note (optional)</span>
            <input
              value={slipNote}
              onChange={(e) => setSlipNote(e.target.value)}
              placeholder="Context for the slip…"
              className={`${inputCls} mt-1 block w-full`}
            />
          </label>
        </div>
      ) : null}

      <SaveError message={error} />

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy || (targetMoved && !slipReason)}
          className="rounded-md bg-noble-red px-3 py-1 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
        >
          {busy ? "Saving…" : mode === "add" ? "Add inspection" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span className="rounded-full bg-noble-stone/60 px-2 py-0.5 text-[11px] font-medium text-noble-black/80">
      {categoryLabel(category)}
    </span>
  );
}

function MethodPill({ method }: { method: string }) {
  return (
    <span className="rounded-full bg-noble-navy/10 px-2 py-0.5 text-[11px] font-medium text-noble-navy">
      {methodLabel(method)}
    </span>
  );
}

function SlipBadge({ row }: { row: QualityRow }) {
  if (!row.slipReason) return null;
  return (
    <span
      title={row.slipNote ?? undefined}
      className="rounded-full bg-[#BA7517]/15 px-2 py-0.5 text-[11px] font-medium text-[#BA7517]"
    >
      {slipReasonLabel(row.slipReason)}
      {row.slipDays && row.slipDays > 0 ? ` · +${row.slipDays}d` : ""}
    </span>
  );
}

export function QualityBoard({
  active,
  completed,
  canEdit,
}: {
  active: QualityRow[];
  completed: QualityRow[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // "add" | row id
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

  return (
    <div className="space-y-6">
      {/* Active inspections — admin-populated. */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-sm font-semibold text-noble-black">
            Active inspections
          </h3>
          {canEdit && !adding ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setErr(null);
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
            >
              + Add inspection
            </button>
          ) : null}
        </div>

        {active.length === 0 && !adding ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">
            No active inspections.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className={headCls}>Item</th>
                <th className={headCls}>Category</th>
                <th className={headCls}>Method</th>
                <th className={headCls}>Target</th>
                <th className={headCls}>Est. (d)</th>
                <th className={headCls}>Slip</th>
                {canEdit ? <th className={headCls}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {active.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className={cellCls} colSpan={canEdit ? 7 : 6}>
                      <InspectionForm
                        mode="edit"
                        hasBaseline={row.baselineIso !== null}
                        initial={{
                          item: row.item,
                          category: row.category ?? "",
                          method: row.method,
                          targetIso: row.targetIso ?? "",
                          estDurationDays:
                            row.estDurationDays != null
                              ? String(row.estDurationDays)
                              : "",
                        }}
                        busy={busyId === row.id}
                        error={err}
                        onCancel={() => {
                          setEditingId(null);
                          setErr(null);
                        }}
                        onSubmit={(fd) =>
                          run(
                            row.id,
                            () => updateQualityInspectionAction(row.id, fd),
                            () => setEditingId(null)
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className={`${cellCls} font-medium text-noble-black`}>
                      {row.item}
                    </td>
                    <td className={cellCls}>
                      <CategoryPill category={row.category} />
                    </td>
                    <td className={cellCls}>
                      <MethodPill method={row.method} />
                    </td>
                    <td className={cellCls}>
                      <span className={row.overdue ? "text-noble-red" : ""}>
                        {row.targetIso ?? "—"}
                      </span>
                      {row.overdue ? (
                        <span className="ml-1 text-[11px] text-noble-red">
                          overdue
                        </span>
                      ) : null}
                    </td>
                    <td className={cellCls}>{row.estDurationDays ?? "—"}</td>
                    <td className={cellCls}>
                      <SlipBadge row={row} />
                    </td>
                    {canEdit ? (
                      <td className={cellCls}>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              run(row.id, () =>
                                completeQualityInspectionAction(row.id)
                              )
                            }
                            disabled={busyId === row.id}
                            className="font-medium text-[#0F6E56] hover:underline disabled:opacity-60"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setAdding(false);
                              setErr(null);
                            }}
                            className="text-noble-black/70 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(`Delete inspection "${row.item}"?`)
                              )
                                run(row.id, () =>
                                  deleteQualityInspectionAction(row.id)
                                );
                            }}
                            disabled={busyId === row.id}
                            className="text-noble-red hover:underline disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              )}
              {adding ? (
                <tr>
                  <td className={cellCls} colSpan={canEdit ? 7 : 6}>
                    <InspectionForm
                      mode="add"
                      hasBaseline={false}
                      initial={{
                        item: "",
                        category: "",
                        method: "",
                        targetIso: "",
                        estDurationDays: "",
                      }}
                      busy={busyId === "add"}
                      error={err}
                      onCancel={() => {
                        setAdding(false);
                        setErr(null);
                      }}
                      onSubmit={(fd) =>
                        run(
                          "add",
                          () => createQualityInspectionAction(fd),
                          () => setAdding(false)
                        )
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {/* Completed inspections — archive. */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-sm font-semibold text-noble-black">
            Completed inspections
          </h3>
        </div>
        {completed.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">
            Nothing completed yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className={headCls}>Item</th>
                <th className={headCls}>Category</th>
                <th className={headCls}>Method</th>
                <th className={headCls}>Target</th>
                <th className={headCls}>Completed</th>
                <th className={headCls}>Result</th>
                <th className={headCls}>Why it slipped</th>
                {canEdit ? <th className={headCls}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {completed.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className={`${cellCls} font-medium text-noble-black`}>
                    {row.item}
                  </td>
                  <td className={cellCls}>
                    <CategoryPill category={row.category} />
                  </td>
                  <td className={cellCls}>
                    <MethodPill method={row.method} />
                  </td>
                  <td className={cellCls}>{row.targetIso ?? "—"}</td>
                  <td className={cellCls}>{row.completedIso ?? "—"}</td>
                  <td className={cellCls}>
                    {row.lateDays == null ? (
                      "—"
                    ) : row.lateDays > 0 ? (
                      <span className="text-noble-red">+{row.lateDays}d late</span>
                    ) : (
                      <span className="text-[#0F6E56]">on time</span>
                    )}
                  </td>
                  <td className={cellCls}>
                    {row.slipReason ? (
                      <div>
                        <SlipBadge row={row} />
                        {row.slipNote ? (
                          <div className="mt-1 text-[11px] text-[var(--muted)]">
                            {row.slipNote}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  {canEdit ? (
                    <td className={cellCls}>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            run(row.id, () =>
                              reopenQualityInspectionAction(row.id)
                            )
                          }
                          disabled={busyId === row.id}
                          className="text-noble-black/70 hover:underline disabled:opacity-60"
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete inspection "${row.item}"?`))
                              run(row.id, () =>
                                deleteQualityInspectionAction(row.id)
                              );
                          }}
                          disabled={busyId === row.id}
                          className="text-noble-red hover:underline disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import { ProjectCombobox, type ProjectOption } from "@/components/project-combobox";
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
  rescheduleQualityInspectionAction,
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

// --- Sorting ----------------------------------------------------------------

type SortKey =
  | "item"
  | "project"
  | "category"
  | "method"
  | "target"
  | "est"
  | "slip"
  | "completed"
  | "result";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

/** Comparable value for a column; null sorts last regardless of direction. */
function valueFor(row: QualityRow, key: SortKey): string | number | null {
  switch (key) {
    case "item":
      return row.item.toLowerCase();
    case "project":
      return row.projectId;
    case "category":
      return row.category ? categoryLabel(row.category).toLowerCase() : null;
    case "method":
      return methodLabel(row.method).toLowerCase();
    case "target":
      return row.targetIso;
    case "est":
      return row.estDurationDays;
    case "slip":
      return row.slipDays;
    case "completed":
      return row.completedIso;
    case "result":
      return row.lateDays;
  }
}

function sortRows(rows: QualityRow[], sort: SortState | null): QualityRow[] {
  if (!sort) return rows;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = valueFor(a, sort.key);
    const bv = valueFor(b, sort.key);
    if (av === null && bv === null) return 0;
    if (av === null) return 1; // nulls last
    if (bv === null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

function SortHeader({
  label,
  colKey,
  sort,
  onSort,
}: {
  label: string;
  colKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === colKey;
  const arrow = active ? (sort?.dir === "asc" ? "▲" : "▼") : "↕";
  return (
    <th className={headCls}>
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className="inline-flex items-center gap-1 hover:text-noble-black"
      >
        {label}
        <span className={active ? "text-noble-black/70" : "text-noble-black/25"}>{arrow}</span>
      </button>
    </th>
  );
}

// --- Forms ------------------------------------------------------------------

interface FormInitial {
  item: string;
  projectId: string | null;
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
  projects,
  hasBaseline,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "add" | "edit";
  initial: FormInitial;
  projects: ProjectOption[];
  hasBaseline: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (fd: FormData) => void;
  onCancel?: () => void;
}) {
  const [item, setItem] = useState(initial.item);
  const [projectId, setProjectId] = useState<string | null>(initial.projectId);
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
    fd.set("projectId", projectId ?? "");
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
        <label className="min-w-[220px]">
          <span className={fieldLabelCls}>Project (optional)</span>
          <div className="mt-1">
            <ProjectCombobox projects={projects} value={projectId} onChange={setProjectId} />
          </div>
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
        <SlipReasonFields
          reason={slipReason}
          note={slipNote}
          onReason={setSlipReason}
          onNote={setSlipNote}
        />
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

/** Standard slip reason + optional note, shown whenever a target date moves. */
function SlipReasonFields({
  reason,
  note,
  onReason,
  onNote,
}: {
  reason: string;
  note: string;
  onReason: (v: string) => void;
  onNote: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md bg-[#BA7517]/10 p-2">
      <label>
        <span className={fieldLabelCls}>Reason for the date change</span>
        <select
          value={reason}
          onChange={(e) => onReason(e.target.value)}
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
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Context for the slip…"
          className={`${inputCls} mt-1 block w-full`}
        />
      </label>
    </div>
  );
}

/**
 * Focused reschedule: just the new target date (+ a required reason once the
 * inspection has an established baseline). Faster than the full edit form.
 */
function RescheduleForm({
  initialTarget,
  hasBaseline,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initialTarget: string;
  hasBaseline: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const moved = target !== "" && target !== initialTarget;
  const needsReason = hasBaseline && moved;

  function submit() {
    const fd = new FormData();
    fd.set("targetDate", target);
    if (needsReason) {
      fd.set("slipReason", reason);
      fd.set("slipNote", note);
    }
    onSubmit(fd);
  }

  return (
    <div className="space-y-2 rounded-md border border-[#BA7517]/40 bg-[#BA7517]/5 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className={fieldLabelCls}>New target date</span>
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`${inputCls} mt-1 block`}
          />
        </label>
        {needsReason ? (
          <SlipReasonFields reason={reason} note={note} onReason={setReason} onNote={setNote} />
        ) : (
          <span className="pb-1 text-[11px] text-[var(--muted)]">
            {hasBaseline ? "Pick a later/earlier date." : "Sets the first committed date (no slip)."}
          </span>
        )}
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
          type="button"
          onClick={submit}
          disabled={busy || !moved || (needsReason && !reason)}
          className="rounded-md bg-[#BA7517] px-3 py-1 text-xs font-medium text-white hover:bg-[#BA7517]/85 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Reschedule"}
        </button>
      </div>
    </div>
  );
}

// --- Cells ------------------------------------------------------------------

function ProjectCell({ row }: { row: QualityRow }) {
  if (!row.projectId) return <span className="text-[var(--muted)]">—</span>;
  return (
    <div className="leading-tight">
      <span className="font-mono text-[11px] text-noble-navy">{row.projectId}</span>
      {row.projectName ? (
        <div className="text-[11px] text-noble-black/70">{row.projectName}</div>
      ) : null}
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

// --- Board ------------------------------------------------------------------

export function QualityBoard({
  active,
  completed,
  projects,
  canEdit,
}: {
  active: QualityRow[];
  completed: QualityRow[];
  projects: ProjectOption[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // "add" | row id
  const [, startTransition] = useTransition();

  const [activeSort, setActiveSort] = useState<SortState | null>(null);
  const [completedSort, setCompletedSort] = useState<SortState | null>(null);

  const sortedActive = useMemo(() => sortRows(active, activeSort), [active, activeSort]);
  const sortedCompleted = useMemo(
    () => sortRows(completed, completedSort),
    [completed, completedSort]
  );

  function toggleSort(current: SortState | null, key: SortKey): SortState {
    if (current?.key === key) {
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    }
    return { key, dir: "asc" };
  }

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

  const activeColSpan = canEdit ? 8 : 7;

  return (
    <div className="space-y-6">
      {/* Active inspections — admin-populated. */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-sm font-semibold text-noble-black">Active inspections</h3>
          {canEdit && !adding ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setReschedulingId(null);
                setErr(null);
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
            >
              + Add inspection
            </button>
          ) : null}
        </div>

        {active.length === 0 && !adding ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">No active inspections.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <SortHeader label="Item" colKey="item" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Project" colKey="project" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Category" colKey="category" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Method" colKey="method" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Target" colKey="target" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Est. (d)" colKey="est" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                <SortHeader label="Slip" colKey="slip" sort={activeSort} onSort={(k) => setActiveSort(toggleSort(activeSort, k))} />
                {canEdit ? <th className={headCls}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedActive.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className={cellCls} colSpan={activeColSpan}>
                      <InspectionForm
                        mode="edit"
                        projects={projects}
                        hasBaseline={row.baselineIso !== null}
                        initial={{
                          item: row.item,
                          projectId: row.projectId,
                          category: row.category ?? "",
                          method: row.method,
                          targetIso: row.targetIso ?? "",
                          estDurationDays:
                            row.estDurationDays != null ? String(row.estDurationDays) : "",
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
                ) : reschedulingId === row.id ? (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className={cellCls} colSpan={activeColSpan}>
                      <RescheduleForm
                        initialTarget={row.targetIso ?? ""}
                        hasBaseline={row.baselineIso !== null}
                        busy={busyId === row.id}
                        error={err}
                        onCancel={() => {
                          setReschedulingId(null);
                          setErr(null);
                        }}
                        onSubmit={(fd) =>
                          run(
                            row.id,
                            () => rescheduleQualityInspectionAction(row.id, fd),
                            () => setReschedulingId(null)
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                    <td className={`${cellCls} font-medium text-noble-black`}>{row.item}</td>
                    <td className={cellCls}>
                      <ProjectCell row={row} />
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
                        <span className="ml-1 text-[11px] text-noble-red">overdue</span>
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
                              run(row.id, () => completeQualityInspectionAction(row.id))
                            }
                            disabled={busyId === row.id}
                            className="font-medium text-[#0F6E56] hover:underline disabled:opacity-60"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReschedulingId(row.id);
                              setEditingId(null);
                              setAdding(false);
                              setErr(null);
                            }}
                            className="text-[#BA7517] hover:underline"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setReschedulingId(null);
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
                              if (confirm(`Delete inspection "${row.item}"?`))
                                run(row.id, () => deleteQualityInspectionAction(row.id));
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
                  <td className={cellCls} colSpan={activeColSpan}>
                    <InspectionForm
                      mode="add"
                      projects={projects}
                      hasBaseline={false}
                      initial={{
                        item: "",
                        projectId: null,
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
                        run("add", () => createQualityInspectionAction(fd), () => setAdding(false))
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
          <h3 className="text-sm font-semibold text-noble-black">Completed inspections</h3>
        </div>
        {completed.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">Nothing completed yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <SortHeader label="Item" colKey="item" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Project" colKey="project" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Category" colKey="category" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Method" colKey="method" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Target" colKey="target" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Completed" colKey="completed" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <SortHeader label="Result" colKey="result" sort={completedSort} onSort={(k) => setCompletedSort(toggleSort(completedSort, k))} />
                <th className={headCls}>Why it slipped</th>
                {canEdit ? <th className={headCls}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedCompleted.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                  <td className={`${cellCls} font-medium text-noble-black`}>{row.item}</td>
                  <td className={cellCls}>
                    <ProjectCell row={row} />
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
                            run(row.id, () => reopenQualityInspectionAction(row.id))
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
                              run(row.id, () => deleteQualityInspectionAction(row.id));
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

"use client";

import { useTransition, useState, useRef } from "react";
import { saveCellAction, saveNoteAction } from "./time-actions";

interface RowData {
  projectId: string;
  projectName: string;
  hours: number[];
}

interface Props {
  rows: RowData[];
  dayHeaders: string[];
  dayDateIsos: string[];
  weekStartIso: string;
  noteByProject: Record<string, string>;
  dayTotals: number[];
  grandTotal: number;
  disabled: boolean;
}

export function WeekGrid({
  rows,
  dayHeaders,
  dayDateIsos,
  weekStartIso,
  noteByProject,
  dayTotals,
  grandTotal,
  disabled,
}: Props) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-noble-black text-white">
            <th className="px-3 py-2 text-left text-xs font-medium">
              Project #
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium">
              Project Name
            </th>
            {dayHeaders.map((h) => (
              <th key={h} className="px-2 py-2 text-right text-xs font-medium">
                {h}
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs font-medium">Total</th>
            <th className="px-3 py-2 text-left text-xs font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row
              key={r.projectId}
              row={r}
              dayDateIsos={dayDateIsos}
              weekStartIso={weekStartIso}
              note={noteByProject[r.projectId] ?? ""}
              disabled={disabled}
            />
          ))}
          <tr className="border-t-2 border-noble-black/40 bg-noble-stone/30 text-sm font-medium">
            <td className="px-3 py-2" colSpan={2}>
              Day total
            </td>
            {dayTotals.map((t, i) => (
              <td
                key={i}
                className="px-2 py-2 text-right font-mono tabular-nums"
              >
                {t}
              </td>
            ))}
            <td className="px-3 py-2 text-right font-mono tabular-nums">
              {grandTotal}
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  dayDateIsos,
  weekStartIso,
  note,
  disabled,
}: {
  row: RowData;
  dayDateIsos: string[];
  weekStartIso: string;
  note: string;
  disabled: boolean;
}) {
  const [cells, setCells] = useState<number[]>(row.hours);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState<number | null>(null);
  const total = cells.reduce((a, b) => a + b, 0);

  function saveCell(i: number, value: number) {
    setSaving(i);
    const fd = new FormData();
    fd.set("projectId", row.projectId);
    fd.set("date", dayDateIsos[i]);
    fd.set("hours", String(value));
    startTransition(async () => {
      try {
        await saveCellAction(fd);
      } catch (e) {
        // revert UI on failure
        setCells((prev) => {
          const next = [...prev];
          next[i] = row.hours[i];
          return next;
        });
        const msg = e instanceof Error ? e.message : "Save failed.";
        alert(msg);
      } finally {
        setSaving(null);
      }
    });
  }

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface)]/40">
      <td className="px-3 py-1.5 font-mono text-xs tracking-wider">
        {row.projectId}
      </td>
      <td className="px-3 py-1.5 text-sm text-noble-navy">
        {row.projectName}
      </td>
      {cells.map((v, i) => (
        <td
          key={i}
          className="px-2 py-1.5 text-right font-mono text-xs tabular-nums"
        >
          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            disabled={disabled}
            defaultValue={v || ""}
            onBlur={(e) => {
              const next = parseFloat(e.currentTarget.value) || 0;
              if (next === cells[i]) return;
              setCells((prev) => {
                const out = [...prev];
                out[i] = next;
                return out;
              });
              saveCell(i, next);
            }}
            className={`w-16 rounded-md border px-2 py-1 text-right focus:bg-white focus:outline-none ${
              saving === i
                ? "border-noble-red/60"
                : "border-transparent focus:border-[var(--border-strong)] bg-transparent"
            } disabled:opacity-60`}
          />
        </td>
      ))}
      <td className="bg-[var(--surface)]/60 px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums">
        {total}
      </td>
      <td className="px-3 py-1.5">
        <NoteInput
          projectId={row.projectId}
          weekStartIso={weekStartIso}
          initialNote={note}
          disabled={disabled}
        />
      </td>
    </tr>
  );
}

function NoteInput({
  projectId,
  weekStartIso,
  initialNote,
  disabled,
}: {
  projectId: string;
  weekStartIso: string;
  initialNote: string;
  disabled: boolean;
}) {
  const [, startTransition] = useTransition();
  const last = useRef(initialNote);
  return (
    <input
      type="text"
      defaultValue={initialNote}
      placeholder="…"
      disabled={disabled}
      onBlur={(e) => {
        const v = e.currentTarget.value;
        if (v === last.current) return;
        last.current = v;
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("weekStart", weekStartIso);
        fd.set("note", v);
        startTransition(async () => {
          try {
            await saveNoteAction(fd);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed.";
            alert(msg);
          }
        });
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs focus:border-[var(--border-strong)] focus:bg-white focus:outline-none disabled:opacity-60"
    />
  );
}

"use client";

import { useState } from "react";
import type { SequentialStep } from "@/lib/types";
import { buildGanttLegend } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";
import { Legend } from "./legend";

interface Row extends SequentialStep {
  id: number;
  color: string;
  category: string;
  hatch: boolean;
}

let _id = 1;
const nextId = () => _id++;

// Defaults derived from the legacy kind so existing steps edit cleanly.
function stepColorOf(s: SequentialStep): string {
  if (s.color) return s.color;
  if (s.kind === "quality") return "#993C1D";
  if (s.kind === "cure") return "#888780";
  return "#BA7517"; // process / setup
}
function stepCategoryOf(s: SequentialStep): string {
  if (s.category) return s.category;
  if (s.kind === "quality") return "Quality";
  if (s.kind === "cure") return "Cure hold";
  return "Process";
}

interface Props {
  initial: {
    totalDays: number;
    workingStartHour: number;
    workingEndHour: number;
    steps: SequentialStep[];
  };
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function GanttDetailEditor({ initial, submit, busy, cancel }: Props) {
  const [totalDays, setTotalDays] = useState(initial.totalDays || 3);
  const [startHour, setStartHour] = useState(initial.workingStartHour || 8);
  const [endHour, setEndHour] = useState(initial.workingEndHour || 17);
  const [rows, setRows] = useState<Row[]>(
    initial.steps.length
      ? initial.steps.map((s) => ({
          ...s,
          id: nextId(),
          color: stepColorOf(s),
          category: stepCategoryOf(s),
          hatch: s.kind === "cure",
        }))
      : [
          {
            id: nextId(),
            label: "",
            startHour: 0,
            durationHours: 1,
            color: "#BA7517",
            category: "Process",
            hatch: false,
          },
        ]
  );

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function add() {
    const last = rows[rows.length - 1];
    setRows((rs) => [
      ...rs,
      {
        id: nextId(),
        label: "",
        startHour: last ? last.startHour + last.durationHours : 0,
        durationHours: 1,
        color: last?.color ?? "#BA7517",
        category: last?.category ?? "Process",
        hatch: false,
      },
    ]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Gantt — sequential detail (hour scale)
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-noble-black/80">
        <label className="inline-flex items-center gap-2">
          Total days
          <input
            type="number"
            min={1}
            max={31}
            step={1}
            value={totalDays}
            onChange={(e) => setTotalDays(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2">
          Working start (0-23)
          <input
            type="number"
            min={0}
            max={23}
            step={1}
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="w-16 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2">
          Working end (0-23)
          <input
            type="number"
            min={0}
            max={23}
            step={1}
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className="w-16 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
          />
        </label>
      </div>

      <div className="mt-4 text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
        Steps
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Hours are counted from day-1 working start. Cure cycles can overlap with
        the next step's prep.
      </p>

      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_120px_44px_auto_90px_90px_auto] items-center gap-2"
          >
            <input
              value={r.label}
              onChange={(e) => update(r.id, { label: e.target.value })}
              placeholder="Step label"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              value={r.category}
              onChange={(e) => update(r.id, { category: e.target.value })}
              placeholder="Category / dept"
              title="Legend label for this color"
              disabled={r.hatch}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs disabled:opacity-50"
              style={{ borderLeftColor: r.color, borderLeftWidth: 4 }}
            />
            <input
              type="color"
              value={r.color}
              onChange={(e) => update(r.id, { color: e.target.value })}
              title="Step color"
              className="h-7 w-full cursor-pointer rounded-md border border-[var(--border)] bg-white p-0.5"
            />
            <label
              className="inline-flex items-center gap-1 text-[11px] text-noble-black/70"
              title="Render as a hatched mold-in-press / cure band"
            >
              <input
                type="checkbox"
                checked={r.hatch}
                onChange={(e) => update(r.id, { hatch: e.target.checked })}
              />
              Cure
            </label>
            <input
              type="number"
              min={0}
              step={0.25}
              value={r.startHour}
              onChange={(e) => update(r.id, { startHour: Number(e.target.value) })}
              title="Start hour"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={r.durationHours}
              onChange={(e) =>
                update(r.id, { durationHours: Number(e.target.value) })
              }
              title="Duration (hours)"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={add} label="Add step" />

      <div className="mt-5 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-3">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
          Legend preview — builds from the steps above
        </div>
        <div className="mt-2">
          <Legend
            items={buildGanttLegend(
              [],
              rows.map((r) => ({
                ...r,
                kind: (r.hatch ? "cure" : "process") as SequentialStep["kind"],
              }))
            )}
          />
        </div>
      </div>

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            totalDays,
            workingStartHour: startHour,
            workingEndHour: endHour,
            steps: rows
              .filter((r) => r.label.trim())
              .map((r) => ({
                label: r.label,
                startHour: r.startHour,
                durationHours: r.durationHours,
                color: r.color,
                category: r.category,
                kind: (r.hatch ? "cure" : "process") as SequentialStep["kind"],
                ...(r.note ? { note: r.note } : {}),
              })),
          })
        }
      />
    </div>
  );
}

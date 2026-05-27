"use client";

import { useState } from "react";
import type { GanttBar, GanttGate } from "@/lib/types";
import { ROLE_META, buildGanttLegend } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";
import { Legend } from "./legend";

interface BarRow extends GanttBar {
  id: number;
  color: string;
  category: string;
}
interface GateRow extends GanttGate {
  id: number;
}

let _id = 1;
const nextId = () => _id++;

// Default color + category from the legacy role, so existing bars edit cleanly.
function barColor(b: GanttBar): string {
  return b.color ?? ROLE_META[b.role ?? "engineering"].stroke;
}
function barCategory(b: GanttBar): string {
  return b.category ?? ROLE_META[b.role ?? "engineering"].label;
}

interface Props {
  initial: { totalWeeks: number; bars: GanttBar[]; gates: GanttGate[] };
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function GanttOverviewEditor({ initial, submit, busy, cancel }: Props) {
  const [totalWeeks, setTotalWeeks] = useState(initial.totalWeeks || 12);
  const [bars, setBars] = useState<BarRow[]>(
    initial.bars.length
      ? initial.bars.map((b) => ({
          ...b,
          id: nextId(),
          color: barColor(b),
          category: barCategory(b),
        }))
      : [
          {
            id: nextId(),
            label: "",
            group: "Engineering",
            startWeek: 1,
            durationWeeks: 1,
            color: "#534AB7",
            category: "Engineering",
          },
        ]
  );
  const [gates, setGates] = useState<GateRow[]>(
    initial.gates.map((g) => ({ ...g, id: nextId() }))
  );

  function updateBar(id: number, patch: Partial<BarRow>) {
    setBars((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeBar(id: number) {
    setBars((rs) => rs.filter((r) => r.id !== id));
  }
  function addBar() {
    setBars((rs) => {
      const last = rs[rs.length - 1];
      return [
        ...rs,
        {
          id: nextId(),
          label: "",
          group: last?.group ?? "Engineering",
          startWeek: 1,
          durationWeeks: 1,
          color: last?.color ?? "#534AB7",
          category: last?.category ?? "Engineering",
        },
      ];
    });
  }

  function updateGate(id: number, patch: Partial<GateRow>) {
    setGates((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeGate(id: number) {
    setGates((rs) => rs.filter((r) => r.id !== id));
  }
  function addGate() {
    setGates((rs) => [...rs, { id: nextId(), atWeek: 1, label: "" }]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Gantt — schedule overview (week scale)
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs text-noble-black/80">
        Total weeks on chart
        <input
          type="number"
          min={1}
          max={104}
          step={1}
          value={totalWeeks}
          onChange={(e) => setTotalWeeks(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
        />
      </label>

      <div className="mt-4 text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
        Bars
      </div>
      <div className="mt-2 space-y-2">
        {bars.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-[1fr_130px_130px_44px_70px_70px_auto] items-center gap-2"
          >
            <input
              value={b.label}
              onChange={(e) => updateBar(b.id, { label: e.target.value })}
              placeholder="Bar label (e.g., Tool modification @ Byrne)"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              value={b.group}
              onChange={(e) => updateBar(b.id, { group: e.target.value })}
              placeholder="Group heading"
              title="Left-side group band heading"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
            />
            <input
              value={b.category}
              onChange={(e) => updateBar(b.id, { category: e.target.value })}
              placeholder="Category / dept"
              title="Legend label for this color"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
              style={{ borderLeftColor: b.color, borderLeftWidth: 4 }}
            />
            <input
              type="color"
              value={b.color}
              onChange={(e) => updateBar(b.id, { color: e.target.value })}
              title="Bar color"
              className="h-7 w-full cursor-pointer rounded-md border border-[var(--border)] bg-white p-0.5"
            />
            <input
              type="number"
              min={1}
              step={0.5}
              value={b.startWeek}
              onChange={(e) => updateBar(b.id, { startWeek: Number(e.target.value) })}
              title="Start week"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={b.durationWeeks}
              onChange={(e) =>
                updateBar(b.id, { durationWeeks: Number(e.target.value) })
              }
              title="Duration in weeks"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <RemoveRowButton onClick={() => removeBar(b.id)} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={addBar} label="Add bar" />

      <div className="mt-4 text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
        Gates (vertical markers)
      </div>
      <div className="mt-2 space-y-2">
        {gates.map((g) => (
          <div
            key={g.id}
            className="grid grid-cols-[1fr_80px_auto] items-center gap-2"
          >
            <input
              value={g.label}
              onChange={(e) => updateGate(g.id, { label: e.target.value })}
              placeholder="Gate label (e.g., Mold returns)"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={g.atWeek}
              onChange={(e) => updateGate(g.id, { atWeek: Number(e.target.value) })}
              title="At week"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <RemoveRowButton onClick={() => removeGate(g.id)} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={addGate} label="Add gate" />

      <div className="mt-5 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-3">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
          Legend preview — builds from the bars above
        </div>
        <div className="mt-2">
          <Legend items={buildGanttLegend(bars, [])} />
        </div>
      </div>

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            totalWeeks,
            bars: bars
              .filter((b) => b.label.trim())
              .map(({ id: _id, ...rest }) => rest),
            gates: gates
              .filter((g) => g.label.trim())
              .map(({ id: _id, ...rest }) => rest),
          })
        }
      />
    </div>
  );
}

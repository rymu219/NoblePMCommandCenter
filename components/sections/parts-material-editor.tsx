"use client";

import { useState } from "react";
import type { PartsRunRow } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";

interface Row extends PartsRunRow {
  id: number;
}

let _id = 1;
const nextId = () => _id++;

interface Props {
  initial: PartsRunRow[];
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function PartsMaterialEditor({ initial, submit, busy, cancel }: Props) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ ...r, id: nextId() }))
      : [{ id: nextId(), name: "", purpose: "", parts: 0, lbs: 0, kg: 0 }]
  );

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function add() {
    setRows((rs) => [
      ...rs,
      { id: nextId(), name: "", purpose: "", parts: 0, lbs: 0, kg: 0 },
    ]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Parts &amp; material by run
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-noble-black/60">
              <th className="px-2 py-1">Run / phase</th>
              <th className="px-2 py-1">Purpose</th>
              <th className="px-2 py-1 text-right">Parts</th>
              <th className="px-2 py-1 text-right">Lbs</th>
              <th className="px-2 py-1 text-right">Kg</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-1 py-1">
                  <input
                    value={r.name}
                    onChange={(e) => update(r.id, { name: e.target.value })}
                    placeholder="e.g., Run 1"
                    className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    value={r.purpose}
                    onChange={(e) => update(r.id, { purpose: e.target.value })}
                    placeholder="What this run validates"
                    className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.parts}
                    onChange={(e) => update(r.id, { parts: Number(e.target.value) })}
                    className="w-20 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={r.lbs}
                    onChange={(e) => update(r.id, { lbs: Number(e.target.value) })}
                    className="w-24 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={r.kg}
                    onChange={(e) => update(r.id, { kg: Number(e.target.value) })}
                    className="w-24 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="px-1 py-1">
                  <RemoveRowButton onClick={() => remove(r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddRowButton onClick={add} label="Add run" />

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            rows: rows
              .filter((r) => r.name.trim() || r.purpose.trim())
              .map(({ id: _id, ...rest }) => rest),
          })
        }
      />
    </div>
  );
}

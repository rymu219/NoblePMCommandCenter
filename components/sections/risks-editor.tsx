"use client";

import { useState } from "react";
import type { RiskItem } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";

interface Row extends RiskItem {
  id: number;
}

let _id = 1;
const nextId = () => _id++;

interface Props {
  initial: RiskItem[];
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function RisksEditor({ initial, submit, busy, cancel }: Props) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ ...r, id: nextId() }))
      : [{ id: nextId(), text: "", owner: "", resolved: false }]
  );

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function add() {
    setRows((rs) => [...rs, { id: nextId(), text: "", owner: "", resolved: false }]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Risks &amp; pre-conditions
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_180px_70px_auto] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-2"
          >
            <input
              value={r.text}
              onChange={(e) => update(r.id, { text: e.target.value })}
              placeholder="Risk or pre-condition…"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              value={r.owner ?? ""}
              onChange={(e) => update(r.id, { owner: e.target.value })}
              placeholder="Owner"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-noble-black/80">
              <input
                type="checkbox"
                checked={!!r.resolved}
                onChange={(e) => update(r.id, { resolved: e.target.checked })}
              />
              Resolved
            </label>
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>

      <AddRowButton onClick={add} label="Add risk" />

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            items: rows
              .filter((r) => r.text.trim())
              .map(({ id: _id, ...rest }) => ({
                text: rest.text.trim(),
                owner: rest.owner?.trim() || undefined,
                resolved: !!rest.resolved,
              })),
          })
        }
      />
    </div>
  );
}

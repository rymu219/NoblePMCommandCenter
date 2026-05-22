"use client";

import { useState } from "react";
import type { DecisionItem } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";

interface Row extends DecisionItem {
  id: number;
}

let _id = 1;
const nextId = () => _id++;

interface Props {
  initial: DecisionItem[];
  defaultAuthor?: string;
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function DecisionsEditor({
  initial,
  defaultAuthor,
  submit,
  busy,
  cancel,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ ...r, id: nextId() }))
      : [
          {
            id: nextId(),
            date: today,
            decision: "",
            source: "meeting",
            author: defaultAuthor ?? "",
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
    setRows((rs) => [
      ...rs,
      {
        id: nextId(),
        date: today,
        decision: "",
        source: "meeting",
        author: defaultAuthor ?? "",
      },
    ]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Decisions log
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[120px_1fr_140px_160px_auto] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-2"
          >
            <input
              type="date"
              value={r.date}
              onChange={(e) => update(r.id, { date: e.target.value })}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
            />
            <input
              value={r.decision}
              onChange={(e) => update(r.id, { decision: e.target.value })}
              placeholder="Decision…"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <select
              value={r.source}
              onChange={(e) =>
                update(r.id, { source: e.target.value as DecisionItem["source"] })
              }
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
            >
              <option value="meeting">meeting</option>
              <option value="unilateral">unilateral</option>
            </select>
            <input
              value={r.author}
              onChange={(e) => update(r.id, { author: e.target.value })}
              placeholder="Author"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>

      <AddRowButton onClick={add} label="Add decision" />

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            items: rows
              .filter((r) => r.decision.trim())
              .map(({ id: _id, ...rest }) => rest),
          })
        }
      />
    </div>
  );
}

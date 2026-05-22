"use client";

import { useState } from "react";
import type { HoursRow, Role } from "@/lib/types";
import { ROLE_META } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";

interface Row extends HoursRow {
  id: number;
}

let _id = 1;
const nextId = () => _id++;

const ROLES: Role[] = ["engineering", "process", "automation", "quality"];

interface Props {
  initial: HoursRow[];
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function HoursByRoleEditor({ initial, submit, busy, cancel }: Props) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ ...r, id: nextId() }))
      : [{ id: nextId(), role: "engineering", who: "", task: "", hours: 0 }]
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
      { id: nextId(), role: "engineering", who: "", task: "", hours: 0 },
    ]);
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Hours by role
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Planning estimate per task. Subtotals per role and the grand total
        compute automatically in the read view.
      </p>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[140px_180px_1fr_100px_auto] items-center gap-2"
          >
            <select
              value={r.role}
              onChange={(e) => update(r.id, { role: e.target.value as Role })}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
              style={{ borderLeftColor: ROLE_META[r.role].stroke, borderLeftWidth: 4 }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_META[role].label}
                </option>
              ))}
            </select>
            <input
              value={r.who}
              onChange={(e) => update(r.id, { who: e.target.value })}
              placeholder="Who"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              value={r.task}
              onChange={(e) => update(r.id, { task: e.target.value })}
              placeholder="Task"
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              step={0.25}
              value={r.hours}
              onChange={(e) => update(r.id, { hours: Number(e.target.value) })}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-right text-sm"
            />
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>

      <AddRowButton onClick={add} label="Add task" />

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            rows: rows
              .filter((r) => r.who.trim() || r.task.trim() || r.hours > 0)
              .map(({ id: _id, ...rest }) => rest),
          })
        }
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveBudgetTracksAction } from "@/app/projects/[id]/dashboard/actions";
import { DASH, type TrackColor } from "./colors";
import {
  AddRowButton,
  RemoveRowButton,
  SectionButtons,
} from "../sections/section-buttons";

interface Row {
  id: number;
  name: string;
  amount: number;
  color: TrackColor;
}

const COLOR_OPTIONS: TrackColor[] = ["slate", "blue", "purple", "yellow", "red"];

let _id = 1;
const nextId = () => _id++;

interface Props {
  projectId: string;
  initial: Array<{ name: string; amount: number; color: TrackColor }>;
}

export function BudgetTracksEditor({ projectId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length
      ? initial.map((t) => ({ id: nextId(), ...t }))
      : [{ id: nextId(), name: "", amount: 0, color: "slate" }]
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((rs) => [...rs, { id: nextId(), name: "", amount: 0, color: "slate" }]);
  }
  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function save() {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify(
        rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name, amount: r.amount, color: r.color }))
      )
    );
    startTransition(async () => {
      try {
        await saveBudgetTracksAction(projectId, fd);
        setOpen(false);
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
        className="rounded-md border px-2 py-1 text-[11px] font-medium"
        style={{ borderColor: DASH.border, color: DASH.muted }}
      >
        Edit budget tracks
      </button>
    );
  }

  return (
    <div
      className="mt-3 rounded-md p-4"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <div className="text-[11px] font-semibold tracking-[0.2em]" style={{ color: DASH.yellow }}>
        EDIT BUDGET TRACKS
      </div>
      <p className="mt-1 text-xs" style={{ color: DASH.muted }}>
        Each row is one stacked segment in the Budget Detail bar.
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_120px_120px_auto] items-center gap-2"
          >
            <input
              value={r.name}
              onChange={(e) => update(r.id, { name: e.target.value })}
              placeholder="Track name"
              className="rounded-md bg-white/5 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
            />
            <input
              type="number"
              min={0}
              step={1000}
              value={r.amount}
              onChange={(e) => update(r.id, { amount: Number(e.target.value) })}
              placeholder="Amount $"
              className="rounded-md bg-white/5 px-2 py-1 text-right text-sm text-white outline-none ring-1 ring-white/10"
            />
            <select
              value={r.color}
              onChange={(e) => update(r.id, { color: e.target.value as TrackColor })}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-white outline-none ring-1 ring-white/10"
              style={{
                borderLeft: `4px solid ${DASH.track[r.color]}`,
                paddingLeft: 6,
              }}
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c} style={{ color: "#000" }}>
                  {c}
                </option>
              ))}
            </select>
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={add} label="Add track" />
      {err ? (
        <p className="mt-3 rounded-md bg-red-900/30 px-3 py-1.5 text-xs text-red-200">
          {err}
        </p>
      ) : null}
      <SectionButtons busy={busy} onCancel={() => setOpen(false)} onSave={save} />
    </div>
  );
}

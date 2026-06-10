"use client";

import { useState, useTransition } from "react";
import { savePhasesAction } from "@/app/projects/[id]/dashboard/actions";
import { DASH, type TrackColor } from "./colors";
import {
  AddRowButton,
  RemoveRowButton,
  SectionButtons,
} from "../sections/section-buttons";

interface Row {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  color: TrackColor;
  isCurrent: boolean;
}

const COLOR_OPTIONS: TrackColor[] = ["slate", "blue", "purple", "yellow", "red"];

let _id = 1;
const nextId = () => _id++;

interface Props {
  projectId: string;
  initial: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    color: TrackColor;
    isCurrent?: boolean;
  }>;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function PhasesEditor({ projectId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length
      ? initial.map((p) => ({
          id: nextId(),
          name: p.name,
          startDate: iso(p.startDate),
          endDate: iso(p.endDate),
          color: p.color,
          isCurrent: !!p.isCurrent,
        }))
      : [
          {
            id: nextId(),
            name: "",
            startDate: "",
            endDate: "",
            color: "slate",
            isCurrent: false,
          },
        ]
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) {
          // Enforce "only one current".
          if (patch.isCurrent === true) return { ...r, isCurrent: false };
          return r;
        }
        return { ...r, ...patch };
      })
    );
  }
  function add() {
    setRows((rs) => [
      ...rs,
      {
        id: nextId(),
        name: "",
        startDate: "",
        endDate: "",
        color: "slate",
        isCurrent: false,
      },
    ]);
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
          .filter((r) => r.name.trim() && r.startDate && r.endDate)
          .map((r) => ({
            name: r.name,
            startDate: r.startDate,
            endDate: r.endDate,
            color: r.color,
            isCurrent: r.isCurrent,
          }))
      )
    );
    startTransition(async () => {
      try {
        await savePhasesAction(projectId, fd);
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
        Edit phases
      </button>
    );
  }

  return (
    <div
      className="mt-3 rounded-md p-4"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <div className="text-[11px] font-semibold tracking-[0.2em]" style={{ color: DASH.yellow }}>
        EDIT PHASES
      </div>
      <p className="mt-1 text-xs" style={{ color: DASH.muted }}>
        Phases drive the Program Timeline mini-Gantt. Tick &ldquo;Current&rdquo; on the
        active phase to highlight its label.
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_140px_140px_120px_80px_auto] items-center gap-2"
          >
            <input
              value={r.name}
              onChange={(e) => update(r.id, { name: e.target.value })}
              placeholder="Phase name"
              className="rounded-md bg-white/5 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
            />
            <input
              type="date"
              value={r.startDate}
              onChange={(e) => update(r.id, { startDate: e.target.value })}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-white outline-none ring-1 ring-white/10"
            />
            <input
              type="date"
              value={r.endDate}
              onChange={(e) => update(r.id, { endDate: e.target.value })}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-white outline-none ring-1 ring-white/10"
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
            <label
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: DASH.muted }}
            >
              <input
                type="checkbox"
                checked={r.isCurrent}
                onChange={(e) => update(r.id, { isCurrent: e.target.checked })}
              />
              Current
            </label>
            <RemoveRowButton onClick={() => remove(r.id)} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={add} label="Add phase" />
      {err ? (
        <p className="mt-3 rounded-md bg-red-900/30 px-3 py-1.5 text-xs text-red-200">
          {err}
        </p>
      ) : null}
      <SectionButtons busy={busy} onCancel={() => setOpen(false)} onSave={save} />
    </div>
  );
}

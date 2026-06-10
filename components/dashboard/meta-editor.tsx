"use client";

import { useState, useTransition } from "react";
import { saveDashboardMetaAction } from "@/app/projects/[id]/dashboard/actions";
import { DASH } from "./colors";
import { SectionButtons } from "../sections/section-buttons";

interface Props {
  projectId: string;
  initial: {
    budgetTotal: number | null;
    committedTotal: number | null;
    forecastTotal: number | null;
    headroomNote: string | null;
    nextTrigger: string | null;
    keyMilestone: string | null;
    health: string | null;
  };
}

const HEALTH_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
];

export function MetaEditor({ projectId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState<string>(num(initial.budgetTotal));
  const [committed, setCommitted] = useState<string>(num(initial.committedTotal));
  const [forecast, setForecast] = useState<string>(num(initial.forecastTotal));
  const [headroomNote, setHeadroomNote] = useState(initial.headroomNote ?? "");
  const [nextTrigger, setNextTrigger] = useState(initial.nextTrigger ?? "");
  const [keyMilestone, setKeyMilestone] = useState(initial.keyMilestone ?? "");
  const [health, setHealth] = useState(initial.health ?? "on_track");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("budgetTotal", budget);
    fd.set("committedTotal", committed);
    fd.set("forecastTotal", forecast);
    fd.set("headroomNote", headroomNote);
    fd.set("nextTrigger", nextTrigger);
    fd.set("keyMilestone", keyMilestone);
    fd.set("health", health);
    startTransition(async () => {
      try {
        await saveDashboardMetaAction(projectId, fd);
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
        Edit dashboard data
      </button>
    );
  }

  return (
    <div
      className="mt-3 rounded-md p-4"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <div className="text-[11px] font-semibold tracking-[0.2em]" style={{ color: DASH.yellow }}>
        EDIT DASHBOARD DATA
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Budget ($)" value={budget} onChange={setBudget} type="number" />
        <Field label="Committed ($)" value={committed} onChange={setCommitted} type="number" />
        <Field label="Forecast ($)" value={forecast} onChange={setForecast} type="number" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <Lbl>Health</Lbl>
          <select
            value={health}
            onChange={(e) => setHealth(e.target.value)}
            className="mt-1 w-full rounded-md bg-white/5 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10"
          >
            {HEALTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ color: "#000" }}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Headroom subline (e.g., 'Under budget')"
          value={headroomNote}
          onChange={setHeadroomNote}
        />
      </div>
      <Field
        label="Next trigger"
        value={nextTrigger}
        onChange={setNextTrigger}
        placeholder="e.g., Cells 2 & 3 procurement release ~June 30"
      />
      <Field
        label="Key milestone"
        value={keyMilestone}
        onChange={setKeyMilestone}
        placeholder="e.g., Cell 1 build complete July 17"
      />
      {err ? (
        <p className="mt-3 rounded-md bg-red-900/30 px-3 py-1.5 text-xs text-red-200">
          {err}
        </p>
      ) : null}
      <SectionButtons busy={busy} onCancel={() => setOpen(false)} onSave={save} />
    </div>
  );
}

function num(n: number | null): string {
  return n == null ? "" : String(n);
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: DASH.muted }}>
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <Lbl>{label}</Lbl>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md bg-white/5 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
      />
    </label>
  );
}

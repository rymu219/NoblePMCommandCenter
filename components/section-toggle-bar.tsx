"use client";

import { useState, useTransition } from "react";
import { setSectionTogglesAction } from "@/app/projects/[id]/section-actions";

const SECTIONS: Array<{ key: string; label: string }> = [
  { key: "summary_cards", label: "Summary cards" },
  { key: "parts_material", label: "Parts & material" },
  { key: "hours_by_role", label: "Hours by role" },
  { key: "gantt_overview", label: "Gantt — week" },
  { key: "gantt_detail", label: "Gantt — hour" },
  { key: "risks_preconditions", label: "Risks" },
  { key: "decisions_log", label: "Decisions" },
  { key: "notes_freeform", label: "Notes" },
];

interface Props {
  projectId: string;
  enabled: { [k: string]: boolean };
}

export function SectionToggleBar({ projectId, enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>({ ...enabled });
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function flip(key: string) {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }
  function save() {
    setBusy(true);
    const fd = new FormData();
    for (const s of SECTIONS) {
      if (state[s.key]) fd.set(`toggle:${s.key}`, "on");
    }
    startTransition(async () => {
      try {
        await setSectionTogglesAction(projectId, fd);
        setOpen(false);
      } finally {
        setBusy(false);
      }
    });
  }

  const activeCount = SECTIONS.filter((s) => state[s.key]).length;

  if (!open) {
    return (
      <div className="no-print mb-5 flex items-center justify-between rounded-md bg-[var(--surface)] px-3 py-1.5 text-xs text-noble-black/70">
        <span>
          {activeCount} of {SECTIONS.length} planning sections enabled
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-medium hover:bg-noble-stone/40"
        >
          Manage sections
        </button>
      </div>
    );
  }

  return (
    <div className="no-print mb-5 rounded-md border border-noble-red/30 bg-white p-3 ring-1 ring-noble-red/10">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Enable / disable sections
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Turning a section off hides it but preserves its content. Turn it back
        on to restore. Status is always on.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {SECTIONS.map((s) => (
          <label
            key={s.key}
            className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 px-2 py-1.5 text-sm hover:bg-noble-stone/30"
          >
            <input
              type="checkbox"
              checked={!!state[s.key]}
              onChange={() => flip(s.key)}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setState({ ...enabled });
            setOpen(false);
          }}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveProgramNarrativeAction } from "./actions";
import { SectionButtons } from "@/components/sections/section-buttons";

interface Props {
  prefix: string;
  initial: { execSummary: string; decisionsAsked: string };
}

export function ProgramNarrativeEditor({ prefix, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [execSummary, setExecSummary] = useState(initial.execSummary);
  const [decisionsAsked, setDecisionsAsked] = useState(initial.decisionsAsked);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("execSummary", execSummary);
    fd.set("decisionsAsked", decisionsAsked);
    startTransition(async () => {
      try {
        await saveProgramNarrativeAction(prefix, fd);
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
        className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-noble-black/80 hover:bg-noble-stone/40"
      >
        Edit program narrative
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-noble-red/30 bg-white p-4 ring-1 ring-noble-red/10">
      <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-noble-red">
        Program narrative
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Both fields appear in the report above. Free text.
      </p>

      <label className="mt-3 block">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
          Executive summary
        </span>
        <textarea
          value={execSummary}
          onChange={(e) => setExecSummary(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm leading-relaxed"
          placeholder="2-4 sentences. Where the program stands this reporting period, what changed since last time, what's on deck."
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
          Decisions needed from customer
        </span>
        <textarea
          value={decisionsAsked}
          onChange={(e) => setDecisionsAsked(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm leading-relaxed"
          placeholder="Bullet the decisions you need from the customer this week."
        />
      </label>

      {err ? (
        <p className="mt-3 rounded-md bg-noble-red/10 px-3 py-1.5 text-xs text-noble-red">
          {err}
        </p>
      ) : null}

      <SectionButtons
        busy={busy}
        onCancel={() => setOpen(false)}
        onSave={save}
      />
    </div>
  );
}

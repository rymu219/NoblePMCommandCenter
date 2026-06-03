"use client";

import { useState, useTransition } from "react";
import { captureSviSnapshotsAction } from "./svi-actions";

/** Admin button: snapshot the current SVI for all active projects (for trend). */
export function SviSnapshotButton() {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function capture() {
    setBusy(true);
    setNote(null);
    startTransition(async () => {
      try {
        const n = await captureSviSnapshotsAction();
        setNote(`Snapshotted ${n} project${n === 1 ? "" : "s"}.`);
      } catch {
        setNote("Snapshot failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {note ? <span className="text-[11px] text-[var(--muted)]">{note}</span> : null}
      <button
        type="button"
        onClick={capture}
        disabled={busy}
        className="no-print rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40 disabled:opacity-60"
      >
        {busy ? "Capturing…" : "Capture snapshot"}
      </button>
    </div>
  );
}

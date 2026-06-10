"use client";

import { useState, useTransition } from "react";
import { HEALTHS, healthMeta } from "./health";
import { setHealthAction } from "@/app/projects/[id]/v2-actions";

/*
 * Project health pill. Read-only for viewers; for editors, clicking the
 * pill expands the three options in place — pick one, it saves. No modal.
 */
export function HealthPill({
  projectId,
  health,
  canEdit,
}: {
  projectId: string;
  health: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = healthMeta(health);

  if (!canEdit) {
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${meta.pill}`}>
        {meta.label}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        title="Change health"
        className={`no-print inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${meta.pill} disabled:opacity-60`}
      >
        {meta.label}
        <span className="text-[10px] opacity-80">▾</span>
      </button>
    );
  }

  return (
    <span className="no-print inline-flex items-center gap-1.5">
      {HEALTHS.map((h) => (
        <button
          key={h.value}
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            if (h.value === health) return;
            startTransition(async () => {
              const fd = new FormData();
              fd.set("projectId", projectId);
              fd.set("health", h.value);
              await setHealthAction(fd);
            });
          }}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${h.pill} ${
            h.value === health ? "ring-2 ring-noble-black/40 ring-offset-1" : "opacity-75 hover:opacity-100"
          } disabled:opacity-50`}
        >
          {h.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--muted)] hover:text-noble-black"
      >
        cancel
      </button>
    </span>
  );
}

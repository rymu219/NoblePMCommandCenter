"use client";

import { useState, useTransition } from "react";
import { HEALTHS, healthMeta } from "./health";
import { MarkdownLite } from "./markdown";
import { SaveError } from "@/components/save-error";
import { postUpdateAction } from "@/app/projects/[id]/v2-actions";
import type { V2LatestUpdate } from "@/lib/project-v2-loader";

/*
 * The weekly ritual, on one card: latest narrative + "Post update", which
 * expands an inline composer (3-way health + textarea, prefilled with the
 * last narrative so the PM edits rather than rewrites). One save sets
 * project health AND appends the status update.
 */
export function NarrativeCard({
  projectId,
  health,
  latest,
  canEdit,
}: {
  projectId: string;
  health: string;
  latest: V2LatestUpdate | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftHealth, setDraftHealth] = useState(health);
  const [narrative, setNarrative] = useState(latest?.narrative ?? "");
  const [qualifier, setQualifier] = useState(latest?.qualifier ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const meta = healthMeta(health);

  function openComposer() {
    setDraftHealth(health);
    setNarrative(latest?.narrative ?? "");
    setQualifier(latest?.qualifier ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("health", draftHealth);
        fd.set("narrative", narrative.trim());
        fd.set("qualifier", qualifier.trim());
        await postUpdateAction(fd);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the update.");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <div className="h-1.5" style={{ backgroundColor: meta.hex }} />
      <div className="p-4">
        {!editing ? (
          <>
            {latest?.narrative ? (
              <MarkdownLite text={latest.narrative} />
            ) : (
              <p className="text-sm text-[var(--muted)]">No status update yet.</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted)]">
              {latest ? (
                <span>
                  Reported {latest.reportDateIso}
                  {latest.authorName ? ` · ${latest.authorName}` : ""}
                  {latest.qualifier ? ` · ${latest.qualifier}` : ""}
                </span>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={openComposer}
                  className="no-print ml-auto rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-noble-black hover:bg-noble-stone/40"
                >
                  Post update
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="no-print">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-noble-black/70">Health:</span>
              {HEALTHS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setDraftHealth(h.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${h.pill} ${
                    h.value === draftHealth
                      ? "ring-2 ring-noble-black/40 ring-offset-1"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={6}
              autoFocus
              placeholder="What changed, what's next, what's in the way. **bold** supported; blank line = new paragraph."
              className="mt-3 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm leading-relaxed text-noble-black focus:border-noble-black/40 focus:outline-none"
            />
            <input
              value={qualifier}
              onChange={(e) => setQualifier(e.target.value)}
              placeholder="Optional qualifier — e.g. “Awaiting customer PO”"
              className="mt-2 w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black focus:border-noble-black/40 focus:outline-none"
            />
            <SaveError message={error} />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending || !narrative.trim()}
                className="rounded-md bg-noble-black px-4 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Post update"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={pending}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--muted)] hover:text-noble-black"
              >
                Cancel
              </button>
              <span className="ml-auto text-[10px] text-[var(--muted)]">
                Posting keeps history — the old update stays in the archive.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

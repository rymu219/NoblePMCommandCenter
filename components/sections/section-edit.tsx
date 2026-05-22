"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveSectionAction } from "@/app/projects/[id]/section-actions";
import { NotesEditor } from "./notes-editor";
import { RisksEditor } from "./risks-editor";
import { DecisionsEditor } from "./decisions-editor";
import { SummaryCardsEditor } from "./summary-cards-editor";
import { PartsMaterialEditor } from "./parts-material-editor";
import { HoursByRoleEditor } from "./hours-by-role-editor";
import { GanttOverviewEditor } from "./gantt-overview-editor";
import { GanttDetailEditor } from "./gantt-detail-editor";

export type SectionKind =
  | "summary_cards"
  | "parts_material"
  | "hours_by_role"
  | "gantt_overview"
  | "gantt_detail"
  | "risks_preconditions"
  | "decisions_log"
  | "notes_freeform";

interface Props {
  projectId: string;
  kind: SectionKind;
  /** Section's current data, already loaded server-side. */
  initial: unknown;
  /** Optional author hint for the Decisions editor. */
  defaultAuthor?: string;
  canEdit: boolean;
  /** The read-only render of this section. */
  children: ReactNode;
}

/**
 * Wraps the read-only section render with an Edit button (when canEdit).
 * Toggling Edit swaps the read view for the appropriate editor; saving
 * calls saveSectionAction and re-revalidates the page.
 */
export function SectionEdit({
  projectId,
  kind,
  initial,
  defaultAuthor,
  canEdit,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!canEdit) return <>{children}</>;

  function submit(payload: unknown) {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      try {
        await saveSectionAction(projectId, kind, fd);
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
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="no-print absolute -top-[34px] right-0 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-medium text-noble-black/80 hover:bg-noble-stone/40"
        >
          Edit
        </button>
      </div>
    );
  }

  const cancel = () => setOpen(false);

  return (
    <div className="rounded-lg border border-noble-red/30 bg-white p-4 ring-1 ring-noble-red/10">
      {kind === "notes_freeform" ? (
        <NotesEditor
          initial={(initial as string[]) ?? []}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "risks_preconditions" ? (
        <RisksEditor
          initial={(initial as Parameters<typeof RisksEditor>[0]["initial"]) ?? []}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "decisions_log" ? (
        <DecisionsEditor
          initial={(initial as Parameters<typeof DecisionsEditor>[0]["initial"]) ?? []}
          defaultAuthor={defaultAuthor}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "summary_cards" ? (
        <SummaryCardsEditor
          initial={(initial as Parameters<typeof SummaryCardsEditor>[0]["initial"]) ?? []}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "parts_material" ? (
        <PartsMaterialEditor
          initial={(initial as Parameters<typeof PartsMaterialEditor>[0]["initial"]) ?? []}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "hours_by_role" ? (
        <HoursByRoleEditor
          initial={(initial as Parameters<typeof HoursByRoleEditor>[0]["initial"]) ?? []}
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "gantt_overview" ? (
        <GanttOverviewEditor
          initial={
            (initial as Parameters<typeof GanttOverviewEditor>[0]["initial"]) ?? {
              totalWeeks: 12,
              bars: [],
              gates: [],
            }
          }
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}
      {kind === "gantt_detail" ? (
        <GanttDetailEditor
          initial={
            (initial as Parameters<typeof GanttDetailEditor>[0]["initial"]) ?? {
              totalDays: 3,
              workingStartHour: 8,
              workingEndHour: 17,
              steps: [],
            }
          }
          submit={submit}
          busy={busy}
          cancel={cancel}
        />
      ) : null}

      {err ? (
        <p className="mt-3 rounded-md bg-noble-red/10 px-3 py-1.5 text-xs text-noble-red">
          {err}
        </p>
      ) : null}
    </div>
  );
}

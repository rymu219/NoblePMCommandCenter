import type { Cue } from "@/lib/slippage";

/*
 * Maps a slippage cue to a label + Tailwind classes, using the brand tokens
 * from app/globals.css. Plain module (no "use server"/"use client") so both
 * the server-rendered milestone cards and the client subtask rows share it.
 */
export interface CueBadge {
  label: string;
  className: string;
}

export function cueBadge(cue: Cue, daysLate: number | null): CueBadge | null {
  switch (cue) {
    case "overdue":
      return {
        label: "Overdue",
        className: "bg-noble-red/10 text-noble-red",
      };
    case "due-soon":
      return {
        label: "Due soon",
        className: "bg-noble-gold/25 text-noble-black",
      };
    case "done-late":
      return {
        label: daysLate && daysLate > 0 ? `+${daysLate}d late` : "Late",
        className: "bg-noble-red/10 text-noble-red",
      };
    case "done":
      return {
        label: "Done",
        className: "bg-[var(--color-role-process)]/12 text-[var(--color-role-process)]",
      };
    default:
      return null; // "open" / "none" — no badge
  }
}

/** Drift badge for a milestone whose target moved off its baseline. */
export function driftBadge(driftDays: number): CueBadge | null {
  if (driftDays <= 0) return null;
  return {
    label: `+${driftDays}d vs baseline`,
    className: "bg-noble-gold/25 text-noble-black",
  };
}

/** Flag for an open milestone with no target date set. */
export function needsDateBadge(
  targetIso: string | null,
  actualIso: string | null
): CueBadge | null {
  if (actualIso || targetIso) return null;
  return { label: "⚠ Needs a date", className: "bg-noble-red/10 text-noble-red" };
}

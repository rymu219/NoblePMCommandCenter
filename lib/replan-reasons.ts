/*
 * Cause vocabulary for milestone date slips / re-baselines.
 *
 * Shared by the admin reason picker (app/board/milestone-editor.tsx) and the
 * Execution analytics (lib/execution-loader.ts) so labels never drift. These are
 * the categories an admin chooses from when moving a committed date; the data is
 * private and only ever shown on the admin-only Execution page.
 */

/** Reasons offered in the picker, in display order. */
export const REPLAN_REASONS = [
  { value: "scope", label: "Scope grew / changed" },
  { value: "estimate", label: "Under-estimated the work" },
  { value: "dependency", label: "Blocked on a dependency" },
  { value: "capacity", label: "Capacity / competing priorities" },
  { value: "external", label: "Customer / supplier / external" },
  { value: "other", label: "Other" },
] as const;

export type ReplanReason = (typeof REPLAN_REASONS)[number]["value"] | "unspecified";

/** Catch-all for legacy/backfilled rows and non-admin moves (never offered). */
export const UNSPECIFIED_REASON = "unspecified";

const LABELS: Record<string, string> = {
  ...Object.fromEntries(REPLAN_REASONS.map((r) => [r.value, r.label])),
  [UNSPECIFIED_REASON]: "Unspecified",
};

/** Human label for a stored reason value; falls back to the raw value. */
export function reasonLabel(value: string): string {
  return LABELS[value] ?? value;
}

/** Whether a stored reason value is one the picker offers (vs unspecified/legacy). */
export function isKnownReason(value: string): boolean {
  return REPLAN_REASONS.some((r) => r.value === value);
}

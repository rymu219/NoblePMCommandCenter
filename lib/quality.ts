/*
 * Quality awareness board vocabulary — inspection methods and the standard
 * "why a date slipped" responses. Shared by the admin form and the loader so
 * labels never drift. (Mirrors lib/replan-reasons.ts for milestones.)
 */

/** Inspection methods offered in the picker, in display order. */
export const QUALITY_METHODS = [
  { value: "keyence", label: "Keyence" },
  { value: "cmm", label: "CMM" },
] as const;

export type QualityMethod = (typeof QUALITY_METHODS)[number]["value"];

const METHOD_LABELS: Record<string, string> = Object.fromEntries(
  QUALITY_METHODS.map((m) => [m.value, m.label])
);

/** Human label for a stored method value; falls back to the raw value. */
export function methodLabel(value: string): string {
  return METHOD_LABELS[value] ?? value;
}

export function isKnownMethod(value: string): boolean {
  return QUALITY_METHODS.some((m) => m.value === value);
}

/** Standard reasons offered when a quality inspection's target date moves. */
export const QUALITY_SLIP_REASONS = [
  { value: "machine", label: "Equipment / machine availability" },
  { value: "fixture", label: "Fixturing / programming" },
  { value: "parts", label: "Parts late / not ready" },
  { value: "priority", label: "Re-prioritized / competing work" },
  { value: "personnel", label: "Staffing / availability" },
  { value: "rework", label: "Rework / re-inspection" },
  { value: "other", label: "Other" },
] as const;

export type QualitySlipReason = (typeof QUALITY_SLIP_REASONS)[number]["value"];

const SLIP_LABELS: Record<string, string> = Object.fromEntries(
  QUALITY_SLIP_REASONS.map((r) => [r.value, r.label])
);

/** Human label for a stored slip reason; falls back to the raw value. */
export function slipReasonLabel(value: string): string {
  return SLIP_LABELS[value] ?? value;
}

export function isKnownSlipReason(value: string): boolean {
  return QUALITY_SLIP_REASONS.some((r) => r.value === value);
}

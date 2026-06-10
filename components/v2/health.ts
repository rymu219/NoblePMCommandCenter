/*
 * v2 canonical project health — the single signal behind every health
 * pill/color (see docs/v2-plan.md). Pure module: shared by server
 * actions, loaders and client components.
 */

export type Health = "on_track" | "at_risk" | "off_track";

export const HEALTHS: Array<{
  value: Health;
  label: string;
  /** Pill background + text classes. */
  pill: string;
  /** Solid accent hex (stripes, timeline markers). */
  hex: string;
}> = [
  { value: "on_track", label: "On Track", pill: "bg-[#0F6E56] text-white", hex: "#0F6E56" },
  { value: "at_risk", label: "At Risk", pill: "bg-[#BA7517] text-white", hex: "#BA7517" },
  { value: "off_track", label: "Off Track", pill: "bg-noble-red text-white", hex: "#cf202f" },
];

export function healthMeta(value: string | null | undefined) {
  return HEALTHS.find((h) => h.value === value) ?? HEALTHS[0];
}

export function isHealth(value: string): value is Health {
  return HEALTHS.some((h) => h.value === value);
}

/** v1-compat StatusUpdate.statusLabel for a posted health. */
export const HEALTH_TO_STATUS_LABEL: Record<Health, string> = {
  on_track: "on_track",
  at_risk: "at_risk",
  off_track: "blocked",
};

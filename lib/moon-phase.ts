/*
 * Real-time lunar phase calculation. No external API — the phase is derived
 * from the mean synodic month relative to a known new-moon epoch, which is
 * accurate to well within a day (more than enough to render the current
 * phase and illumination for the header tracker).
 */

// Length of the mean synodic month (new moon to new moon), in days.
const SYNODIC_MONTH = 29.530588853;

// A reference new moon: 2000-01-06 18:14 UTC (Julian-date anchored).
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
const MS_PER_DAY = 86_400_000;

export type MoonPhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

export interface MoonPhase {
  /** Position in the cycle, 0..1 (0 = new, 0.5 = full). */
  fraction: number;
  /** Days since the most recent new moon. */
  age: number;
  /** Illuminated fraction of the disc, 0..1. */
  illumination: number;
  /** Human-readable phase name. */
  name: MoonPhaseName;
  /** True while the moon is growing toward full. */
  waxing: boolean;
}

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / MS_PER_DAY;
  // Normalize to a positive position within the cycle.
  let fraction = (daysSince / SYNODIC_MONTH) % 1;
  if (fraction < 0) fraction += 1;

  const age = fraction * SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const waxing = fraction < 0.5;

  return {
    fraction,
    age,
    illumination,
    name: phaseName(fraction),
    waxing,
  };
}

function phaseName(fraction: number): MoonPhaseName {
  // Eight phases, each spanning 1/8 of the cycle, centered on the named
  // primary/secondary phases. A narrow window is reserved for the exact
  // primary phases (new, quarters, full).
  const f = fraction;
  if (f < 0.0234 || f >= 0.9766) return "New Moon";
  if (f < 0.2266) return "Waxing Crescent";
  if (f < 0.2734) return "First Quarter";
  if (f < 0.4766) return "Waxing Gibbous";
  if (f < 0.5234) return "Full Moon";
  if (f < 0.7266) return "Waning Gibbous";
  if (f < 0.7734) return "Last Quarter";
  return "Waning Crescent";
}

/**
 * SVG path describing the illuminated silhouette of the moon for the given
 * phase, on a disc centered at (0,0) with the supplied radius. Drawn for the
 * Northern Hemisphere (waxing light grows from the right limb).
 */
export function moonLitPath(fraction: number, r: number): string {
  const waxing = fraction < 0.5;
  const gibbous = fraction > 0.25 && fraction < 0.75; // illumination > 0.5
  // Half-width of the terminator ellipse (0 at the quarters, r at new/full).
  const rx = Math.abs(r * Math.cos(2 * Math.PI * fraction));

  const limbSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;

  return [
    `M 0 ${-r}`,
    `A ${r} ${r} 0 0 ${limbSweep} 0 ${r}`,
    `A ${rx.toFixed(4)} ${r} 0 0 ${termSweep} 0 ${-r}`,
    "Z",
  ].join(" ");
}

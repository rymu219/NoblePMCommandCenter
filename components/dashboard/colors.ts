/*
 * Color palette for the Program Dashboard (dark theme). Mirrors the
 * 647-008 BH Automation PDF. All values are hex strings so they can be
 * used in both className arbitrary values and inline `style` attrs.
 */

export const DASH = {
  /** Page ground — Noble black */
  bg: "#0d141d",
  /** Card / panel ground — slightly lighter for depth */
  panel: "#1a2433",
  /** Subtle panel edge */
  border: "rgba(255,255,255,0.08)",
  /** Body text on dark */
  text: "#ffffff",
  /** Muted text on dark */
  muted: "rgba(255,255,255,0.55)",
  /** Yellow used for caps section labels, headroom callout */
  yellow: "#ffcf01",
  /** Red used for TODAY marker, forecast accent */
  red: "#cf202f",
  /** ON SCHEDULE green pill */
  green: "#3f6f4a",
  /** Status pill colors */
  amber: "#c08a1f",

  /** Track/phase fill colors — match the PDF segments */
  track: {
    slate: "#4a5870",
    blue: "#5a6b85",
    purple: "#8c6caf",
    yellow: "#ffcf01",
    red: "#cf202f",
  },
} as const;

export type TrackColor = keyof typeof DASH.track;

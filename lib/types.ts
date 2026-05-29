/*
 * Shared types for the PM Command Center. These mirror the section
 * structure in /root/.claude/plans/i-need-to-make-dynamic-mango.md and
 * the eventual Prisma schema. v0 keeps them as TypeScript types for
 * static rendering; v1 will back them with Prisma models.
 */

export type Role = "engineering" | "process" | "automation" | "quality";

export type ProjectStatus =
  | "Not started"
  | "Active"
  | "On hold"
  | "Complete"
  | "Archived";

export interface SummaryCard {
  label: string;
  value: string;
  unit?: string;
}

export interface PartsRunRow {
  name: string;
  purpose: string;
  parts: number;
  lbs: number;
  kg: number;
}

export interface HoursRow {
  role: Role;
  who: string;
  task: string;
  hours: number;
}

export interface GanttBar {
  /** Track label on the left. */
  label: string;
  /** Track group heading, e.g. "Engineering", "Byrne — tool mod.", "Part requalification". */
  group: string;
  /** Inclusive start week (1-indexed). Fractional weeks allowed (e.g. 1.0, 1.5). */
  startWeek: number;
  /** Bar duration in weeks (fractional). */
  durationWeeks: number;
  /** Legacy department; used as the color/legend default when `color` is unset. */
  role?: Role;
  /** Explicit bar color (hex). Overrides the role-derived color. */
  color?: string;
  /** Free-text category shown in the legend. Overrides the role label. */
  category?: string;
  note?: string;
}

export interface GanttGate {
  atWeek: number;
  label: string;
}

export interface SequentialStep {
  label: string;
  /** Calendar hour offset from day-1 8am. */
  startHour: number;
  /** Step duration in calendar hours. */
  durationHours: number;
  /** "cure" renders as a hatched (mold-in-press) band. */
  kind?: "process" | "quality" | "cure";
  /** Explicit step color (hex). Overrides the kind-derived color. */
  color?: string;
  /** Free-text category shown in the legend. */
  category?: string;
  note?: string;
}

export interface RiskItem {
  text: string;
  owner?: string;
  resolved?: boolean;
}

export interface DecisionItem {
  date: string;
  decision: string;
  source: "meeting" | "unilateral";
  author: string;
}

export interface ProjectRecord {
  projectNumber: string; // XXX-XXX
  name: string;
  programPrefix: string; // first 3 digits
  programName?: string;
  subtitle: string; // one-line constraint/context
  status: ProjectStatus;
  owner: string;
  lastUpdated: string;
  budgetTotal?: number;
  spentTotal?: number;
  sections: {
    summaryCards?: SummaryCard[][]; // rows of cards
    partsMaterial?: {
      rows: PartsRunRow[];
    };
    hoursByRole?: {
      rows: HoursRow[];
    };
    ganttOverview?: {
      totalWeeks: number;
      bars: GanttBar[];
      gates: GanttGate[];
    };
    ganttDetail?: {
      totalDays: number;
      workingStartHour: number; // 8 = 8am
      workingEndHour: number; // 17 = 5pm
      steps: SequentialStep[];
    };
    risks?: RiskItem[];
    decisions?: DecisionItem[];
    notes?: string[]; // markdown blocks
  };
}

export const ROLE_META: Record<
  Role,
  {
    label: string;
    stroke: string;
    fill: string;
    textOnFill: string;
    dotClass: string;
  }
> = {
  engineering: {
    label: "Engineering",
    stroke: "#534AB7",
    fill: "#CECBF6",
    textOnFill: "#2A2470",
    dotClass: "bg-[#534AB7]",
  },
  process: {
    label: "Process",
    stroke: "#0F6E56",
    fill: "#9FE1CB",
    textOnFill: "#085041",
    dotClass: "bg-[#0F6E56]",
  },
  automation: {
    label: "Automation",
    stroke: "#BA7517",
    fill: "#FAC775",
    textOnFill: "#633806",
    dotClass: "bg-[#BA7517]",
  },
  quality: {
    label: "Quality",
    stroke: "#993C1D",
    fill: "#F5C4B3",
    textOnFill: "#712B13",
    dotClass: "bg-[#993C1D]",
  },
};

/* ---------------------------------------------------------------------------
 * Gantt color resolution + dynamic legend.
 *
 * Bars/steps may carry an explicit `color` (hex) and `category` (free-text
 * legend label). When absent we fall back to the legacy role/kind palette so
 * existing data keeps rendering unchanged.
 * ------------------------------------------------------------------------- */

export interface LegendItem {
  label: string;
  fill: string;
  stroke: string;
  dashed?: boolean;
}

interface GanttStyle {
  fill: string;
  stroke: string;
  textOnFill: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function styleFromHex(color: string): GanttStyle | null {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return {
    stroke: `rgb(${r}, ${g}, ${b})`,
    fill: `rgba(${r}, ${g}, ${b}, 0.18)`,
    // Darken the same hue so the note text stays legible on the light fill,
    // regardless of how light the picked color is.
    textOnFill: `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.55)})`,
  };
}

export function ganttBarStyle(bar: { color?: string; role?: Role }): GanttStyle {
  if (bar.color) {
    const c = styleFromHex(bar.color);
    if (c) return c;
  }
  const meta = ROLE_META[bar.role ?? "engineering"];
  return { fill: meta.fill, stroke: meta.stroke, textOnFill: meta.textOnFill };
}

export function ganttBarLabel(bar: { category?: string; role?: Role }): string {
  return bar.category?.trim() || ROLE_META[bar.role ?? "engineering"].label;
}

export function ganttStepStyle(step: {
  color?: string;
  kind?: SequentialStep["kind"];
}): GanttStyle & { cure: boolean } {
  if (step.kind === "cure") {
    const c = step.color ? styleFromHex(step.color) : null;
    return { cure: true, fill: "url(#hatch)", stroke: c?.stroke ?? "#888780", textOnFill: "#73726c" };
  }
  if (step.color) {
    const c = styleFromHex(step.color);
    if (c) return { cure: false, ...c };
  }
  const meta = step.kind === "quality" ? ROLE_META.quality : ROLE_META.automation;
  return { cure: false, fill: meta.fill, stroke: meta.stroke, textOnFill: meta.textOnFill };
}

export function ganttStepLabel(step: { category?: string; kind?: SequentialStep["kind"] }): string {
  if (step.category?.trim()) return step.category.trim();
  if (step.kind === "cure") return "Cure hold (mold in press)";
  if (step.kind === "quality") return "Quality measurement";
  return "Process / setup";
}

export function buildGanttLegend(
  bars: GanttBar[] = [],
  steps: SequentialStep[] = []
): LegendItem[] {
  const out: LegendItem[] = [];
  const seen = new Set<string>();
  const push = (label: string, fill: string, stroke: string, dashed?: boolean) => {
    const key = `${label}|${stroke}|${dashed ? 1 : 0}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, fill, stroke, dashed });
  };
  for (const b of bars) {
    const s = ganttBarStyle(b);
    push(ganttBarLabel(b), s.fill, s.stroke);
  }
  let hasCure = false;
  for (const st of steps) {
    if (st.kind === "cure") {
      hasCure = true;
      continue;
    }
    const s = ganttStepStyle(st);
    push(ganttStepLabel(st), s.fill, s.stroke);
  }
  if (hasCure)
    push("Cure hold (mold in press, 24-hr clock)", "rgba(128,128,128,0.15)", "#888780", true);
  if (steps.length) push("Non-working hours", "#f1efe8", "#d3d1c7");
  return out;
}

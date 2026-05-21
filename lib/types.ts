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
  role: Role;
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
  kind: "process" | "quality" | "cure";
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

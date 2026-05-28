/*
 * Status taxonomy + display metadata. Status labels are a small
 * controlled vocabulary; the qualifier is free text the user types.
 *
 * Color mapping draws from the Noble Plastics palette and the role
 * palette already defined for the planning template.
 */

export type StatusLabel =
  | "on_track"
  | "in_progress"
  | "at_risk"
  | "blocked"
  | "pending"
  | "complete";

export const STATUS_LABELS: Array<{
  value: StatusLabel;
  display: string;
  pill: string; // bg + text classes
  bar: string; // accent strip class
}> = [
  {
    value: "on_track",
    display: "On Track",
    pill: "bg-[#0F6E56] text-white",
    bar: "bg-[#0F6E56]",
  },
  {
    value: "in_progress",
    display: "In Progress",
    pill: "bg-noble-navy text-white",
    bar: "bg-noble-navy",
  },
  {
    value: "at_risk",
    display: "At Risk",
    pill: "bg-[#BA7517] text-white",
    bar: "bg-[#BA7517]",
  },
  {
    value: "blocked",
    display: "Blocked",
    pill: "bg-noble-red text-white",
    bar: "bg-noble-red",
  },
  {
    value: "pending",
    display: "Pending",
    pill: "bg-noble-slate text-white",
    bar: "bg-noble-slate",
  },
  {
    value: "complete",
    display: "Complete",
    pill: "bg-noble-black text-white",
    bar: "bg-noble-black",
  },
];

export function statusMeta(label: string) {
  return (
    STATUS_LABELS.find((s) => s.value === label) ?? {
      value: "pending" as StatusLabel,
      display: "Pending",
      pill: "bg-noble-slate text-white",
      bar: "bg-noble-slate",
    }
  );
}

/*
 * Skeleton taxonomies — the small fixed structured header captured on
 * every status update alongside the free narrative. Each field maps to a
 * chip with a brand tone; all are optional so legacy updates render "—".
 */

export type ScheduleConfidence = "ahead" | "on_track" | "slipping" | "late";

export const SCHEDULE_CONFIDENCE: Array<{
  value: ScheduleConfidence;
  display: string;
  pill: string;
}> = [
  { value: "ahead", display: "Ahead", pill: "bg-[#0F6E56] text-white" },
  { value: "on_track", display: "On track", pill: "bg-noble-navy text-white" },
  { value: "slipping", display: "Slipping", pill: "bg-[#BA7517] text-white" },
  { value: "late", display: "Late", pill: "bg-noble-red text-white" },
];

export function scheduleMeta(value: string | null | undefined) {
  return SCHEDULE_CONFIDENCE.find((s) => s.value === value) ?? null;
}

export type BudgetConfidence = "under" | "on" | "over";

export const BUDGET_CONFIDENCE: Array<{
  value: BudgetConfidence;
  display: string;
  pill: string;
}> = [
  { value: "under", display: "Under budget", pill: "bg-[#0F6E56] text-white" },
  { value: "on", display: "On budget", pill: "bg-noble-navy text-white" },
  { value: "over", display: "Over budget", pill: "bg-noble-red text-white" },
];

export function budgetMeta(value: string | null | undefined) {
  return BUDGET_CONFIDENCE.find((b) => b.value === value) ?? null;
}

/** The structured header attached to a status update. */
export interface StatusSkeleton {
  scheduleConfidence: string | null;
  budgetConfidence: string | null;
  nextMilestone: string | null;
  nextMilestoneDate: Date | null;
  topFocus: string | null;
}

/** Common block headings; user can type whatever, but quick-picks help consistency. */
export const COMMON_BLOCK_HEADINGS = [
  "Update",
  "Impacts",
  "Logistics",
  "Commercial",
  "Risk",
  "Customer",
  "Execution",
  "Dependencies",
  "Concern",
  "Next Steps",
  "Context",
  "Current State",
] as const;

/** Department taxonomy used by ActionItem.ownerDept. */
export type OwnerDept =
  | "engineering"
  | "quality"
  | "process"
  | "automation"
  | "program_pm"
  | "operations"
  | "sales"
  | "purchasing"
  | "scheduling";

export const OWNER_DEPTS: Array<{ value: OwnerDept; display: string }> = [
  { value: "engineering", display: "Engineering" },
  { value: "quality", display: "Quality" },
  { value: "process", display: "Process" },
  { value: "automation", display: "Automation" },
  { value: "program_pm", display: "Program / PM" },
  { value: "operations", display: "Operations" },
  { value: "sales", display: "Sales" },
  { value: "purchasing", display: "Purchasing" },
  { value: "scheduling", display: "Scheduling" },
];

export function deptDisplay(d: string) {
  return OWNER_DEPTS.find((x) => x.value === d)?.display ?? d;
}

export interface StatusBlock {
  heading: string;
  body: string;
}

export function parseBlocks(json: string): StatusBlock[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (b): b is StatusBlock =>
            b && typeof b.heading === "string" && typeof b.body === "string"
        )
        .map((b) => ({ heading: b.heading, body: b.body }));
    }
  } catch {
    /* noop */
  }
  return [];
}

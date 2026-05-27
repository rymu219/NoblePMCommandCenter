import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/*
 * ONE-OFF BACKFILL — real Noble project data from
 * PM_Worksheets_Cleaned (May 2026). Idempotent: upserts programs,
 * users and projects; for each project's child collections it
 * delete-by-projectId then recreates, so re-running is clean.
 *
 * Run:  DATABASE_URL="<postgres url>" npm run backfill
 *
 * Excluded per request: Spectra (150-035), all structured
 * committed-spend numbers (committedTotal left null; "Committed
 * spend" tracks and "Committed" summary cards dropped).
 *
 * This file is intended to be removed from the repo after it has been
 * run once against the target database.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; aborting backfill.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// ---------------------------------------------------------------------------
// Staff roster. Ryan already exists as admin. Everyone else created here
// with password "nobleplastics". role engineer = logs time; viewer = read.
// Customer contacts (James Curcio / Keith Hudgens) intentionally NOT users.
// ---------------------------------------------------------------------------
interface StaffRow {
  email: string;
  name: string;
  role: "engineer" | "viewer";
  department: string;
}
const STAFF: StaffRow[] = [
  { email: "billy.mcdonald@nobleplastics.local", name: "Billy McDonald", role: "engineer", department: "engineering" },
  { email: "kenneth.earles@nobleplastics.local", name: "Kenneth Earles", role: "engineer", department: "engineering" },
  { email: "kris.labro@nobleplastics.local", name: "Kris Labro", role: "engineer", department: "engineering" },
  { email: "scott.rogers@nobleplastics.local", name: "Scott Rogers", role: "engineer", department: "engineering" },
  { email: "don.rogers@nobleplastics.local", name: "Don Rogers", role: "engineer", department: "engineering" },
  { email: "charles.langlinais@nobleplastics.local", name: "Charles Langlinais", role: "engineer", department: "quality" },
  { email: "bradford.colligan@nobleplastics.local", name: "Bradford Colligan", role: "engineer", department: "quality" },
  { email: "sandy.rowell@nobleplastics.local", name: "Sandy Rowell", role: "engineer", department: "quality" },
  { email: "richard.soulaire@nobleplastics.local", name: "Richard Soulaire", role: "engineer", department: "process" },
  { email: "kelsey.king@nobleplastics.local", name: "Kelsey King", role: "engineer", department: "process" },
  { email: "victor.darjean@nobleplastics.local", name: "Victor Darjean", role: "engineer", department: "automation" },
  { email: "vanessa.domingue@nobleplastics.local", name: "Vanessa Domingue", role: "viewer", department: "purchasing" },
  { email: "meagan.rouse@nobleplastics.local", name: "Meagan Rouse", role: "viewer", department: "purchasing" },
  { email: "raelyne.lindsey@nobleplastics.local", name: "Raelyne Lindsey", role: "viewer", department: "sales" },
  { email: "aimee.daigle@nobleplastics.local", name: "Aimee Daigle", role: "viewer", department: "sales" },
  { email: "pam.mouton@nobleplastics.local", name: "Pam Mouton", role: "viewer", department: "sales" },
  { email: "braden.hayes@nobleplastics.local", name: "Braden Hayes", role: "viewer", department: "sales" },
  // Ambiguous — confirm or delete:
  { email: "missy.rogers@nobleplastics.local", name: "Missy Rogers", role: "viewer", department: "scheduling" },
  { email: "jesse.sewell@nobleplastics.local", name: "Jesse Sewell", role: "viewer", department: "scheduling" },
  { email: "dajun.julien@nobleplastics.local", name: "Dajun Julien", role: "viewer", department: "operations" },
];

// ---------------------------------------------------------------------------
// Programs (prefix -> name/customer). 150 (Spectra) intentionally omitted.
// ---------------------------------------------------------------------------
const PROGRAMS: Array<{ prefix: string; name: string; customer: string }> = [
  { prefix: "647", name: "First Solar", customer: "First Solar" },
  { prefix: "112", name: "General Dynamics Plates A & B", customer: "General Dynamics" },
  { prefix: "439", name: "Manchac L&R Housing Wall Tool Rebuilds", customer: "Manchac Technologies, LLC" },
  { prefix: "576", name: "EDelta PCB Cover", customer: "EDelta" },
  { prefix: "663", name: "Gordon Hold Down Clip", customer: "Gordon" },
  { prefix: "646", name: "SMB Lightweight Box & Lid", customer: "Southern Meter Box (SMB)" },
  { prefix: "624", name: "Glove Guard Clips", customer: "Glove Guard" },
];

type Color = "slate" | "blue" | "purple" | "yellow" | "red";

interface ProjectData {
  id: string;
  name: string;
  subtitle: string;
  status: string; // active | on_hold | complete | archived | not_started
  budgetTotal: number | null;
  forecastTotal: number | null;
  headroomNote: string | null;
  nextTrigger: string | null;
  keyMilestone: string | null;
  dashboardHealth: "on_schedule" | "at_risk" | "off_track" | null;
  toggles: string[];
  statusUpdate: {
    label: string;
    qualifier: string;
    date: string;
    blocks: Array<{ heading: string; body: string }>;
    actions: Array<{ dept: string; body: string; due: string | null }>;
  } | null;
  phases: Array<{ name: string; start: string; end: string; color: Color; current: boolean }>;
  tracks: Array<{ name: string; amount: number; color: Color }>;
  summaryCards: Array<{ label: string; value: string; unit?: string }>;
  hoursByRole: Array<{ role: "engineering" | "process" | "automation" | "quality"; who: string; task: string; hours: number }>;
  risks: Array<{ text: string; owner?: string; resolved: boolean }>;
  decisions: Array<{ date: string; decision: string; source: "meeting" | "unilateral"; author: string }>;
  notes: string[];
  assign: string[]; // staff emails to give a ProjectAssignment
}

const PROJECTS: ProjectData[] = [
  // ===================================================================== 647-008
  {
    id: "647-008",
    name: "Bulkhead Automation",
    subtitle: "Bulkhead automation build on schedule; Cell 1 build complete target July 17",
    status: "active",
    budgetTotal: 552000,
    forecastTotal: 538000,
    headroomNote: "Under budget",
    nextTrigger: "Cells 2 & 3 procurement release ~2026-06-30",
    keyMilestone: "Cell 1 build complete 2026-07-17",
    dashboardHealth: "on_schedule",
    toggles: ["summary_cards", "hours_by_role", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "on_track",
      qualifier: "Build phase / procurement follow-up",
      date: "2026-05-21",
      blocks: [
        { heading: "Execution", body: "Bulkhead Automation on schedule; Cell 1 build complete targeted 2026-07-17." },
        { heading: "Commercial", body: "Approved budget 552000; forecast 538000." },
        { heading: "Logistics", body: "Cells 2 & 3 procurement release is the next trigger (~2026-06-30)." },
        { heading: "Next Steps", body: "Continue build execution through 7/17, then integration 7/20-8/14." },
      ],
      actions: [
        { dept: "automation", body: "Continue build execution for Cell 1", due: "2026-07-17" },
        { dept: "purchasing", body: "Release Cells 2 & 3 procurement", due: "2026-06-30" },
        { dept: "operations", body: "Support machining flow for 647-008 components; avoid back-loading machining late in schedule", due: null },
        { dept: "engineering", body: "Maintain design/drawing release support for EOAT, insert fixture, and remaining automation components", due: null },
      ],
    },
    phases: [
      { name: "Procurement", start: "2026-04-06", end: "2026-05-01", color: "slate", current: false },
      { name: "Build", start: "2026-03-30", end: "2026-07-17", color: "blue", current: true },
      { name: "Integration", start: "2026-07-20", end: "2026-08-14", color: "purple", current: false },
      { name: "Cell 1 Deploy", start: "2026-08-18", end: "2026-10-05", color: "yellow", current: false },
      { name: "Cells 2 & 3 Deploy", start: "2026-11-01", end: "2026-12-31", color: "red", current: false },
    ],
    tracks: [
      { name: "Track A — Fleet Buy", amount: 252000, color: "blue" },
      { name: "Track B — Cell 1", amount: 93000, color: "purple" },
      { name: "Cells 2 & 3 Repeat", amount: 193000, color: "yellow" },
    ],
    summaryCards: [
      { label: "Budget", value: "$552K", unit: "Approved" },
      { label: "Forecast", value: "$538K", unit: "Estimate at completion" },
      { label: "Headroom", value: "+$14K", unit: "Under budget" },
    ],
    hoursByRole: [
      { role: "engineering", who: "Billy McDonald", task: "Bulkhead Automation", hours: 21 },
      { role: "process", who: "Richard Soulaire", task: "647-008-PF-P6 machining", hours: 4 },
    ],
    risks: [
      { text: "Internal machining scope needs to be kept from back-loading late in the schedule", owner: "Ryan Murphy / Vanessa Domingue / Richard Soulaire", resolved: false },
      { text: "EOAT / insert fixture / part handling designs were not all ready at once; follow-on release dependencies", owner: "Don Rogers", resolved: false },
      { text: "Prior procurement timing risk identified around long-lead items", owner: "Billy McDonald / Purchasing", resolved: false },
    ],
    decisions: [
      { date: "2026-04-09", decision: "Bulkhead Automation tooling purchase coded to project 647-008", source: "unilateral", author: "Vanessa Domingue / Ryan Murphy" },
      { date: "2026-04-15", decision: "Cabinet Brackets 2 and 3 sent to Leading Edge; Cabinet Bracket 1 reference-only and not to be fabricated", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-16", decision: "Keyence invoice for 647-008 PO 12810 classified as Cell - General Use unless more granularity required", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "647-008 Bulkhead Automation is on schedule. Approved budget 552000, forecast 538000, ~14000 headroom. Current phase is build (3/30-7/17), followed by integration (7/20-8/14), Cell 1 deploy (8/18-10/5), Cells 2 & 3 deploy (11/1-12/31). Next trigger is Cells 2 & 3 procurement release ~6/30; key milestone is Cell 1 build complete 7/17. Supporting history shows machining planning, design release, fabricated component packages to Leading Edge, and ongoing weekly Bulkhead Automation sync cadence.",
    ],
    assign: ["billy.mcdonald@nobleplastics.local", "richard.soulaire@nobleplastics.local", "don.rogers@nobleplastics.local"],
  },

  // ===================================================================== 647-004
  {
    id: "647-004",
    name: "Bulkhead Housing",
    subtitle: "First Solar Bulkhead production tool build underway; critical path for Program 647 plastic part readiness",
    status: "active",
    budgetTotal: 1407869.97,
    forecastTotal: null,
    headroomNote: "Low spend / high schedule risk per March 20 executive status report",
    nextTrigger: "Bellco Feeders PO for Bulkhead Terminal samples",
    keyMilestone: "Bulkhead lower-limit plastic part availability 2026-08-21",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "in_progress",
      qualifier: "Production tool build underway / critical path",
      date: "2026-05-19",
      blocks: [
        { heading: "Execution", body: "Bulkhead 647-004 is the critical-path workstream; tool build underway; plastic part availability target unchanged." },
        { heading: "Dependencies", body: "First Solar requires all four parts simultaneously; May 5 status deck shows integrated PQ readiness lower-limit ~2026-08-24, upper-limit ~2026-10-10. Bulkhead lower-limit availability 2026-08-21; upper-limit 2026-10-10." },
        { heading: "Commercial", body: "March 20 executive status report — Bulkhead committed against budget plus contingency 1407869.97." },
        { heading: "Next Steps", body: "Issue PO for Bellco Feeders Quote #26-3187-01 for 5000 Bulkhead Terminal samples under 647-004." },
      ],
      actions: [
        { dept: "purchasing", body: "Issue PO to Bellco Feeders for Quote #26-3187-01, referencing quote in first line of PO", due: null },
        { dept: "program_pm", body: "Track Bulkhead plastic part availability against 2026-08-21 lower-limit and 2026-10-10 upper-limit", due: null },
        { dept: "engineering", body: "Maintain Bulkhead as critical-path workstream while production tool build remains underway", due: null },
        { dept: "quality", body: "Support incoming validation once Bulkhead first shots and samples become available", due: null },
        { dept: "program_pm", body: "Maintain integrated Program 647 readiness view because First Solar requires all four parts simultaneously", due: null },
      ],
    },
    phases: [
      // only phases with BOTH dates kept; date-less ones skipped
      { name: "First shots at tool builder", start: "2026-06-26", end: "2026-06-26", color: "purple", current: false },
      { name: "T0 samples arrive at Noble", start: "2026-07-06", end: "2026-07-06", color: "yellow", current: false },
      { name: "Noble T0 sample validation", start: "2026-07-10", end: "2026-07-10", color: "yellow", current: false },
      { name: "Tool arrives at Noble", start: "2026-07-24", end: "2026-07-24", color: "yellow", current: false },
      { name: "First shots at Noble", start: "2026-08-03", end: "2026-08-03", color: "red", current: false },
      { name: "Noble validation complete", start: "2026-08-13", end: "2026-08-13", color: "red", current: false },
      { name: "Production parts available", start: "2026-08-14", end: "2026-08-14", color: "red", current: false },
    ],
    tracks: [
      { name: "Budget + contingency", amount: 1407869.97, color: "purple" },
      { name: "Bellco Bulkhead Terminal samples", amount: 3600, color: "yellow" },
      { name: "Bulkhead Insert Tooling", amount: 26000, color: "slate" },
      { name: "Prototype Mold 1-Cav", amount: 25000, color: "slate" },
      { name: "Production Mold 8-Cavity", amount: 146400, color: "blue" },
      { name: "570 GE 2000 800 / 220 Ton IMM", amount: 179112, color: "purple" },
    ],
    summaryCards: [
      { label: "Status", value: "Tool build underway", unit: "Critical-path workstream" },
      { label: "Lower-limit availability", value: "2026-08-21", unit: "Bulkhead plastic part availability" },
      { label: "Upper-limit availability", value: "2026-10-10", unit: "Bulkhead plastic part availability" },
      { label: "Budget + contingency", value: "$1.41M", unit: "March 20 budget snapshot" },
      { label: "Bellco samples", value: "5000 pcs", unit: "Bulkhead Terminal samples quoted at 0.72 each" },
    ],
    hoursByRole: [
      { role: "engineering", who: "Bulkhead Housing", task: "16 (week of 2026-03-02) and 16 (week of 2026-03-09) per returned snippet", hours: 32 },
    ],
    risks: [
      { text: "Bulkhead remains the critical path for the First Solar program across multiple status sources", owner: "Ryan Murphy / Engineering", resolved: false },
      { text: "First Solar requires all four parts simultaneously; Bulkhead affects integrated PQ readiness", owner: "Program-PM", resolved: false },
      { text: "Earlier status reports identified Bulkhead tooling issues as blocking representative part production and downstream validation", owner: "Engineering / Program-PM", resolved: false },
      { text: "March 27 executive status: First Solar confirmed qualification will only be accepted from the 8-cavity production tool, eliminating the previously assumed 1-cavity validation path", owner: "Engineering / Program-PM", resolved: false },
      { text: "Bellco quote excludes shipping/transportation to Noble; F.O.B. origin, freight prepaid and charged back", owner: "Purchasing / Program-PM", resolved: false },
    ],
    decisions: [
      { date: "2026-03-27", decision: "First Solar confirmed qualification will only be accepted from the 8-cavity production tool, eliminating previously assumed 1-cavity validation path", source: "unilateral", author: "Ryan Murphy / First Solar status source" },
      { date: "2026-04-10", decision: "Bulkhead 1-cavity design released to tool builder, removing primary constraint blocking program progression at that time", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-14", decision: "Bulkhead production tool build kicked off with tool builder", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-12", decision: "Request issued to Purchasing for Bellco Feeders Quote #26-3187-01: 5000 Bulkhead Terminal samples", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "647-004 is the First Solar Bulkhead Housing workstream and remains the critical-path item in the Program 647 readiness view. Earlier March status showed Bulkhead delayed due to tooling issues that blocked representative part production and downstream validation. By April the direction shifted: the Bulkhead 1-cavity design was released 2026-04-10 and the full Bulkhead production tool build kicked off 2026-04-14. The May 5 status deck shows tool build underway with first shots around late June and plastic part availability bounded between 2026-08-21 and 2026-10-10. Commercially, the March 20 status report listed Bulkhead committed against budget plus contingency of 1407869.97. A current purchasing action exists for Bellco Feeders Quote #26-3187-01: 5000 Bulkhead Terminal samples at 0.72 each, total 3600.",
    ],
    assign: ["billy.mcdonald@nobleplastics.local", "kenneth.earles@nobleplastics.local"],
  },

  // ===================================================================== 647-005
  {
    id: "647-005",
    name: "Lid",
    subtitle: "First Solar Lid dimensional measurement and recut authorization path; parts availability target 2026-07-15",
    status: "active",
    budgetTotal: 784753.91,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Recut authorization after dimensional measurement closure",
    keyMilestone: "Lid parts availability target 2026-07-15",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "in_progress",
      qualifier: "Dimensional measurement closing / recut authorization pending",
      date: "2026-05-19",
      blocks: [
        { heading: "Execution", body: "May 19 weekly status says Lid is 'closing'; dimensional measurements closing that week; recut authorization to follow immediately." },
        { heading: "Dependencies", body: "May 5 status deck lists Lid 647-005 as active with dimensional measurement in progress; both lower-limit and upper-limit availability shown as 2026-07-15." },
        { heading: "Commercial", body: "March 20 executive status budget snapshot — Lid committed against budget plus contingency 784753.91." },
        { heading: "Risk", body: "On 2026-04-01, Kelsey King reported caliper measurements on the high side of tolerance and anticipated the tool needing to leave for dimensional corrections, plus possible work on gates, polish, and date wheels." },
        { heading: "Next Steps", body: "Complete dimensional measurement closure; proceed with recut authorization." },
      ],
      actions: [
        { dept: "quality", body: "Close Lid dimensional measurements", due: null },
        { dept: "engineering", body: "Authorize recut after dimensional measurements close", due: null },
        { dept: "process", body: "Maintain stable Lid processing basis for dimensional evaluation and recut decision", due: null },
        { dept: "program_pm", body: "Track Lid parts availability to the 2026-07-15 target", due: "2026-07-15" },
        { dept: "quality", body: "Ensure inspection/measurement results are stored and available for recut/validation decisions", due: null },
      ],
    },
    phases: [
      { name: "DOE / process trials", start: "2026-04-06", end: "2026-04-10", color: "purple", current: false },
    ],
    tracks: [
      { name: "Budget + contingency", amount: 784753.91, color: "purple" },
      { name: "Production Mold 16-Cavity LID01", amount: 143600, color: "slate" },
      { name: "520 GE 1500 400 / 165 Ton IMM", amount: 167194.7, color: "blue" },
      { name: "IMM rigging", amount: 10000, color: "yellow" },
      { name: "Material dryer & conveying system", amount: 25000, color: "purple" },
      { name: "Installation & structure", amount: 25000, color: "purple" },
      { name: "Copilot", amount: 13000, color: "yellow" },
    ],
    summaryCards: [
      { label: "Status", value: "Active", unit: "Dimensional measurement / recut authorization path" },
      { label: "Parts availability", value: "2026-07-15", unit: "Lower and upper target both shown as Jul 15" },
      { label: "Budget + contingency", value: "$784.8K", unit: "March 20 budget snapshot" },
      { label: "Tool status", value: "At GC / validation started", unit: "Lid tool arrived at GC 2026-03-06; Noble validation began 2026-03-30" },
      { label: "Latest trigger", value: "Recut authorization", unit: "Follows dimensional measurement closure" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Caliper measurements reported on the high side of tolerance on 2026-04-01", owner: "Kelsey King / Engineering", resolved: false },
      { text: "Tool may need dimensional corrections and possible work on gates, polish, date wheels", owner: "Engineering / Tooling", resolved: false },
      { text: "Dimensional measurement closure required before recut authorization", owner: "Quality / Engineering", resolved: false },
      { text: "Program 647 integrated readiness depends on all four parts being available; Lid is one of the initial mold workstreams", owner: "Program-PM", resolved: false },
      { text: "Earlier status tied Lid to Bulkhead dependency/risk in program-level view", owner: "Program-PM / Engineering", resolved: false },
    ],
    decisions: [
      { date: "2026-03-20", decision: "Lid listed as On Track/At Risk with tool at GC and Bulkhead dependency", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-27", decision: "Lid listed as On Track with initial run scheduled for 2026-03-30", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-01", decision: "Planned to finish processing and run ~30 shots for formal dimensional layouts after dried material was available", source: "unilateral", author: "Kelsey King" },
      { date: "2026-05-19", decision: "Lid described as closing; recut authorization to follow dimensional measurement closure", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "647-005 is the First Solar Lid workstream. The Lid tool arrived at GC 2026-03-06 and Noble validation began 2026-03-30. On 2026-04-01, Kelsey King reported the tool was making parts under 30 seconds, process fine-tuning paused after dried material ran out, and caliper measurements were on the high side of tolerance. The May 5 status deck shows Lid as active with dimensional measurement in progress and a 2026-07-15 parts availability target. The May 19 weekly status says Lid is closing, dimensional measurements are closing, and recut authorization follows immediately. Financially, the March 20 budget snapshot lists committed against budget plus contingency of 784753.91.",
    ],
    assign: ["kelsey.king@nobleplastics.local"],
  },

  // ===================================================================== 647-006
  {
    id: "647-006",
    name: "Pigtail Housing",
    subtitle: "First Solar Pigtail recut released; parts availability target 2026-08-24",
    status: "active",
    budgetTotal: 1329207.95,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Tool builder execution after recut release",
    keyMilestone: "Pigtail parts availability lower-limit target 2026-08-24",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "in_progress",
      qualifier: "Recut released / parts availability tracking",
      date: "2026-05-19",
      blocks: [
        { heading: "Execution", body: "May 19 weekly status — Pigtail was closed, dimensional measurements closed as expected, recut design finalized, recut released to tool builder." },
        { heading: "Dependencies", body: "May 5 status deck lists Pigtail 647-006 in progress; lower-limit parts availability 2026-08-24, upper-limit 2026-10-06." },
        { heading: "Commercial", body: "March 27 executive status report — Pigtail 647-006 committed against budget plus contingency 1329207.95." },
        { heading: "Risk", body: "On March 27, Pigtail was listed as at risk because the tool was paused and dependent on Bulkhead." },
        { heading: "Next Steps", body: "Track recut execution after release to tool builder; hold parts availability target of 2026-08-24." },
      ],
      actions: [
        { dept: "engineering", body: "Track released Pigtail recut design with tool builder", due: null },
        { dept: "quality", body: "Retain dimensional measurement records used to finalize recut design", due: null },
        { dept: "program_pm", body: "Track Pigtail parts availability to 2026-08-24 lower-limit and 2026-10-06 upper-limit", due: "2026-08-24" },
        { dept: "quality", body: "Schedule / complete Pigtail tab-data inspection scope as requested by Kris Labro", due: null },
        { dept: "program_pm", body: "Maintain Program 647 integrated readiness view because First Solar requires all four parts simultaneously", due: null },
      ],
    },
    phases: [
      // all phases were date-less except none with both dates; skip all
    ],
    tracks: [
      { name: "Budget + contingency", amount: 1329207.95, color: "purple" },
      { name: "Production Mold 8-Cavity PT01", amount: 135900, color: "slate" },
      { name: "570 GE 2000 800 / 220 Ton IMM PT01", amount: 193211, color: "blue" },
      { name: "IMM rigging PT01", amount: 10000, color: "yellow" },
      { name: "Material dryer & conveying system PT01", amount: 25000, color: "purple" },
      { name: "Installation & structure PT01", amount: 25000, color: "purple" },
      { name: "Copilot PT01", amount: 13000, color: "yellow" },
    ],
    summaryCards: [
      { label: "Status", value: "In Progress", unit: "Recut released to tool builder" },
      { label: "Lower-limit availability", value: "2026-08-24", unit: "Pigtail parts availability target" },
      { label: "Upper-limit availability", value: "2026-10-06", unit: "Pigtail parts availability target" },
      { label: "Budget + contingency", value: "$1.33M", unit: "March 27 budget snapshot" },
      { label: "Recut status", value: "Released", unit: "Dimensional measurements closed as expected; recut design finalized and released" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Pigtail was previously at risk because the tool was paused and dependent on Bulkhead", owner: "Engineering / Program-PM", resolved: true },
      { text: "Pigtail parts availability remains tied to Program 647 integrated readiness; First Solar requires all four parts simultaneously", owner: "Program-PM", resolved: false },
      { text: "Pigtail tab-data inspection identified by Kris Labro as critical path for the department during week of May 13", owner: "Kris Labro / Quality", resolved: false },
      { text: "Open questions on inspection method, program availability, part quantity, runtime per part, and inspection details for work-order reference", owner: "Vanessa Domingue / Quality", resolved: false },
    ],
    decisions: [
      { date: "2026-03-20", decision: "Pigtail listed as At Risk with tool paused and Bulkhead dependency", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-27", decision: "Pigtail remained At Risk; tool paused and Bulkhead dependency noted", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-14", decision: "Pigtail listed as In Progress; inspection/dimensional analysis in progress; design release to tool builder targeted 2026-05-01", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-19", decision: "Pigtail closed; dimensional measurements closed as expected; recut design finalized and released to tool builder", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "647-006 is the First Solar Pigtail Housing workstream. Earlier program status listed Pigtail as at risk because the tool was paused and dependent on Bulkhead. By April 14, Pigtail had moved to in-progress with inspection and dimensional analysis underway and design release to the tool builder targeted 2026-05-01. The May 5 status deck showed Pigtail in progress with recut design in final stages and release to tool builder targeted that week. The May 19 weekly status then closed that loop: dimensional measurements closed as expected, recut design finalized, recut released to tool builder, with parts availability stated as 2026-08-24. Financially, the March 27 budget snapshot listed committed against budget plus contingency of 1329207.95.",
    ],
    assign: ["kris.labro@nobleplastics.local", "bradford.colligan@nobleplastics.local"],
  },

  // ===================================================================== 112-071
  {
    id: "112-071",
    name: "Plate A & B Tooling Modification",
    subtitle: "General Dynamics Plate A & B tooling modification and equipment scope (engineering change + TrueBlend blender + DustBeater vacuums)",
    status: "active",
    budgetTotal: 62584,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Confirm final qualification / PCA path and signed PO language",
    keyMilestone: "Customer PO request date aligned to 2026-04-15 in Teams discussion",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "in_progress",
      qualifier: "Coordination-heavy — qualification and PO-language dependent",
      date: "2026-05-13",
      blocks: [
        { heading: "Execution", body: "Engineering changes for Plates A & B fully defined and released under 112-071; customer PO and internal Sales Order in place; tooling and equipment POs issued; tool in execution at Byrne for approved modification scope." },
        { heading: "Commercial", body: "Noble proposal scope is 'Tooling Modification and Equipment' — Plate A & B engineering change 45445, TB-T TrueBlend Blender 13476, four DB8-DustBeater Vacuum units totaling 10618." },
        { heading: "Logistics", body: "Proposed schedule: tool shipment to Noble 4/6-4/8; blender/vacuum shipment 3/25-3/31; blender/vacuum setup 4/1-4/8." },
        { heading: "Customer", body: "GD requested PO language tying lead time to qualification of tools and sampling; GD later sent updated PO 138168-03 with requested language added and asked for signed copy." },
        { heading: "Risk", body: "Quality/contract risk tied to whether Noble can satisfy the drawings and quality document and whether tools have been qualified; Scott Rogers stated that absent yes answers, Noble can only accept the PO provisionally based on acceptance of qualified parts." },
        { heading: "Next Steps", body: "Confirm tooling completion status, quality/PCA path, material compliance against redlined drawings, equipment ownership/tracking, and Byrne invoice/payment status." },
      ],
      actions: [
        { dept: "engineering", body: "Confirm final technical position on whether Noble can satisfy drawings and quality document for A/B Plate work", due: null },
        { dept: "engineering", body: "Review GD quality document / drawings and confirm whether requirements can be satisfied", due: null },
        { dept: "quality", body: "Confirm tools have been qualified; define remaining PCA / qualification requirements", due: null },
        { dept: "quality", body: "Support qualification and sampling tied to modified A-B Plates tool", due: null },
        { dept: "program_pm", body: "Track schedule against tool shipment, set, qualification, and inspection windows", due: null },
        { dept: "purchasing", body: "Confirm Byrne tooling invoice status; AP looking into outstanding invoices for 112-071", due: null },
        { dept: "sales", body: "Confirm final signed PO package / acceptance status for GD PO 138168-03 language on qualification, sampling, lead time", due: null },
        { dept: "program_pm", body: "Confirm customer-owned equipment treatment and any GD property tracking requirements for Conair blender and vacuum", due: null },
      ],
    },
    phases: [
      { name: "Tool Sampling @ Tool Builder", start: "2026-03-26", end: "2026-03-27", color: "slate", current: false },
      { name: "Noble Review / Approval", start: "2026-04-03", end: "2026-04-03", color: "blue", current: false },
      { name: "Tool Shipment to Noble", start: "2026-04-06", end: "2026-04-08", color: "purple", current: false },
      { name: "Blender / Vacuum Setup", start: "2026-04-01", end: "2026-04-08", color: "yellow", current: false },
      { name: "Production Tool Set", start: "2026-04-10", end: "2026-04-10", color: "yellow", current: false },
      { name: "Qualification Run — Plate A", start: "2026-04-13", end: "2026-04-15", color: "red", current: false },
      { name: "Qualification Run — Plate B", start: "2026-04-16", end: "2026-04-20", color: "red", current: false },
      { name: "Quality Inspection — Plate A", start: "2026-04-16", end: "2026-04-20", color: "yellow", current: false },
      { name: "Quality Inspection — Plate B", start: "2026-04-21", end: "2026-04-24", color: "yellow", current: false },
      { name: "Awaiting Customer Approval", start: "2026-04-22", end: "2026-04-22", color: "red", current: false },
    ],
    tracks: [
      { name: "Plate A & B Engineering Change", amount: 45445, color: "blue" },
      { name: "TB-T TrueBlend Blender", amount: 13476, color: "purple" },
      { name: "DB8-DustBeater Vacuum", amount: 10618, color: "yellow" },
      { name: "Byrne Tool + Design modification PO request", amount: 40900, color: "slate" },
      { name: "PCA funding added by GD", amount: 14000, color: "red" },
    ],
    summaryCards: [
      { label: "Noble Quote", value: "$69,539", unit: "Sales revenue (sum of proposal line items)" },
      { label: "Budget", value: "$62,584", unit: "Project budget" },
      { label: "Tooling Expense", value: "$40,900", unit: "Byrne tooling scope" },
      { label: "Equipment Expense", value: "$21,684", unit: "Conair equipment scope" },
      { label: "Margin", value: "$6,955", unit: "10.00%" },
      { label: "PCA funding added", value: "$14,000", unit: "GD added 3500 per part for PO value increase of 14000" },
      { label: "Key schedule date", value: "2026-04-15", unit: "Customer PO request date aligned in Teams discussion" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Tool qualification / quality document acceptance: can Noble satisfy drawings and quality document; have tools been qualified", owner: "Engineering / Quality", resolved: false },
      { text: "Conditional PO acceptance: absent yes answers on quality/qualification, Noble can only accept PO provisionally", owner: "Commercial / Program-PM", resolved: false },
      { text: "Redlined drawing risk: moving into production on redlined rather than official completed drawings", owner: "Engineering / Customer", resolved: false },
      { text: "Material compliance: confirm Noble quote 112-066 E2 materials meet specs on each redlined drawing", owner: "Engineering / Quality", resolved: false },
      { text: "Equipment ownership / tracking: treat Conair blender and vacuum as customer-owned for GD; possible property tracking requirements", owner: "Program-PM / Commercial", resolved: false },
      { text: "Byrne invoice / payment follow-up; AP investigating whether two invoices outstanding for 112-071", owner: "Meagan Rouse", resolved: false },
      { text: "Lead time contingent on tool qualification and sampling per GD requested PO language", owner: "Raelyne Lindsey / GD-OTS", resolved: false },
      { text: "Broader GD coordination fragmented across technical and commercial fronts; requires consolidation", owner: "Program-PM", resolved: false },
    ],
    decisions: [
      { date: "2026-02-02", decision: "PO request issued to Byrne Tool + Design for 112-071, Quote #20901-C, 40900", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-05", decision: "Project summarized as scope locked, POs issued, tooling modification in progress, low residual executional risk", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-12", decision: "Current ETA for GD Plate A & B molds from Byrne stated as April 3, pending firmer estimate", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-31", decision: "SO#6230 released from ON HOLD; Qualification and Capability line items added; order ready to move forward", source: "unilateral", author: "Raelyne Lindsey" },
      { date: "2026-03-31", decision: "GD added PCA funding of 3500 per part (PO value increase 14000)", source: "unilateral", author: "Keith Hudgens / Raelyne Lindsey" },
      { date: "2026-04-02", decision: "SO#6187 due date moved to 2026-04-15 to align with customer PO request", source: "unilateral", author: "Ryan Murphy / Raelyne Lindsey" },
      { date: "2026-04-06", decision: "Required review questions identified: anything changed; can Noble satisfy drawings/quality document; have tools been qualified", source: "unilateral", author: "Scott Rogers" },
      { date: "2026-04-10", decision: "Outlined conditional acceptance / phased work / as-is options for GD PO gaps tied to redlined drawings, inspection criteria, unpaid rework, margin erosion", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-30", decision: "GD sent updated PO 138168-03 with requested language added; requested signed copy", source: "unilateral", author: "Keith Hudgens" },
      { date: "2026-05-06", decision: "Conair blender and vacuum should be treated as customer-owned equipment for GD, not Noble-owned NRE/capital", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-13", decision: "GD's PO and Noble's quote sent to Missy Rogers for reference", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "112-071 is the GD Plate A & B Tooling Modification project. Proposal scope is 'Tooling Modification and Equipment' — Plate A & B engineering change, TB-T TrueBlend Blender, and DB8-DustBeater vacuum equipment. The Byrne PO request was issued against Quote #20901-C for 40900; engineering changes are released, customer PO / internal SO are in place, tooling/equipment POs issued, and the tool is in execution with Byrne. The proposed schedule covers tool builder sampling, Noble review/approval, shipment to Noble, equipment setup, tool set, Plate A and Plate B qualification runs, quality inspection, and customer approval. The project remains coordination-heavy due to unresolved items around PCA funding, quality document review, tool qualification, redlined drawings, material compliance, customer-owned equipment treatment, and Byrne invoice/payment follow-up.",
    ],
    assign: ["kenneth.earles@nobleplastics.local", "charles.langlinais@nobleplastics.local", "scott.rogers@nobleplastics.local"],
  },

  // ===================================================================== 439-009
  {
    id: "439-009",
    name: "Left and Right Housing Wall Tool Rebuilds",
    subtitle: "New tool builds for DCN0006/DCN0007; entering validation after tool arrival",
    status: "active",
    budgetTotal: 44500,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Receive / un-crate / clean / inspect tools 2026-05-21",
    keyMilestone: "Sales order promise date 2026-06-05",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "at_risk",
      qualifier: "Tool arrival / sampling / capability planning",
      date: "2026-05-14",
      blocks: [
        { heading: "Execution", body: "Validation plan calls for both sampling and capability runs for each tool; no DOE required." },
        { heading: "Logistics", body: "Tools expected to be received, uncrated, cleaned, and inspected 2026-05-21 after sea travel." },
        { heading: "Commercial", body: "Outstanding billing identified at 21198 (tooling milestones, resin, ocean freight)." },
        { heading: "Risk", body: "Manchac requested additional samples beyond original 15 LH + 15 RH plan; charging decision needed." },
        { heading: "Next Steps", body: "Set DCN0006 LH on 2026-05-27 for sampling/capability; set DCN0007 RH on 2026-06-02 for sampling/capability." },
      ],
      actions: [
        { dept: "operations", body: "Receive, un-crate, clean, and inspect L/R housing wall tools", due: "2026-05-21" },
        { dept: "process", body: "Set DCN0006 Left Housing Wall and run sampling/capability", due: "2026-05-27" },
        { dept: "process", body: "Set DCN0007 Right Housing Wall and run sampling/capability", due: "2026-06-02" },
        { dept: "quality", body: "Measure 15 sampling parts and 30 capability parts per tool", due: null },
        { dept: "sales", body: "Confirm how to charge Manchac for requested additional samples", due: null },
        { dept: "scheduling", body: "Update sales order promise date to 2026-06-05", due: "2026-06-05" },
      ],
    },
    phases: [
      { name: "Tool shipment / ocean freight", start: "2026-03-31", end: "2026-05-21", color: "slate", current: false },
      { name: "Tool receipt / clean / inspect", start: "2026-05-21", end: "2026-05-21", color: "blue", current: true },
      { name: "DCN0006 sampling / capability", start: "2026-05-27", end: "2026-05-29", color: "yellow", current: false },
      { name: "DCN0007 sampling / capability", start: "2026-06-02", end: "2026-06-04", color: "yellow", current: false },
      { name: "Sales order promise date", start: "2026-06-05", end: "2026-06-05", color: "red", current: false },
    ],
    tracks: [
      { name: "Left Housing Wall tool", amount: 22250, color: "blue" },
      { name: "Right Housing Wall tool", amount: 22250, color: "purple" },
      { name: "Ocean freight", amount: 3000, color: "yellow" },
      { name: "Resin", amount: 398, color: "slate" },
    ],
    summaryCards: [
      { label: "Tooling", value: "$44,500", unit: "Left + Right molds" },
      { label: "Outstanding billing", value: "$21,198", unit: "Milestones + freight + resin" },
      { label: "Sea freight", value: "$3,000", unit: "Shipping separate from credit" },
      { label: "Promise date", value: "2026-06-05", unit: "Sales order update requested" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Tools delayed; revised receipt/qualification schedule moved into late May / early June", owner: "Vanessa Domingue", resolved: false },
      { text: "Additional customer sample quantity requires billing/charging decision", owner: "Scott Rogers / Sales", resolved: false },
      { text: "Import duties / fees not available in earlier update", owner: "Ryan Murphy / Raelyne Lindsey", resolved: false },
      { text: "Quality measurement duration per part still needs confirmation for validation schedule", owner: "Charles Langlinais", resolved: false },
      { text: "Need to confirm final Manchac assembly testing quantity", owner: "Sales", resolved: false },
    ],
    decisions: [
      { date: "2026-03-25", decision: "Proceed with sea freight for Manchac tools", source: "unilateral", author: "Jesse Sewell" },
      { date: "2026-05-12", decision: "Complete both sampling and capability runs; no DOE required", source: "meeting", author: "Ryan Murphy" },
      { date: "2026-05-14", decision: "Manchac-requested sampling to be invoiced; charge structure still to be decided by Sales", source: "unilateral", author: "Aimee Daigle / Ryan Murphy" },
      { date: "2026-05-14", decision: "Update sales order promise date to 2026-06-05", source: "unilateral", author: "Vanessa Domingue" },
    ],
    notes: [
      "439-009 covers new tool builds for Manchac's Left and Right Housing Walls (DCN0006 / DCN0007). The quoted tooling option lists a 1-cavity P20 steel left housing wall mold and a 1-cavity P20 steel right housing wall mold at 22250 each, with shipping and tariffs TBD at time of shipment. Tools were picked up with tracking BSIU9530159; later planning shifted to receipt/un-crate/clean/inspect on 2026-05-21, DCN0006 sampling/capability beginning 2026-05-27, DCN0007 sampling/capability beginning 2026-06-02, and a requested sales order promise date of 2026-06-05. Validation calls for both sampling and capability runs, no DOE, a Keyence measurement program, and Quality review. Open commercial items: milestone invoicing, ocean freight, resin, import-related costs, and how to charge Manchac for additional requested samples.",
    ],
    assign: ["charles.langlinais@nobleplastics.local", "richard.soulaire@nobleplastics.local"],
  },

  // ===================================================================== 576-005
  {
    id: "576-005",
    name: "PCB Cover Modification",
    subtitle: "Tool modification complete; limited requalification blocked by customer payment",
    status: "on_hold",
    budgetTotal: 5200,
    forecastTotal: 5778,
    headroomNote: "Over budget / payment issue",
    nextTrigger: "Customer payment received",
    keyMilestone: "Tool returned to GC 2026-03-18",
    dashboardHealth: "off_track",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "blocked",
      qualifier: "Payment hold / limited requalification pending",
      date: "2026-03-23",
      blocks: [
        { heading: "Execution", body: "Tool modifications complete and inspected; clean changes, no damage, no shutoff areas affected." },
        { heading: "Commercial", body: "Customer overdue on payment; work on hold until payment received for PCB Cover." },
        { heading: "Risk", body: "Requalification required but limited in scope; part weight changed ~7% due to removal of standoff features." },
        { heading: "Next Steps", body: "Perform limited requalification, run 30-40 qualification parts at QC discretion, complete dimensional inspection, test final parts for fitment after cure." },
      ],
      actions: [
        { dept: "sales", body: "Resolve customer payment issue before requalification proceeds", due: null },
        { dept: "quality", body: "Measure 30-40 qualification parts using production inspection methods", due: null },
        { dept: "process", body: "Make required processing adjustments for limited requalification", due: null },
        { dept: "quality", body: "Test final parts for fitment in QC test assembly after cure time", due: null },
        { dept: "sales", body: "Invoice customer for tooling modifications, final 50%, and shipping costs", due: null },
      ],
    },
    phases: [
      { name: "Tool arrival / inspection", start: "2026-03-18", end: "2026-03-20", color: "purple", current: false },
    ],
    tracks: [
      { name: "PCB Cover tool modification", amount: 5778, color: "blue" },
      { name: "Budget", amount: 5200, color: "purple" },
      { name: "Freight to Byrne", amount: 184.39, color: "yellow" },
    ],
    summaryCards: [
      { label: "Quote", value: "$5,778", unit: "Tool modification estimate" },
      { label: "Budget", value: "$5,200", unit: "Internal budget" },
      { label: "Freight", value: "$184.39", unit: "Ship mold to Byrne" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Customer payment overdue; work on hold until payment received", owner: "Braden Hayes / Raelyne Lindsey", resolved: false },
      { text: "Limited requalification required before production clearance", owner: "Kenneth Earles / Quality", resolved: false },
      { text: "Part weight changed ~7% due to removed standoff features", owner: "Kenneth Earles", resolved: false },
      { text: "Customer owes full amount including deposit per March financial update", owner: "Pam Mouton / Sales", resolved: false },
    ],
    decisions: [
      { date: "2026-03-20", decision: "Classify work as Qualification (not capability study, DOE, or experimental)", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-03-20", decision: "Freight cost to ship EDelta mold = 184.39", source: "unilateral", author: "Dajun Julien" },
      { date: "2026-03-23", decision: "Invoice customer for everything included in mold modifications", source: "unilateral", author: "Braden Hayes" },
    ],
    notes: [
      "576-005 covers the EDelta PCB Cover tool modification. Proposal scope is 'PCB Cover-Tool Modification': weld/remove five rib features, replace five sub-inserts, modify part number, bench to match, estimated 5778, shipping excluded. Mold modification was complete and shipped from Byrne 2026-03-16, expected arrival at GC 2026-03-18. After inspection changes were described as clean — no damage, no shutoff areas affected. Requalification is required but limited: process adjustments, 30-40 qualification parts at QC discretion, production inspection methods, fitment testing after cure. Key blocker is commercial: payment overdue; work on hold until payment received.",
    ],
    assign: ["kenneth.earles@nobleplastics.local"],
  },

  // ===================================================================== 663-002
  {
    id: "663-002",
    name: "Gordon Hold Down Clip",
    subtitle: "Tool repair, capability study, customer sample approval, and production recovery",
    status: "active",
    budgetTotal: null,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Confirm measurement/inspection approach",
    keyMilestone: "Gordon approved samples 2026-05-01",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "in_progress",
      qualifier: "Customer sample approved / production recovery",
      date: "2026-05-07",
      blocks: [
        { heading: "Execution", body: "Parts run, capability study conducted, report compiled, 24 pieces overnighted to Gordon for review." },
        { heading: "Customer", body: "Gordon received samples and approved parts based on review; also provided redlined drawing requiring review before proceeding cleanly." },
        { heading: "Logistics", body: "Repaired tool shipped via XPO Logistics guaranteed 2-day truck freight at 536.44; later tracking placed tool in Shreveport before final delivery." },
        { heading: "Risk", body: "Engineering still needs to formalize measurement/inspection approach after customer approval and redlined drawing feedback." },
        { heading: "Next Steps", body: "Proceed after review of Gordon's redlined drawing and completion of internal measurement/inspection approach." },
      ],
      actions: [
        { dept: "engineering", body: "Review Gordon redlined drawing and confirm enough clarity to proceed", due: null },
        { dept: "quality", body: "Formalize measurement/inspection approach for Hold Down Clip", due: null },
        { dept: "quality", body: "Measure/report 15 of 30 capability shots; Keyence time ~5 minutes per shot", due: null },
        { dept: "operations", body: "Provide pallet weights/dimensions and count for Gordon Hold Down Clip shipment", due: null },
        { dept: "program_pm", body: "Coordinate customer update after engineering/quality path is confirmed", due: null },
      ],
    },
    phases: [
      { name: "Tool freight to Noble", start: "2026-04-27", end: "2026-04-29", color: "purple", current: false },
      { name: "Capability / sample review", start: "2026-04-30", end: "2026-05-01", color: "yellow", current: false },
      { name: "Production recovery / shipments", start: "2026-05-07", end: "2026-05-07", color: "yellow", current: true },
    ],
    tracks: [
      { name: "Byrne repair quote", amount: 14500, color: "blue" },
      { name: "XPO guaranteed freight", amount: 536.44, color: "purple" },
    ],
    summaryCards: [
      { label: "Repair quote", value: "$14,500", unit: "Byrne repair scope" },
      { label: "Freight", value: "$536.44", unit: "XPO guaranteed 2-day" },
      { label: "Sample shipment", value: "24 pcs", unit: "Overnighted to Gordon" },
      { label: "Customer approval", value: "Approved", unit: "Samples received 2026-05-01" },
    ],
    hoursByRole: [
      { role: "quality", who: "Charles Langlinais", task: "Keyence capability measurement", hours: 0 },
      { role: "engineering", who: "Kenneth Earles", task: "Gordon Hold Down Clip", hours: 0 },
    ],
    risks: [
      { text: "Redlined drawing from Gordon needs review before proceeding cleanly", owner: "Engineering", resolved: false },
      { text: "Measurement/inspection approach still needs formalization", owner: "Engineering / Quality", resolved: false },
      { text: "Byrne identified flash and alignment-related items during repair review", owner: "Ryan Murphy / Kenneth Earles", resolved: false },
      { text: "Capability approval affected downstream production timing", owner: "Sandy Rowell / Quality", resolved: false },
      { text: "Ejector pin failure added to existing IQMS issue history for the Hold Down Clip tool", owner: "Raelyne Lindsey", resolved: false },
    ],
    decisions: [
      { date: "2026-03-04", decision: "Submit PO to Byrne for 14500 repair quote with requested completion date 2026-04-08", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-27", decision: "Proceed with XPO Logistics guaranteed 2-day truck freight at 536.44", source: "unilateral", author: "Ryan Murphy / Aimee Daigle" },
      { date: "2026-04-30", decision: "Overnight 24 pieces to Gordon for review after capability study and report", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-01", decision: "Gordon approved samples based on their review", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "663-002 covers Gordon Hold Down Clip tool repair and production recovery. Byrne repair quoted at 14500 with requested completion 2026-04-08. Repair path included Byrne fit-up/shimming/alignment work, Delrin samples sent to Byrne, and review of flash/alignment conditions. Repaired tool shipped back via XPO guaranteed 2-day freight at 536.44. Noble then ran parts, completed capability study, compiled report, and overnighted 24 pieces to Gordon. Gordon approved samples 2026-05-01 but also provided a redlined drawing; Engineering and Quality still need to confirm measurement/inspection approach before proceeding cleanly. Later shipment activity shows Gordon Hold Down Clip pallets being prepared with weights/dimensions captured.",
    ],
    assign: ["kenneth.earles@nobleplastics.local", "charles.langlinais@nobleplastics.local"],
  },

  // ===================================================================== 646-015
  {
    id: "646-015",
    name: "SMB Lightweight Box & Lid",
    subtitle: "DFM / design package for lightweight box and lid; CAD complete; SIGMA / fill-pack scope under review",
    status: "active",
    budgetTotal: null,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Begin quote gathering / RFQ package transition 2026-05-20",
    keyMilestone: "Final deliverables package due 2026-05-20",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "hours_by_role", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "at_risk",
      qualifier: "Design / RFQ package transition",
      date: "2026-05-18",
      blocks: [
        { heading: "Execution", body: "Billy McDonald reported progress on Lightweight Box and Lids — box design based on both sample boxes, preliminary designs for four distinct lid configurations, and draft drawings sent for customer review. By 2026-05-11, CAD was complete for all lightweight box and lid versions; next step is SIGMA analysis to predict fill and address warp." },
        { heading: "Customer", body: "James Curcio clarified the lids cover two styles (drop-in and overlap) and two configurations (solid and reader) — four lid geometries total." },
        { heading: "Risk", body: "Billy McDonald formally requested SIGMA analysis to compare current extended lip thickness vs thinner lip; SIGMA work on 1118/1015 lids was prioritized first so lessons could be applied to the lightweight designs." },
        { heading: "Dependencies", body: "RFQ package depends on clarifying what fill-and-pack work and simulation results must inform tool design before quotes are gathered." },
        { heading: "Commercial", body: "2026-03-13 SMB sent PO for DFM on lightweight box and lid; Raelyne Lindsey opened the Sales Order. Payment received 2026-04-09; project cleared to begin." },
        { heading: "Next Steps", body: "Clarify fill-and-pack scope, determine which simulation results inform tool design, keep RFQ timing aligned with 2026-05-20 customer expectation, complete tooling / piece-price / prototyping quote package." },
      ],
      actions: [
        { dept: "engineering", body: "Complete / confirm SIGMA analysis scope (extended lip vs thinner lip)", due: null },
        { dept: "engineering", body: "Clarify fill-and-pack work needed before RFQ package goes out", due: "2026-05-20" },
        { dept: "sales", body: "Confirm customer review feedback on draft drawings and required features", due: null },
        { dept: "sales", body: "Update James Curcio on project status", due: null },
        { dept: "program_pm", body: "Keep RFQ timing and customer expectations aligned around 2026-05-20", due: "2026-05-20" },
        { dept: "engineering", body: "Prepare final deliverables: 3D CAD models, 2D drawings, tooling/piece-price/prototyping quote", due: "2026-05-20" },
        { dept: "purchasing", body: "Support tooling vendor quoting after design / simulation scope finalized", due: null },
      ],
    },
    phases: [
      { name: "PO / Sales Order setup", start: "2026-03-13", end: "2026-03-13", color: "slate", current: false },
      { name: "Placeholder design schedule issued", start: "2026-03-19", end: "2026-03-19", color: "slate", current: false },
      { name: "Design window / project start", start: "2026-04-13", end: "2026-05-20", color: "blue", current: true },
      { name: "Customer clarification — four lid geometries", start: "2026-04-15", end: "2026-04-15", color: "blue", current: false },
      { name: "Initial CAD concepts", start: "2026-04-29", end: "2026-04-29", color: "purple", current: false },
      { name: "Preliminary design review", start: "2026-05-01", end: "2026-05-01", color: "purple", current: false },
      { name: "Customer review package", start: "2026-05-13", end: "2026-05-13", color: "yellow", current: false },
      { name: "Final deliverables / RFQ package", start: "2026-05-20", end: "2026-05-20", color: "red", current: false },
    ],
    tracks: [],
    summaryCards: [
      { label: "CAD status", value: "Complete", unit: "All lightweight box and lid versions (as of 2026-05-11)" },
      { label: "Design variants", value: "4 lid geometries", unit: "Drop-in/overlap × solid/reader" },
      { label: "Box design", value: "1 box", unit: "Based on both sample boxes; fits all lightweight lids designed under 646-015" },
      { label: "RFQ target", value: "2026-05-20", unit: "Quotes to begin / gather" },
      { label: "Engineering hours", value: "49", unit: "Billy McDonald time entry" },
    ],
    hoursByRole: [
      { role: "engineering", who: "Billy McDonald", task: "SMB Lightweight Lid & Box Design", hours: 49 },
    ],
    risks: [
      { text: "Fill-and-pack scope needs clarification before RFQ package can be aligned", owner: "Ryan Murphy / Scott Rogers / Aimee Daigle", resolved: false },
      { text: "SIGMA analysis on 1118/1015 lids prioritized before applying learnings to lightweight designs", owner: "Billy McDonald / Engineering", resolved: false },
      { text: "Project at risk of deprioritization due to Bulkhead resource pull before work started", owner: "Ryan Murphy", resolved: false },
      { text: "Customer clarification created four lid geometries instead of simpler two-geometry assumption", owner: "Billy McDonald / James Curcio", resolved: true },
      { text: "Payment had not been received as of 2026-03-17; received 2026-04-09", owner: "Commercial / Sales", resolved: true },
      { text: "Tooling-layout conversation with Kischer planned for 2026-05-20 as part of SMB Lightweight discussions", owner: "Engineering / Program-PM", resolved: false },
    ],
    decisions: [
      { date: "2026-03-13", decision: "SMB sent PO for DFM on lightweight box and lid; Raelyne Lindsey opened Sales Order / project-number setup", source: "unilateral", author: "James Curcio / Raelyne Lindsey" },
      { date: "2026-03-19", decision: "Proposed project schedule issued: 2026-04-13 start, 2026-05-20 final deliverables", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-04-09", decision: "Payment received; project cleared to begin", source: "unilateral", author: "Raelyne Lindsey" },
      { date: "2026-04-15", decision: "Confirmed lid styles/configurations: drop-in and overlap, solid and reader", source: "unilateral", author: "James Curcio / Billy McDonald" },
      { date: "2026-04-29", decision: "Billy McDonald sent draft drawings; confirmed preliminary designs for four lid configurations plus box", source: "unilateral", author: "Billy McDonald" },
      { date: "2026-05-01", decision: "Preliminary Design Review meeting held", source: "meeting", author: "Ryan Murphy" },
      { date: "2026-05-04", decision: "Billy McDonald formally requested SIGMA analysis for Lightweight Lid and Box project", source: "unilateral", author: "Billy McDonald" },
      { date: "2026-05-11", decision: "CAD complete for all lightweight box and lid versions; next step SIGMA", source: "unilateral", author: "Billy McDonald" },
      { date: "2026-05-13", decision: "Requested clarification from Scott Rogers and Aimee Daigle on fill/pack scope needed before RFQ release", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-18", decision: "Quoting expected to start mid/late that week; customer reporting aligned with prior communication", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "646-015 is the SMB lightweight box and lid DFM/design effort. Schedule established 2026-04-13 start and 2026-05-20 final deliverables target, with checkpoints for initial CAD concepts, optimized CAD plus SIGMA results, customer review package, and final 3D CAD / 2D drawing / quote deliverables. James Curcio clarified the lid scope as two styles (drop-in, overlap) and two configurations (solid, reader) — four lid geometries. Billy McDonald sent draft drawings and a box design based on both sample boxes. Current focus is the design-to-RFQ transition: SIGMA / fill-and-pack clarity, Kischer tooling-layout discussion, and completion of the tooling / piece price / prototyping quote package. Source note: 'Simulations will be done Thursday, 5/28 am — and then the analysis will be ready to happen.'",
    ],
    assign: ["billy.mcdonald@nobleplastics.local", "kenneth.earles@nobleplastics.local"],
  },

  // ===================================================================== 624-001
  {
    id: "624-001",
    name: "Glove Guard Clips EOAT / C6 Restart",
    subtitle: "Automation touch-up and EOAT support for Small/Large Glove Guard clips on C6",
    status: "active",
    budgetTotal: null,
    forecastTotal: null,
    headroomNote: null,
    nextTrigger: "Engineer assignment for Issue Report #18585",
    keyMilestone: "PO#12776 ordered for EMI components 2026-03-13",
    dashboardHealth: "at_risk",
    toggles: ["summary_cards", "risks_preconditions", "decisions_log", "notes_freeform"],
    statusUpdate: {
      label: "at_risk",
      qualifier: "Issue report / engineering assignment needed",
      date: "2026-05-06",
      blocks: [
        { heading: "Execution", body: "Project scope is automation touch-up plus EOAT support for Small/Large Glove Guard clips; C6 listed as the area/cell." },
        { heading: "Logistics", body: "PO#12776 ordered for EMI components with UPS next-day delivery requested for Monday delivery." },
        { heading: "Customer", body: "Customer reported recurring failures near the small tabs (broken and partially formed tabs); concerns tied to specific cavities and recent production lots." },
        { heading: "Risk", body: "Customer asking for an update on traction toward root cause and corrective actions; engineering assignment still needed." },
        { heading: "Next Steps", body: "Assign an engineer to Glove Guard Issue Report #18585 and define the root-cause / corrective-action path." },
      ],
      actions: [
        { dept: "engineering", body: "Assign an engineer to Glove Guard Issue Report #18585 for clip/tab breakage concerns", due: null },
        { dept: "engineering", body: "Investigate recurring failures near small tabs (broken and partially formed tabs)", due: null },
        { dept: "program_pm", body: "Coordinate with Kenneth Earles / scheduling to work Glove Guard investigation into engineering schedule", due: null },
        { dept: "purchasing", body: "Confirm receipt/staging of EMI parts ordered under PO#12776", due: null },
        { dept: "automation", body: "Support automation touch-up / EOAT support for Small/Large Glove Guard clips", due: null },
      ],
    },
    phases: [
      { name: "Issue Report / RCA", start: "2026-05-06", end: "2026-05-06", color: "red", current: true },
    ],
    tracks: [
      { name: "EMI replacement HNBR pads", amount: 156.8, color: "blue" },
      { name: "Gimatic mini PB sprue grippers", amount: 278.0, color: "purple" },
    ],
    summaryCards: [
      { label: "Project", value: "624-001", unit: "Glove Guard Clips" },
      { label: "PO", value: "12776", unit: "EMI components ordered" },
      { label: "EMI pads", value: "32 qty", unit: "7484 replacement HNBR pad at 4.90 each" },
      { label: "EMI grippers", value: "2 qty", unit: "7119 Gimatic Mini PB Sprue Gripper at 139.00 each" },
      { label: "Issue report", value: "18585", unit: "Clip/tab breakage concerns" },
    ],
    hoursByRole: [],
    risks: [
      { text: "Customer reported recurring failures near small tabs (broken and partially formed tabs)", owner: "Engineering / Quality", resolved: false },
      { text: "Concerns may be tied to specific cavities and recent production lots", owner: "Engineering / Quality", resolved: false },
      { text: "Customer requested update on traction toward root cause and corrective actions", owner: "Program-PM / Engineering", resolved: false },
      { text: "Kenneth Earles had not yet looked into the issue as of 2026-04-21; asked for it to be worked into his schedule", owner: "Kenneth Earles / Program-PM", resolved: false },
      { text: "EMI parts receipt/staging needs confirmation against requested Monday delivery", owner: "Purchasing / Automation", resolved: false },
    ],
    decisions: [
      { date: "2026-03-13", decision: "Order EMI components under PO#12776 with UPS next-day requested", source: "unilateral", author: "Vanessa Domingue / Victor Darjean" },
      { date: "2026-03-24", decision: "Glove Guard needed status update and next-step plan after Sales and Quality discussion", source: "unilateral", author: "Ryan Murphy" },
      { date: "2026-05-06", decision: "Engineering assignment requested for Glove Guard Issue Report #18585", source: "unilateral", author: "Ryan Murphy" },
    ],
    notes: [
      "624-001 covers Glove Guard Clips EOAT / C6 Restart. Tracker lists area/cell as C6 and scope as automation touch-up plus EOAT support for Small/Large Glove Guard clips. On 2026-03-13, Victor Darjean requested EMI components for 624-001 (32 replacement HNBR pads and two Gimatic mini PB sprue grippers); Vanessa Domingue confirmed PO#12776 ordered with UPS next-day requested. Later, Glove Guard Issue Report #18585 became the active concern: customer reported recurring failures near small tabs (broken and partially formed tabs) tied to specific cavities and recent production lots. Immediate open need is engineering ownership, root-cause investigation, corrective-action definition, and a customer-facing traction update.",
    ],
    assign: ["victor.darjean@nobleplastics.local", "kenneth.earles@nobleplastics.local"],
  },
];

// ---------------------------------------------------------------------------

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const passwordHash = await bcrypt.hash("nobleplastics", 10);

  // 1. Programs
  for (const p of PROGRAMS) {
    await prisma.program.upsert({
      where: { prefix: p.prefix },
      update: { name: p.name, customer: p.customer },
      create: { prefix: p.prefix, name: p.name, customer: p.customer },
    });
  }
  console.log(`✓ ${PROGRAMS.length} programs`);

  // 2. Staff users
  const emailToId = new Map<string, string>();
  const ryan = await prisma.user.findUnique({ where: { email: "ryan@nobleplastics.local" } });
  if (!ryan) throw new Error("Admin Ryan not found — run the base seed first.");
  emailToId.set("ryan@nobleplastics.local", ryan.id);

  for (const s of STAFF) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: s.role, department: s.department, active: true },
      create: {
        email: s.email,
        name: s.name,
        passwordHash,
        role: s.role,
        department: s.department,
        active: true,
      },
    });
    emailToId.set(s.email, u.id);
  }
  console.log(`✓ ${STAFF.length} staff users`);

  // 3. Projects + all children
  for (const p of PROJECTS) {
    const prefix = p.id.slice(0, 3);
    await prisma.projectRow.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        subtitle: p.subtitle,
        status: p.status,
        ownerId: ryan.id,
        budgetTotal: p.budgetTotal,
        committedTotal: null,
        forecastTotal: p.forecastTotal,
        headroomNote: p.headroomNote,
        nextTrigger: p.nextTrigger,
        keyMilestone: p.keyMilestone,
        dashboardHealth: p.dashboardHealth,
        templateToggles: JSON.stringify(Object.fromEntries(p.toggles.map((t) => [t, true]))),
      },
      create: {
        id: p.id,
        programPrefix: prefix,
        name: p.name,
        subtitle: p.subtitle,
        status: p.status,
        ownerId: ryan.id,
        budgetTotal: p.budgetTotal,
        committedTotal: null,
        forecastTotal: p.forecastTotal,
        headroomNote: p.headroomNote,
        nextTrigger: p.nextTrigger,
        keyMilestone: p.keyMilestone,
        dashboardHealth: p.dashboardHealth,
        templateToggles: JSON.stringify(Object.fromEntries(p.toggles.map((t) => [t, true]))),
      },
    });

    // wipe child collections for clean re-run
    await prisma.actionItem.deleteMany({ where: { projectId: p.id } });
    await prisma.statusUpdate.deleteMany({ where: { projectId: p.id } });
    await prisma.phase.deleteMany({ where: { projectId: p.id } });
    await prisma.budgetTrack.deleteMany({ where: { projectId: p.id } });
    await prisma.projectSection.deleteMany({ where: { projectId: p.id } });
    await prisma.projectAssignment.deleteMany({ where: { projectId: p.id } });

    // status update + action items
    if (p.statusUpdate) {
      const su = await prisma.statusUpdate.create({
        data: {
          projectId: p.id,
          reportDate: parseDate(p.statusUpdate.date),
          statusLabel: p.statusUpdate.label,
          statusQualifier: p.statusUpdate.qualifier,
          blocks: JSON.stringify(p.statusUpdate.blocks),
          authorId: ryan.id,
        },
      });
      for (const a of p.statusUpdate.actions) {
        await prisma.actionItem.create({
          data: {
            projectId: p.id,
            statusUpdateId: su.id,
            ownerDept: a.dept,
            body: a.body,
            dueDate: a.due ? parseDate(a.due) : null,
          },
        });
      }
    }

    // phases
    for (let i = 0; i < p.phases.length; i++) {
      const ph = p.phases[i];
      await prisma.phase.create({
        data: {
          projectId: p.id,
          name: ph.name,
          startDate: parseDate(ph.start),
          endDate: parseDate(ph.end),
          color: ph.color,
          position: i,
          isCurrent: ph.current,
        },
      });
    }

    // budget tracks
    for (let i = 0; i < p.tracks.length; i++) {
      const t = p.tracks[i];
      await prisma.budgetTrack.create({
        data: { projectId: p.id, name: t.name, amount: t.amount, color: t.color, position: i },
      });
    }

    // sections
    async function section(kind: string, position: number, data: unknown) {
      await prisma.projectSection.create({
        data: { projectId: p.id, kind, position, data: JSON.stringify(data) },
      });
    }
    if (p.summaryCards.length) await section("summary_cards", 10, chunk(p.summaryCards, 3));
    if (p.hoursByRole.length) await section("hours_by_role", 30, { rows: p.hoursByRole });
    if (p.risks.length) await section("risks_preconditions", 60, { items: p.risks });
    if (p.decisions.length) await section("decisions_log", 70, { items: p.decisions });
    if (p.notes.length) await section("notes_freeform", 80, { blocks: p.notes });

    // assignments
    for (const email of p.assign) {
      const uid = emailToId.get(email);
      if (uid) {
        await prisma.projectAssignment.create({ data: { projectId: p.id, userId: uid } });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: ryan.id,
        entityType: "ProjectRow",
        entityId: p.id,
        action: "backfill",
        after: JSON.stringify({ name: p.name, status: p.status }),
      },
    });

    console.log(`✓ ${p.id} ${p.name}`);
  }

  console.log(`\nBackfill complete: ${PROJECTS.length} projects, ${STAFF.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
 * Noble Plastics — Molded Part Manufacturing Development process.
 *
 * The authoritative 5-phase / ~27-task checklist, transcribed from the
 * "Molding Manufacturing Development Key Tasks Outline" (task descriptions) and
 * the "Molded Part Manufacturing Development Checklist" spreadsheet (task list +
 * owning departments). Engineering owns the overall process; the department
 * codes below identify the ASSISTING department(s) for each task (the
 * parenthetical letters in the source docs). Tasks with no assist are
 * Engineering-only.
 *
 * Shared by the seed action (lib/dev-checklist-loader has the read side) and the
 * checklist UI so labels/descriptions never drift. Mirrors lib/quality.ts.
 */

/** Department codes — Engineering owns; the rest assist as "vendors" to it. */
export const DEV_DEPARTMENTS = [
  { code: "engineering", label: "Engineering", short: "ENG" },
  { code: "sales", label: "Sales", short: "S" },
  { code: "quality", label: "Quality", short: "Q" },
  { code: "production", label: "Production", short: "P" },
  { code: "automation", label: "Automation", short: "A" },
  { code: "finance", label: "Finance", short: "F" },
] as const;

export type DeptCode = (typeof DEV_DEPARTMENTS)[number]["code"];

const DEPT_LABELS: Record<string, { label: string; short: string }> = Object.fromEntries(
  DEV_DEPARTMENTS.map((d) => [d.code, { label: d.label, short: d.short }])
);

export function deptLabel(code: string): string {
  return DEPT_LABELS[code]?.label ?? code;
}
export function deptShort(code: string): string {
  return DEPT_LABELS[code]?.short ?? code;
}

/** Phase number → display name. */
export const DEV_PHASES: Record<number, string> = {
  1: "Pre-Proposal Feasibility",
  2: "Production Planning",
  3: "Tooling & Capital Planning",
  4: "Process & Asset Development",
  5: "Qualification & Production Release",
};

export interface DevTaskTemplate {
  phase: number;
  /** Stable key, unique within a project. */
  key: string;
  label: string;
  /** Assisting departments; empty/[“engineering”] = Engineering-owned. */
  departments: DeptCode[];
  /** Task explanation from the Key Tasks outline — shown as an info tooltip. */
  description: string;
}

/** The standard process, in order. `position` is the array index at seed time. */
export const DEV_CHECKLIST_TEMPLATE: DevTaskTemplate[] = [
  // ---- Phase 1 — Pre-Proposal Feasibility ----
  {
    phase: 1,
    key: "production_requirements",
    label: "Production Requirements",
    departments: ["sales"],
    description:
      "Define the customer requirements for annual and surge capacity. Establish growth and scalability expectations.",
  },
  {
    phase: 1,
    key: "financial_cost_targets",
    label: "Financial and Cost Targets",
    departments: ["sales"],
    description: "Verify customer target cost and available development budget.",
  },
  {
    phase: 1,
    key: "dfm1_readiness",
    label: "DFM-1: Initial Readiness Review",
    departments: ["engineering"],
    description:
      "Review customer part design for production readiness (drawings and written content). For take-over tooling, evaluate samples for both DFM-1 and DFM-2. Confirm documentation completeness and identify errors or omissions. This is a review—not a design activity; the customer is responsible for correcting non-conforming or missing data.",
  },
  {
    phase: 1,
    key: "dfm2_feasibility",
    label: "DFM-2: Geometrical Feasibility Review",
    departments: ["engineering"],
    description:
      "Evaluate the solid model for mold-release feasibility including small features and draft. Assess wall-thickness uniformity, standing-steel and cooling constraints, and warp risk.",
  },
  {
    phase: 1,
    key: "quality_requirements_review",
    label: "Quality Requirements Review",
    departments: ["quality"],
    description:
      "Confirm quality standards are defined and consistent with recognized norms. If undefined, assume ISO 20457:2018 Simple Production (Series 1). Assess using the ISO 20457 tolerance framework and Noble Plastics shrinkage-uncertainty analysis.",
  },
  {
    phase: 1,
    key: "mfg_difficulty",
    label: "Manufacturing Difficulty Determination",
    departments: ["engineering"],
    description:
      "Classify the part using ISO 20457 production-expense categories (Series 1–4). Use simulation / DOE where draft or warp behavior is uncertain for high-value programs.",
  },
  {
    phase: 1,
    key: "customer_alignment",
    label: "Customer Alignment",
    departments: ["sales"],
    description: "Identify and close specification gaps with customer involvement.",
  },

  // ---- Phase 2 — Production Planning ----
  {
    phase: 2,
    key: "tooling_config",
    label: "Tooling Configuration Definition",
    departments: ["production"],
    description:
      "Define cavitation, construction material, runner and gate type, mold texture, modularity, and required fabrication precision. Consider both part and operations (installation, auxiliaries, and maintenance).",
  },
  {
    phase: 2,
    key: "machine_requirements",
    label: "Molding Machine Requirements & Metrics Estimation",
    departments: ["production"],
    description:
      "Estimate cycle time, OEE, and process parameters. Determine required IMM specifications (shot size, pressure, platen, tonnage).",
  },
  {
    phase: 2,
    key: "automation_planning",
    label: "Automation Planning",
    departments: ["automation"],
    description:
      "Identify automation needs such as part removal, runner separation, sorting, and packaging. Specify related hardware (EOAT, conveyors, fixtures, sensors).",
  },
  {
    phase: 2,
    key: "value_add_planning",
    label: "Value-Add Planning",
    departments: ["automation"],
    description: "Identify and plan for non-automated operations required for product production.",
  },
  {
    phase: 2,
    key: "inspection_planning",
    label: "Inspection Planning",
    departments: ["quality"],
    description:
      "Define requirements for execution of PPAP/FAI, in-process and final inspection, and measurement programming.",
  },
  {
    phase: 2,
    key: "qualification_planning",
    label: "Qualification Planning",
    departments: ["production"],
    description:
      "Define time, resources, and materials required for finished part qualification — both internal and customer requirements.",
  },

  // ---- Phase 3 — Tooling & Capital Planning ----
  {
    phase: 3,
    key: "mold_spec_rfq",
    label: "Mold Specification and RFQ",
    departments: ["sales"],
    description:
      "Create detailed mold specifications including geometry, tolerances, shrink rate, and materials. Issue RFQ to qualified domestic and/or international vendors. Require multiple competitive quotations in each sourcing category.",
  },
  {
    phase: 3,
    key: "takeover_tooling",
    label: "Takeover Tooling Assessment",
    departments: ["sales"],
    description:
      "If existing tooling is supplied, conduct a capability study on the provided parts. Compare current performance with Noble's recommended configuration. Document assumptions and limitations.",
  },
  {
    phase: 3,
    key: "capital_equipment",
    label: "Capital Equipment Assessment",
    departments: ["finance"],
    description:
      "Identify new equipment required. Coordinate with Finance for alignment to strategic and financial goals.",
  },
  {
    phase: 3,
    key: "manufacturing_proposal",
    label: "Manufacturing Proposal",
    departments: ["sales"],
    description:
      "Prepare proposal including non-recurring expenses, estimated production costs, and any firm-fixed-price quotations requiring executive approval.",
  },
  {
    phase: 3,
    key: "quote_review",
    label: "Quote Review",
    departments: ["sales"],
    description: "Review quote for technical completeness and accuracy.",
  },

  // ---- Phase 4 — Process & Asset Development ----
  {
    phase: 4,
    key: "mold_procurement",
    label: "Mold Procurement and Validation",
    departments: ["production"],
    description:
      "Select vendor. Approve vendor design for robustness, maintainability, automation compatibility, and cooling efficiency. Procure materials needed for all sampling and qualification. Oversee design iteration until final approval. Support vendor sampling and part evaluation cycles. Accept mold following in-plant inspection at Noble.",
  },
  {
    phase: 4,
    key: "automation_procurement",
    label: "Automation Procurement",
    departments: ["automation"],
    description: "Design, build, and validate automation systems per requirements.",
  },
  {
    phase: 4,
    key: "molding_process_dev",
    label: "Molding Process Development",
    departments: ["production", "quality"],
    description:
      "Establish a baseline process using scientific-molding methods. Apply DOE to optimize critical parameters for Cpk ≥ 1.33. Document process setup and results.",
  },
  {
    phase: 4,
    key: "inspection_process_dev",
    label: "Inspection Process Development",
    departments: ["quality"],
    description:
      "Develop fixtures, gages, and procedures for qualification and production. Confirm alignment with material specifications and test standards.",
  },
  {
    phase: 4,
    key: "near_press_value_add",
    label: "Near-Press Value-Add Development",
    departments: ["automation", "production"],
    description:
      "Define and validate all in-cell post-molding activities (e.g., trimming, printing, visual inspection) — non-automated activities.",
  },

  // ---- Phase 5 — Qualification & Production Release ----
  {
    phase: 5,
    key: "control_plan",
    label: "Control Plan Development",
    departments: ["quality"],
    description: "Document process controls, inspection frequencies, and reaction plans.",
  },
  {
    phase: 5,
    key: "internal_validation",
    label: "Internal Validation",
    departments: ["quality", "production", "finance"],
    description:
      "Demonstrate compliance of all processes to the control plan. Secure Production Department sign-off verifying readiness.",
  },
  {
    phase: 5,
    key: "customer_approval",
    label: "Customer Approval",
    departments: ["sales"],
    description: "Conduct the customer qualification run and obtain written approval.",
  },
  {
    phase: 5,
    key: "release_to_production",
    label: "Release to Production",
    departments: ["production", "quality"],
    description:
      "Transfer documentation and program responsibility to Production. Manufacturing development is complete; the Engineering role transitions to technical support.",
  },
];

/** Department-contact roles captured in the checklist header (from the sheet). */
export const DEV_CONTACT_ROLES = [
  { key: "engineeringLead", label: "Engineering Lead" },
  { key: "accountManager", label: "Account Manager" },
  { key: "qualityContact", label: "Quality Contact" },
  { key: "automationContact", label: "Automation Contact" },
  { key: "productionContact", label: "Production Contact" },
  { key: "financeContact", label: "Finance Contact" },
] as const;

export type DevContactRole = (typeof DEV_CONTACT_ROLES)[number]["key"];
export type DevContacts = Partial<Record<DevContactRole, string>>;

export function parseDevContacts(raw: string | null | undefined): DevContacts {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as DevContacts) : {};
  } catch {
    return {};
  }
}

// --- Pure progress math (no IO; unit-tested in lib/dev-checklist.test.ts) ----

export interface DevSummaryInput {
  phase: number;
  complete: boolean;
  /** yyyy-mm-dd (UTC) or null. ISO sorts lexically = chronologically. */
  targetIso: string | null;
}

export interface DevPhaseSummary {
  phase: number;
  name: string;
  total: number;
  completed: number;
  pct: number; // 0-100
}

export interface DevSummary {
  total: number;
  completed: number;
  pct: number;
  /** Lowest phase that still has an incomplete task; null when all done/empty. */
  currentPhase: number | null;
  /** Incomplete tasks whose target date is in the past. */
  overdue: number;
  byPhase: DevPhaseSummary[];
}

/** Roll a checklist up into overall + per-phase progress. `todayIso` = yyyy-mm-dd. */
export function summarizeChecklist(tasks: DevSummaryInput[], todayIso: string): DevSummary {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.complete).length;
  const overdue = tasks.filter((t) => !t.complete && t.targetIso && t.targetIso < todayIso).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const phases = [...new Set(tasks.map((t) => t.phase))].sort((a, b) => a - b);
  const byPhase: DevPhaseSummary[] = phases.map((phase) => {
    const inPhase = tasks.filter((t) => t.phase === phase);
    const done = inPhase.filter((t) => t.complete).length;
    return {
      phase,
      name: DEV_PHASES[phase] ?? `Phase ${phase}`,
      total: inPhase.length,
      completed: done,
      pct: inPhase.length ? Math.round((done / inPhase.length) * 100) : 0,
    };
  });

  const currentPhase =
    byPhase.find((p) => p.completed < p.total)?.phase ?? null;

  return { total, completed, pct, currentPhase, overdue, byPhase };
}

import type { ProjectRecord, ProjectStatus } from "./types";

/*
 * Verbatim re-creation of the E-Delta Canister — Part Requalification
 * Schedule template the user supplied. Used as the v0 visual reference
 * to prove the brand-locked look matches the source HTML.
 */
export const E_DELTA_PROJECT: ProjectRecord = {
  projectNumber: "501-001",
  name: "E-Delta Canister — Part Requalification",
  programPrefix: "501",
  programName: "E-Delta",
  subtitle:
    "2 weeks design review · 12 weeks tool modification at Byrne · Part requalification begins only after mold returns · Engineering & quality: 8am–5pm · Machine / cure holds: 24-hr clock",
  status: "Active",
  owner: "Billy McDonald",
  lastUpdated: "2026-05-20",
  budgetTotal: undefined,
  spentTotal: undefined,
  sections: {
    summaryCards: [
      [
        { label: "Total calendar time", value: "~17", unit: "weeks" },
        {
          label: "Mold in press (calendar days)",
          value: "3–4",
          unit: "days (week 15+)",
        },
        {
          label: "Machine downtime (non-running)",
          value: "~24",
          unit: "hours (cure holds)",
        },
      ],
      [
        { label: "Total parts anticipated", value: "~220", unit: "parts" },
        { label: "Part weight", value: "0.54", unit: "lbs / part" },
        { label: "Total material required", value: "~119", unit: "lbs (~54 kg)" },
      ],
    ],
    partsMaterial: {
      rows: [
        {
          name: "Baseline run",
          purpose: "Establish last known-good process (10–15 settle shots + 30 qualify)",
          parts: 45,
          lbs: 24.3,
          kg: 11.0,
        },
        {
          name: "2-factor DOE",
          purpose:
            "Hold pressure & hold time — 4 runs × 5 replicates + 10–15 settle shots between runs",
          parts: 100,
          lbs: 54.0,
          kg: 24.5,
        },
        {
          name: "Validation run",
          purpose: "Confirm selected DOE process (10–15 settle shots + 60 validate)",
          parts: 75,
          lbs: 40.5,
          kg: 18.4,
        },
      ],
    },
    hoursByRole: {
      rows: [
        {
          role: "engineering",
          who: "Engineer (Billy)",
          task: "Model update — STEP file, remodel threads & boss thickness",
          hours: 16,
        },
        {
          role: "engineering",
          who: "Engineer (Billy)",
          task: "Drawing recreation",
          hours: 16,
        },
        {
          role: "engineering",
          who: "Engineer (Billy + Cody)",
          task: "Design review with Byrne (4 hrs × 2 people)",
          hours: 8,
        },
        {
          role: "engineering",
          who: "Engineer",
          task: "Update quality & process documentation (green book, process sheets)",
          hours: 2,
        },
        {
          role: "process",
          who: "Process tech (Cody) × 2",
          task: "Tool hang, hydraulics connection, setup verification",
          hours: 8,
        },
        {
          role: "process",
          who: "Process tech (Cody)",
          task: "Run baseline process (~45 parts)",
          hours: 2,
        },
        {
          role: "process",
          who: "Process tech (Cody)",
          task: "Run 2-factor DOE (~100 parts)",
          hours: 2,
        },
        {
          role: "process",
          who: "Process tech (Cody)",
          task: "Run validation / new process (~75 parts)",
          hours: 2,
        },
        {
          role: "automation",
          who: "Automation tech (Don)",
          task: "Robot / core logic standby during tool setup (~30 min active)",
          hours: 4,
        },
        {
          role: "quality",
          who: "Quality tech",
          task: "Measure & report baseline parts (5 sample parts)",
          hours: 4,
        },
        {
          role: "quality",
          who: "Quality tech",
          task: "Measure & report DOE parts (20 parts)",
          hours: 2,
        },
        {
          role: "quality",
          who: "Quality tech",
          task: "Measure & report validation parts",
          hours: 2,
        },
      ],
    },
    ganttOverview: {
      totalWeeks: 17,
      bars: [
        {
          group: "Engineering",
          label: "Model update",
          startWeek: 1,
          durationWeeks: 0.4,
          role: "engineering",
        },
        {
          group: "Engineering",
          label: "Drawing recreation",
          startWeek: 1.4,
          durationWeeks: 0.4,
          role: "engineering",
        },
        {
          group: "Engineering",
          label: "Design review w/ Byrne",
          startWeek: 1.8,
          durationWeeks: 0.5,
          role: "engineering",
          note: "1 day",
        },
        {
          group: "Byrne — tool mod.",
          label: "Mold modification",
          startWeek: 3,
          durationWeeks: 12,
          role: "process",
          note: "12 weeks — wk 3 to wk 14",
        },
        {
          group: "Part requalification",
          label: "Sequential steps (detail below)",
          startWeek: 15,
          durationWeeks: 3,
          role: "automation",
          note: "3–4 calendar days · wk 15+",
        },
      ],
      gates: [{ atWeek: 14.99, label: "mold returns" }],
    },
    ganttDetail: {
      totalDays: 4,
      workingStartHour: 8,
      workingEndHour: 17,
      steps: [
        {
          label: "Tool hang & setup",
          startHour: 0,
          durationHours: 4,
          kind: "process",
          note: "4 hrs",
        },
        {
          label: "Baseline run (45 parts)",
          startHour: 4,
          durationHours: 2,
          kind: "process",
          note: "2h",
        },
        {
          label: "12-hr cure hold #1",
          startHour: 6,
          durationHours: 12,
          kind: "cure",
          note: "mold in press — 12-hr cure",
        },
        {
          label: "Measure baseline",
          startHour: 24,
          durationHours: 4,
          kind: "quality",
          note: "4 hrs",
        },
        {
          label: "DOE run (100 parts)",
          startHour: 28,
          durationHours: 2,
          kind: "process",
          note: "2h",
        },
        {
          label: "12-hr cure hold #2",
          startHour: 30,
          durationHours: 12,
          kind: "cure",
          note: "mold in press — 12-hr cure",
        },
        {
          label: "Measure DOE parts",
          startHour: 48,
          durationHours: 2,
          kind: "quality",
          note: "2h",
        },
        {
          label: "Validation run (75 parts)",
          startHour: 50,
          durationHours: 2,
          kind: "process",
          note: "2h",
        },
        {
          label: "12-hr cure hold #3",
          startHour: 52,
          durationHours: 12,
          kind: "cure",
          note: "mold in press — 12-hr cure",
        },
        {
          label: "Measure validation + docs",
          startHour: 72,
          durationHours: 4,
          kind: "quality",
          note: "4 hrs",
        },
      ],
    },
    risks: [
      {
        text:
          "O-ring specs and thread fit tolerance data must be confirmed before week 15.",
        owner: "Billy",
        resolved: false,
      },
      {
        text:
          "Verify Byrne plans to sample the modified tool prior to shipment.",
        owner: "Billy",
        resolved: false,
      },
    ],
    decisions: [],
    notes: [
      "**Dependency.** Part requalification cannot begin until the modified mold is returned from Byrne (end of week 14). The heavier vertical line on the overview chart marks this gate. All requalification steps are strictly sequential — each step cannot start until the prior step is complete. Cure holds run on a 24-hr clock with the mold remaining in press; measurements begin the following morning at 8am.",
      "**Material note.** 118.8 lbs total assumes 0.54 lbs/part with no purge or scrap allowance — add 5–10% buffer as needed. **If baseline qualifies without a DOE**, steps 5–9 are skipped, parts drop to ~120, material drops to ~65 lbs, and requalification compresses to ~1.5 calendar days.",
    ],
  },
};

/** Roster from the time-tracking spreadsheet tabs. */
export const SAMPLE_ENGINEERS = [
  "Kris",
  "Kenneth",
  "Billy",
  "Don",
  "Kent",
  "Victor",
  "Kelsey",
];

/** Mirrors the projects shown on Kenneth's Jan 5 week. */
export const SAMPLE_PROJECT_INDEX: Array<{
  projectNumber: string;
  name: string;
  programPrefix: string;
  status: ProjectStatus;
  owner: string;
  lastUpdated: string;
  hoursLogged: number;
  hoursEstimated: number | null;
  nextGate?: string;
}> = [
  {
    projectNumber: "501-001",
    name: "E-Delta Canister — Part Requalification",
    programPrefix: "501",
    status: "Active",
    owner: "Billy",
    lastUpdated: "2026-05-20",
    hoursLogged: 0,
    hoursEstimated: 68,
    nextGate: "Mold returns (wk 15)",
  },
  {
    projectNumber: "112-066",
    name: "Family Buy 50mm Dunnage",
    programPrefix: "112",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-13",
    hoursLogged: 18,
    hoursEstimated: null,
  },
  {
    projectNumber: "439-009",
    name: "Manchac — L&R Housing",
    programPrefix: "439",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-09",
    hoursLogged: 0,
    hoursEstimated: null,
  },
  {
    projectNumber: "647-004",
    name: "Bulkhead Housing",
    programPrefix: "647",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-16",
    hoursLogged: 37,
    hoursEstimated: null,
  },
  {
    projectNumber: "647-006",
    name: "Pigtail Housing",
    programPrefix: "647",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-05",
    hoursLogged: 0,
    hoursEstimated: null,
  },
  {
    projectNumber: "663-002",
    name: "Gordon — Hold Down Clip",
    programPrefix: "663",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-06",
    hoursLogged: 3,
    hoursEstimated: null,
  },
  {
    projectNumber: "692-001",
    name: "Rumble Roller — Handle Grip",
    programPrefix: "692",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-05",
    hoursLogged: 1,
    hoursEstimated: null,
  },
  {
    projectNumber: "150-029",
    name: "Spectra TOW 2A",
    programPrefix: "150",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-15",
    hoursLogged: 5,
    hoursEstimated: null,
  },
  {
    projectNumber: "646-001",
    name: "SMB 1118",
    programPrefix: "646",
    status: "Active",
    owner: "Kenneth",
    lastUpdated: "2026-01-16",
    hoursLogged: 13,
    hoursEstimated: null,
  },
  {
    projectNumber: "999-999",
    name: "Miscellaneous (non-project work)",
    programPrefix: "999",
    status: "Active",
    owner: "—",
    lastUpdated: "2026-01-13",
    hoursLogged: 6,
    hoursEstimated: null,
  },
];

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { E_DELTA_PROJECT, SAMPLE_PROJECT_INDEX } from "../lib/sample-data";

const adapter = new PrismaBetterSqlite3({
  url: (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

/*
 * Seeds development data. Idempotent — re-running upserts users and
 * re-creates sections from the static template.
 */

const ENGINEERS: Array<{ name: string; email: string }> = [
  { name: "Kris",    email: "kris@nobleplastics.local" },
  { name: "Kenneth", email: "kenneth@nobleplastics.local" },
  { name: "Billy",   email: "billy@nobleplastics.local" },
  { name: "Don",     email: "don@nobleplastics.local" },
  { name: "Kent",    email: "kent@nobleplastics.local" },
  { name: "Victor",  email: "victor@nobleplastics.local" },
  { name: "Kelsey",  email: "kelsey@nobleplastics.local" },
];

const ADMIN = { name: "Ryan", email: "ryan@nobleplastics.local" };

// Kenneth's Jan 5, 2026 week from the screenshot.
const SAMPLE_HOURS: Record<string, [number, number, number, number, number]> = {
  "647-004": [0, 2, 8, 9, 6],
  "663-002": [1, 2, 0, 0, 0],
  "692-001": [1, 0, 0, 0, 0],
  "999-999": [2, 4, 0, 0, 0],
  "150-029": [3, 0, 0, 0, 0],
};

async function main() {
  const pwHash = await bcrypt.hash("nobleplastics", 10);

  // Admin
  const ryan = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: {
      email: ADMIN.email,
      name: ADMIN.name,
      passwordHash: pwHash,
      role: "admin",
      department: "admin",
    },
  });

  // Engineers
  const engineerRecords = await Promise.all(
    ENGINEERS.map((e) =>
      prisma.user.upsert({
        where: { email: e.email },
        update: {},
        create: {
          email: e.email,
          name: e.name,
          passwordHash: pwHash,
          role: "engineer",
          department: "engineering",
        },
      })
    )
  );
  const byName = new Map(engineerRecords.map((u) => [u.name, u]));

  // A viewer for the read-only departments.
  await prisma.user.upsert({
    where: { email: "sales@nobleplastics.local" },
    update: {},
    create: {
      email: "sales@nobleplastics.local",
      name: "Sales Viewer",
      passwordHash: pwHash,
      role: "viewer",
      department: "sales",
    },
  });

  // Programs (prefixes) used by sample projects.
  const prefixes = Array.from(
    new Set(SAMPLE_PROJECT_INDEX.map((p) => p.programPrefix))
  );
  for (const prefix of prefixes) {
    await prisma.program.upsert({
      where: { prefix },
      update: {},
      create: { prefix, name: `${prefix}-` },
    });
  }

  // Projects
  for (const p of SAMPLE_PROJECT_INDEX) {
    const owner = p.owner === "—" ? null : byName.get(p.owner)?.id ?? null;
    await prisma.projectRow.upsert({
      where: { id: p.projectNumber },
      update: {
        name: p.name,
        ownerId: owner,
        status: "active",
      },
      create: {
        id: p.projectNumber,
        programPrefix: p.programPrefix,
        name: p.name,
        status: "active",
        ownerId: owner,
        templateToggles: JSON.stringify({}),
      },
    });
  }

  // Assign all engineers to Miscellaneous + assign Kenneth to his
  // projects from the screenshot.
  for (const eng of engineerRecords) {
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId: "999-999", userId: eng.id } },
      update: {},
      create: { projectId: "999-999", userId: eng.id },
    });
  }
  const kenneth = byName.get("Kenneth")!;
  for (const projectId of [
    "112-066",
    "439-009",
    "647-004",
    "647-006",
    "663-002",
    "692-001",
    "150-029",
    "646-001",
  ]) {
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: kenneth.id } },
      update: {},
      create: { projectId, userId: kenneth.id },
    });
  }
  // Billy owns E-Delta and is assigned to it for time tracking.
  const billy = byName.get("Billy")!;
  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: "501-001", userId: billy.id } },
    update: {},
    create: { projectId: "501-001", userId: billy.id },
  });
  await prisma.projectRow.update({
    where: { id: "501-001" },
    data: { ownerId: billy.id, subtitle: E_DELTA_PROJECT.subtitle },
  });

  // E-Delta sections — store the static template data in ProjectSection rows.
  const sections: Array<{ kind: string; data: unknown; position: number }> = [
    { kind: "summary_cards", position: 1, data: E_DELTA_PROJECT.sections.summaryCards },
    { kind: "parts_material", position: 2, data: E_DELTA_PROJECT.sections.partsMaterial },
    { kind: "hours_by_role", position: 3, data: E_DELTA_PROJECT.sections.hoursByRole },
    { kind: "gantt_overview", position: 4, data: E_DELTA_PROJECT.sections.ganttOverview },
    { kind: "gantt_detail", position: 5, data: E_DELTA_PROJECT.sections.ganttDetail },
    { kind: "risks_preconditions", position: 6, data: { items: E_DELTA_PROJECT.sections.risks } },
    { kind: "decisions_log", position: 7, data: { items: E_DELTA_PROJECT.sections.decisions } },
    { kind: "notes_freeform", position: 8, data: { blocks: E_DELTA_PROJECT.sections.notes } },
  ];
  for (const s of sections) {
    if (s.data === undefined) continue;
    await prisma.projectSection.upsert({
      where: {
        projectId_kind: { projectId: "501-001", kind: s.kind },
      },
      update: { data: JSON.stringify(s.data), position: s.position },
      create: {
        projectId: "501-001",
        kind: s.kind,
        position: s.position,
        data: JSON.stringify(s.data),
      },
    });
  }

  // Kenneth's Jan 5, 2026 week of time entries.
  const weekStart = new Date("2026-01-05T00:00:00Z");
  for (const [projectId, cells] of Object.entries(SAMPLE_HOURS)) {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === 0) continue;
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      await prisma.timeEntry.upsert({
        where: {
          userId_projectId_entryDate: {
            userId: kenneth.id,
            projectId,
            entryDate: d,
          },
        },
        update: { hours: cells[i] },
        create: {
          userId: kenneth.id,
          projectId,
          entryDate: d,
          hours: cells[i],
        },
      });
    }
  }

  // ── Sample StatusUpdates inspired by the user's Apr 16 Daily Tooling
  // Report. Posted "today" so the dashboard has content on first load.
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  type StatusSeed = {
    projectId: string;
    label: string;
    qualifier?: string;
    blocks: Array<{ heading: string; body: string }>;
    actionItems?: Array<{ ownerDept: string; body: string }>;
  };

  const STATUS_SEEDS: StatusSeed[] = [
    {
      projectId: "647-004",
      label: "in_progress",
      qualifier: "Structured Delay",
      blocks: [
        {
          heading: "Update",
          body: "- Tool builder expects CAD: 4/21\n- Review turnaround ~1 day → expected return 4/23",
        },
        {
          heading: "Impacts",
          body: "- Internal alignment with Scott still required\n- Tool build start shifting to ~4/27 (from 4/20)",
        },
        {
          heading: "Logistics",
          body: "Prototype tool + 400 inserts must ship to builder by EOD Friday (4/17)",
        },
        {
          heading: "Commercial",
          body: "- Lead time still ~9 weeks (verbal)\n- Quote expected upon receipt of updated design",
        },
      ],
      actionItems: [
        { ownerDept: "engineering", body: "Align with Scott + finalize design path" },
        { ownerDept: "program_pm", body: "Track Bulkhead shipment (tool + inserts by 4/17)" },
      ],
    },
    {
      projectId: "647-006",
      label: "in_progress",
      qualifier: "Controlled Slip",
      blocks: [
        {
          heading: "Update",
          body: "- Recut adjustments in progress\n- Original target: 4/17 release → now unlikely\n- Revised expectation: by 4/24 (still within 5/1 schedule)",
        },
      ],
      actionItems: [
        { ownerDept: "engineering", body: "Finalize Pigtail recut adjustments" },
      ],
    },
    {
      projectId: "663-002",
      label: "at_risk",
      qualifier: "External Pressure + Info Gap",
      blocks: [
        {
          heading: "Update",
          body: "No update from Byrne as of 1:30 PM (4/16)",
        },
        {
          heading: "Customer",
          body: '- Gordon requesting confirmation: "Is the tool in good shape for production?"\n- Response required',
        },
        {
          heading: "Internal",
          body: "- Awaiting Engineering input to respond\n- Byrne sampling still likely week of 4/20\n- Delrin material provided for validation",
        },
        {
          heading: "Implications",
          body: "- Tool return likely week of 4/27\n- Qualification required prior to production\n- 5/7 (200k parts) at risk",
        },
      ],
      actionItems: [
        { ownerDept: "engineering", body: "Provide input for Gordon customer response" },
        { ownerDept: "program_pm", body: "Drive Gordon response (dependent on Engineering)" },
        { ownerDept: "program_pm", body: "Monitor Byrne update" },
      ],
    },
    {
      projectId: "150-029",
      label: "at_risk",
      qualifier: "Requires Alignment",
      blocks: [
        {
          heading: "Update",
          body: "Engineering approved Quality data",
        },
        {
          heading: "Issue",
          body: "No alignment on:\n- FAI\n- next steps\n- what has been completed\n- delivery expectations",
        },
        {
          heading: "Action",
          body: "Escalation planned: Scott + Engineering + Quality (4/17)",
        },
      ],
      actionItems: [
        { ownerDept: "quality", body: "Align with Engineering on Spectra next steps" },
        { ownerDept: "program_pm", body: "Coordinate Spectra escalation (4/17)" },
      ],
    },
    {
      projectId: "439-009",
      label: "on_track",
      blocks: [
        {
          heading: "Update",
          body: "- No changes\n- On track for May delivery\n- Tariffs/duties still unknown",
        },
      ],
    },
    {
      projectId: "501-001",
      label: "blocked",
      qualifier: "No payment, no engagement",
      blocks: [
        {
          heading: "Update",
          body: "No payment\nNo engagement",
        },
      ],
    },
    {
      projectId: "692-001",
      label: "pending",
      blocks: [
        {
          heading: "Update",
          body: "- Material arrival: 4/22\n- No formal engineer assigned (expected: Kenneth)",
        },
      ],
    },
  ];

  // Wipe existing seed status updates for these projects, then recreate.
  await prisma.actionItem.deleteMany({
    where: { projectId: { in: STATUS_SEEDS.map((s) => s.projectId) } },
  });
  await prisma.statusUpdate.deleteMany({
    where: { projectId: { in: STATUS_SEEDS.map((s) => s.projectId) } },
  });
  for (const s of STATUS_SEEDS) {
    const su = await prisma.statusUpdate.create({
      data: {
        projectId: s.projectId,
        reportDate: todayUtc,
        statusLabel: s.label,
        statusQualifier: s.qualifier ?? null,
        blocks: JSON.stringify(s.blocks),
        authorId: ryan.id,
      },
    });
    for (const a of s.actionItems ?? []) {
      await prisma.actionItem.create({
        data: {
          projectId: s.projectId,
          statusUpdateId: su.id,
          ownerDept: a.ownerDept,
          body: a.body,
        },
      });
    }
  }

  // Sample portfolio notes for today.
  const PORTFOLIO_NOTES = [
    {
      kind: "priority_callout",
      body:
        "- Bulkhead timeline shifting due to design alignment + shipment requirements\n" +
        "- Gordon tool awaiting Byrne update; customer actively requesting status → response required\n" +
        "- Spectra requires escalation (Engineering + Quality alignment)\n" +
        "- New: Dresser Crankshaft tool under inspection for potential damage",
    },
    {
      kind: "forward_looking",
      body:
        "- Gordon likely requires immediate, carefully framed response\n" +
        "- Bulkhead execution now dependent on tight coordination through 4/17–4/23 window\n" +
        "- Spectra requires decisive alignment to regain control",
    },
  ];
  for (const n of PORTFOLIO_NOTES) {
    await prisma.portfolioNote.upsert({
      where: { reportDate_kind: { reportDate: todayUtc, kind: n.kind } },
      update: { body: n.body, authorId: ryan.id },
      create: {
        reportDate: todayUtc,
        kind: n.kind,
        body: n.body,
        authorId: ryan.id,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("seed done:", {
    users: await prisma.user.count(),
    projects: await prisma.projectRow.count(),
    sections: await prisma.projectSection.count(),
    timeEntries: await prisma.timeEntry.count(),
    statusUpdates: await prisma.statusUpdate.count(),
    actionItems: await prisma.actionItem.count(),
    portfolioNotes: await prisma.portfolioNote.count(),
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

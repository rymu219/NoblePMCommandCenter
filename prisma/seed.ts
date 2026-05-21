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

  // eslint-disable-next-line no-console
  console.log("seed done:", {
    users: await prisma.user.count(),
    projects: await prisma.projectRow.count(),
    sections: await prisma.projectSection.count(),
    timeEntries: await prisma.timeEntry.count(),
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

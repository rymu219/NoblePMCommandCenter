import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/*
 * Bare-minimum production seed.
 *
 * Creates the admin user (Ryan) and the universal "Miscellaneous"
 * project bucket so engineers can log time against non-project work.
 * Idempotent — safe to re-run on every deploy.
 *
 * Defaults:
 *   ADMIN_EMAIL=ryan@nobleplastics.local
 *   ADMIN_NAME="Ryan"
 *   ADMIN_PASSWORD=nobleplastics
 *
 * Override via env on the deployment if needed.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; aborting seed.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "ryan@nobleplastics.local";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Ryan";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "nobleplastics";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 1. Admin user — upsert
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, role: "admin", active: true },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: "admin",
      department: "admin",
      active: true,
    },
  });
  console.log(`✓ admin user: ${admin.email}`);

  // 2. "999" Misc program + 999-999 catch-all project. Every engineer
  // gets pre-assigned to this bucket so they always have a place to
  // log non-project hours.
  await prisma.program.upsert({
    where: { prefix: "999" },
    update: {},
    create: { prefix: "999", name: "Miscellaneous" },
  });

  await prisma.projectRow.upsert({
    where: { id: "999-999" },
    update: { name: "Miscellaneous (non-project work)" },
    create: {
      id: "999-999",
      programPrefix: "999",
      name: "Miscellaneous (non-project work)",
      status: "active",
      ownerId: admin.id,
      subtitle: "Catch-all for non-project hours (training, meetings, support).",
    },
  });
  console.log("✓ 999-999 Miscellaneous bucket ready");

  // 3. Optional Command Center demo data (only when SEED_DEMO=1). Uses
  //    deterministic ids so it's idempotent and never touches production
  //    unless explicitly requested. Exercises every board/report cue.
  if (process.env.SEED_DEMO === "1") {
    await seedBoardDemo(passwordHash);
    console.log("✓ Command Center demo data seeded");
  }

  console.log("Seed complete.");
}

/** Demo milestones/subtasks for verifying the Command Center board + report. */
async function seedBoardDemo(passwordHash: string) {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

  // Two demo engineers.
  const alice = await prisma.user.upsert({
    where: { email: "alice@nobleplastics.local" },
    update: { name: "Alice Ng", role: "engineer", active: true },
    create: {
      email: "alice@nobleplastics.local",
      name: "Alice Ng",
      passwordHash,
      role: "engineer",
      department: "engineering",
      active: true,
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@nobleplastics.local" },
    update: { name: "Bob Reyes", role: "engineer", active: true },
    create: {
      email: "bob@nobleplastics.local",
      name: "Bob Reyes",
      passwordHash,
      role: "engineer",
      department: "process",
      active: true,
    },
  });

  // A program + project assigned to both engineers.
  await prisma.program.upsert({
    where: { prefix: "640" },
    update: {},
    create: { prefix: "640", name: "Demo Program" },
  });
  await prisma.projectRow.upsert({
    where: { id: "640-001" },
    update: { name: "Widget Mold (demo)" },
    create: {
      id: "640-001",
      programPrefix: "640",
      name: "Widget Mold (demo)",
      status: "active",
    },
  });
  for (const uid of [alice.id, bob.id]) {
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId: "640-001", userId: uid } },
      update: {},
      create: { projectId: "640-001", userId: uid },
    });
  }

  // Milestones: one completed-late-with-drift, one overdue-open, one due-soon.
  const milestones = [
    {
      id: "demo-m1",
      title: "Design freeze",
      baselineDate: d("2026-04-01"),
      targetDate: d("2026-04-15"), // drifted +14d
      actualDate: d("2026-04-20"), // late vs both
      position: 0,
    },
    {
      id: "demo-m2",
      title: "First article",
      baselineDate: d("2026-05-20"),
      targetDate: d("2026-05-20"),
      actualDate: null, // overdue (today is 2026-06-01)
      position: 1,
    },
    {
      id: "demo-m3",
      title: "Customer signoff",
      baselineDate: d("2026-06-03"),
      targetDate: d("2026-06-03"),
      actualDate: null, // due soon (Upcoming); Bob demoted to Supporting below
      position: 2,
    },
    {
      id: "demo-m4",
      title: "Production launch",
      baselineDate: d("2026-08-15"),
      targetDate: d("2026-08-15"),
      actualDate: null, // far out → On the horizon
      position: 3,
    },
    {
      id: "demo-m5",
      title: "Spare-tooling plan",
      notes: "Scope TBD — set a date once the customer confirms volumes.",
      baselineDate: null,
      targetDate: null,
      actualDate: null, // undated → Needs a date
      position: 4,
    },
  ];
  for (const m of milestones) {
    await prisma.milestone.upsert({
      where: { id: m.id },
      update: { ...m, projectId: "640-001" },
      create: { ...m, projectId: "640-001" },
    });
  }

  // Bob is only supporting the customer signoff milestone.
  await prisma.milestoneEngagement.upsert({
    where: { milestoneId_userId: { milestoneId: "demo-m3", userId: bob.id } },
    update: { role: "support" },
    create: { milestoneId: "demo-m3", userId: bob.id, role: "support" },
  });

  // A PIPELINE (scoping-stage) project in the reserved "000" program. Pipeline
  // projects are excluded from rollups + the status feed, but the board has no
  // status filter: once a pipeline project is assigned to an engineer and given
  // a milestone, it appears mixed into that engineer's lane like any other.
  await prisma.program.upsert({
    where: { prefix: "000" },
    update: {},
    create: { prefix: "000", name: "Pipeline" },
  });
  await prisma.projectRow.upsert({
    where: { id: "000-001" },
    update: { name: "Prospective Tool (pipeline demo)", status: "pipeline" },
    create: {
      id: "000-001",
      programPrefix: "000",
      name: "Prospective Tool (pipeline demo)",
      status: "pipeline",
      subtitle: "Scoping-stage work — not an official project yet.",
    },
  });
  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: "000-001", userId: alice.id } },
    update: {},
    create: { projectId: "000-001", userId: alice.id },
  });
  await prisma.milestone.upsert({
    where: { id: "demo-m6" },
    update: {
      projectId: "000-001",
      title: "Feasibility review",
      baselineDate: d("2026-06-10"),
      targetDate: d("2026-06-10"),
      actualDate: null,
      position: 0,
    },
    create: {
      id: "demo-m6",
      projectId: "000-001",
      title: "Feasibility review",
      baselineDate: d("2026-06-10"),
      targetDate: d("2026-06-10"),
      actualDate: null, // due soon → shows in Alice's Upcoming section
      position: 0,
    },
  });

  // Subtasks exercising done-late, overdue, due-soon, done-on-time.
  const subtasks = [
    { id: "demo-s1", milestoneId: "demo-m1", ownerId: alice.id, title: "CAD review", dueDate: d("2026-05-01"), completedAt: d("2026-05-05"), position: 0 }, // done late
    { id: "demo-s2", milestoneId: "demo-m1", ownerId: alice.id, title: "DFM checklist", dueDate: d("2026-05-10"), completedAt: d("2026-05-09"), position: 1 }, // done on time
    { id: "demo-s3", milestoneId: "demo-m2", ownerId: alice.id, title: "Cut steel", dueDate: d("2026-05-25"), completedAt: null, position: 0 }, // overdue
    { id: "demo-s4", milestoneId: "demo-m3", ownerId: bob.id, title: "Process sheet", dueDate: d("2026-06-02"), completedAt: null, position: 0 }, // due soon
    { id: "demo-s5", milestoneId: "demo-m1", ownerId: bob.id, title: "Material spec", dueDate: d("2026-04-10"), completedAt: d("2026-04-18"), position: 0 }, // done late
  ];
  for (const s of subtasks) {
    await prisma.subtask.upsert({ where: { id: s.id }, update: s, create: s });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

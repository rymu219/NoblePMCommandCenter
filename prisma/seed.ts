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

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

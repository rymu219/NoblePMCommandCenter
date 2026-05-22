import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const g = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it to a Postgres connection string."
    );
  }
  // Prisma 7 requires a driver adapter to be passed explicitly.
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = g.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

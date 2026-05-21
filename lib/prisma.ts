import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const g = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // Prisma 7 requires a driver adapter to be passed explicitly.
  const adapter = new PrismaBetterSqlite3({
    url: url.replace(/^file:/, ""),
  });
  return new PrismaClient({ adapter });
}

export const prisma = g.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

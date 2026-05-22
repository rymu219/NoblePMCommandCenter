import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const g = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it to a Postgres connection string."
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!g.prisma) g.prisma = createClient();
  return g.prisma;
}

/*
 * Lazy-initialized PrismaClient via Proxy. Importing this module is
 * side-effect-free: the client is only created on first actual access
 * (e.g. `prisma.user.findMany()`). This matters at Next.js build time
 * — `next build`'s page-data collection imports every server module to
 * determine which pages are static vs dynamic, and we don't want
 * importing `lib/prisma.ts` to require DATABASE_URL.
 *
 * At runtime, missing DATABASE_URL still throws on first use with the
 * same clear error as before.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

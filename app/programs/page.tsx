import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProgramsPage() {
  const programs = await prisma.program.findMany({
    include: { projects: true },
    orderBy: { prefix: "asc" },
  });
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        Programs
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Grouped by the 3-digit prefix on each Project #.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programs.map((pg) => (
          <Link
            key={pg.prefix}
            href={`/programs/${pg.prefix}`}
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 transition-colors hover:border-noble-red/40 hover:bg-[var(--surface)]"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-medium tracking-wider text-noble-black">
                {pg.prefix}-
              </span>
              <span className="text-xs text-[var(--muted)]">
                {pg.projects.length} project
                {pg.projects.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
              {pg.projects.slice(0, 3).map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
              {pg.projects.length > 3 ? (
                <li className="text-xs">+ {pg.projects.length - 3} more</li>
              ) : null}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}

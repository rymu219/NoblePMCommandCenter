import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ prefix: string }>;
}) {
  const { prefix } = await params;
  const program = await prisma.program.findUnique({
    where: { prefix },
    include: {
      projects: {
        include: { timeEntries: true, owner: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!program) notFound();
  const totalHours = program.projects
    .flatMap((p) => p.timeEntries)
    .reduce((s, e) => s + e.hours, 0);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/programs" className="hover:underline">
          ← All programs
        </Link>
      </div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Program <span className="font-mono tracking-wider">{prefix}-</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {program.projects.length} project
            {program.projects.length === 1 ? "" : "s"} · {totalHours} hours logged
          </p>
        </div>
        <Link
          href={`/programs/${prefix}/executive-status`}
          className="rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85"
        >
          Executive status report →
        </Link>
      </div>
      <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {program.projects.map((p) => {
          const hrs = p.timeEntries.reduce((s, e) => s + e.hours, 0);
          return (
            <li key={p.id} className="px-4 py-3">
              <Link
                href={`/projects/${p.id}`}
                className="flex items-baseline justify-between hover:underline"
              >
                <div>
                  <div className="font-mono text-xs tracking-wider text-[var(--muted)]">
                    {p.id}
                  </div>
                  <div className="font-medium text-noble-black">{p.name}</div>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {hrs} hrs · last update{" "}
                  {p.lastUpdatedAt.toISOString().slice(0, 10)}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

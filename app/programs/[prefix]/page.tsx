import Link from "next/link";
import { notFound } from "next/navigation";
import { SAMPLE_PROJECT_INDEX } from "@/lib/sample-data";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ prefix: string }>;
}) {
  const { prefix } = await params;
  const projects = SAMPLE_PROJECT_INDEX.filter(
    (p) => p.programPrefix === prefix
  );
  if (projects.length === 0) notFound();

  const totalHours = projects.reduce((s, p) => s + p.hoursLogged, 0);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/programs" className="hover:underline">
          ← All programs
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl font-medium text-noble-black">
        Program{" "}
        <span className="font-mono tracking-wider">{prefix}-</span>
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {projects.length} project{projects.length === 1 ? "" : "s"} ·{" "}
        {totalHours} hours logged
      </p>
      <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {projects.map((p) => (
          <li key={p.projectNumber} className="px-4 py-3">
            <Link
              href={`/projects/${p.projectNumber}`}
              className="flex items-baseline justify-between hover:underline"
            >
              <div>
                <div className="font-mono text-xs tracking-wider text-[var(--muted)]">
                  {p.projectNumber}
                </div>
                <div className="font-medium text-noble-black">{p.name}</div>
              </div>
              <div className="text-xs text-[var(--muted)]">
                {p.hoursLogged} hrs · last update {p.lastUpdated}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

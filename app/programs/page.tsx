import Link from "next/link";
import { SAMPLE_PROJECT_INDEX } from "@/lib/sample-data";

export default function ProgramsPage() {
  const byPrefix = new Map<string, typeof SAMPLE_PROJECT_INDEX>();
  for (const p of SAMPLE_PROJECT_INDEX) {
    if (!byPrefix.has(p.programPrefix)) byPrefix.set(p.programPrefix, []);
    byPrefix.get(p.programPrefix)!.push(p);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        Programs
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Grouped by the 3-digit prefix on each Project #.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(byPrefix.entries()).map(([prefix, projects]) => (
          <Link
            key={prefix}
            href={`/programs/${prefix}`}
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 transition-colors hover:border-noble-red/40 hover:bg-[var(--surface)]"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-medium tracking-wider text-noble-black">
                {prefix}-
              </span>
              <span className="text-xs text-[var(--muted)]">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
              {projects.slice(0, 3).map((p) => (
                <li key={p.projectNumber}>{p.name}</li>
              ))}
              {projects.length > 3 ? (
                <li className="text-xs">+ {projects.length - 3} more</li>
              ) : null}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}

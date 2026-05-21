import Link from "next/link";
import { SAMPLE_PROJECT_INDEX } from "@/lib/sample-data";

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        Projects
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        All projects across all programs. Click into a Project # to open the
        full template view.
      </p>
      <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {SAMPLE_PROJECT_INDEX.map((p) => (
          <li key={p.projectNumber}>
            <Link
              href={`/projects/${p.projectNumber}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface)]"
            >
              <div className="flex flex-1 items-baseline gap-4">
                <span className="w-24 font-mono text-xs tracking-wider text-noble-black">
                  {p.projectNumber}
                </span>
                <span>{p.name}</span>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {p.status} · {p.owner}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

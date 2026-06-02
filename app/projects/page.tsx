import Link from "next/link";
import { listProjectsForDashboard } from "@/lib/project-loader";

export default async function ProjectsPage() {
  const projects = await listProjectsForDashboard();
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
        {projects.map((p) => (
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
                {p.status === "Pipeline" ? (
                  <span className="rounded-sm bg-[#BA7517] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white">
                    Pipeline
                  </span>
                ) : null}
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

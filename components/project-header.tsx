import type { ProjectRecord } from "@/lib/types";
import Link from "next/link";

export function ProjectHeader({
  project,
  isAdmin,
}: {
  project: ProjectRecord;
  isAdmin?: boolean;
}) {
  return (
    <header className="mb-6 border-b border-[var(--border)] pb-4">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link
          href={`/programs/${project.programPrefix}`}
          className="rounded bg-noble-stone/40 px-2 py-0.5 font-mono tracking-wider text-noble-black no-print hover:bg-noble-stone/70"
        >
          {project.programPrefix}- · {project.programName ?? "Program"}
        </Link>
        <span className="font-mono tracking-wider text-noble-black">
          {project.projectNumber}
        </span>
        <span>·</span>
        <span>{project.status}</span>
        <span>·</span>
        <span>Owner: {project.owner}</span>
        <span>·</span>
        <span>Last updated {project.lastUpdated}</span>
        <Link
          href={`/projects/${project.projectNumber}/dashboard`}
          className="ml-auto rounded-md border border-[var(--border)] px-2 py-0.5 text-noble-black/70 no-print hover:bg-noble-stone/40"
        >
          Program dashboard →
        </Link>
        {isAdmin ? (
          <Link
            href={`/admin/projects/${project.projectNumber}`}
            className="rounded-md border border-[var(--border)] px-2 py-0.5 text-noble-black/70 no-print hover:bg-noble-stone/40"
          >
            Edit project
          </Link>
        ) : null}
      </div>
      <h1 className="mt-2 font-serif text-2xl font-medium leading-tight text-noble-black">
        {project.name}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{project.subtitle}</p>
    </header>
  );
}

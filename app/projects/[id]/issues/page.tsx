import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { loadIssueTracker } from "@/lib/issues-loader";
import { IssuesBoard } from "./issues-board";

/*
 * Dedicated per-project Issue Tracker — Part → Issue → Challenges/Actions.
 * Content is imported (Claude output pasted as JSON) then triaged here. The page
 * doubles as the print report: controls are .no-print and issue bodies are
 * forced open when printing.
 */
export default async function IssuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, user, tracker] = await Promise.all([
    prisma.projectRow.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, program: { select: { customer: true } } },
    }),
    getCurrentUser(),
    loadIssueTracker(id),
  ]);
  if (!project) notFound();

  const canEdit = user?.role === "admin" || (!!user && project.ownerId === user.id);

  return (
    <article className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <Link
        href={`/projects/${id}`}
        className="no-print mb-3 inline-block text-[11px] tracking-[0.18em] text-[var(--muted)]"
      >
        ← BACK TO PROJECT
      </Link>
      <header className="mb-5">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[var(--muted)] uppercase">
          Issue Tracker
        </div>
        <h1 className="mt-1 font-serif text-3xl font-medium text-noble-black">
          <span className="font-mono text-xl text-[var(--muted)]">{project.id}</span> {project.name}
        </h1>
        {project.program?.customer ? (
          <p className="mt-1 text-sm text-[var(--muted)]">Customer: {project.program.customer}</p>
        ) : null}
      </header>

      <IssuesBoard projectId={id} tracker={tracker} canEdit={canEdit} />
    </article>
  );
}

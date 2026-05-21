import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setAssignmentAction, updateProjectMetaAction } from "../actions";

export default async function AdminProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const { id } = await params;
  const project = await prisma.projectRow.findUnique({
    where: { id },
    include: { assignments: { include: { user: true } }, owner: true },
  });
  if (!project) notFound();

  const engineers = await prisma.user.findMany({
    where: { role: { in: ["engineer", "admin"] }, active: true },
    orderBy: { name: "asc" },
  });
  const assigned = new Set(project.assignments.map((a) => a.userId));

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:underline">
          ← Admin
        </Link>
        <Link href={`/projects/${id}`} className="hover:underline">
          View project →
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl font-medium text-noble-black">
        Project <span className="font-mono">{project.id}</span>
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{project.name}</p>

      <h2 className="mt-8 mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-noble-red">
        Project metadata
      </h2>
      <form
        action={updateProjectMetaAction}
        className="rounded-md border border-[var(--border)] bg-white p-4 space-y-4"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <label className="block">
          <Lbl>Project name</Lbl>
          <input
            name="name"
            defaultValue={project.name}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <Lbl>Subtitle</Lbl>
          <input
            name="subtitle"
            defaultValue={project.subtitle ?? ""}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <Lbl>Owner</Lbl>
            <select
              name="ownerId"
              defaultValue={project.ownerId ?? ""}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="">(unassigned)</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Lbl>Status</Lbl>
            <select
              name="status"
              defaultValue={project.status}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="not_started">Not started</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85"
          >
            Save metadata
          </button>
        </div>
      </form>

      <h2 className="mt-8 mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-noble-red">
        Engineer assignments
      </h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Engineers ticked below see this project pre-listed on their My Week
        time-tracking grid.
      </p>
      <ul className="rounded-md border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
        {engineers.map((eng) => (
          <li key={eng.id} className="flex items-center justify-between px-4 py-2">
            <span className="text-sm">
              {eng.name}{" "}
              <span className="text-[10px] uppercase text-[var(--muted)]">
                ({eng.role})
              </span>
            </span>
            <form action={setAssignmentAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="userId" value={eng.id} />
              <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  name="assigned"
                  defaultChecked={assigned.has(eng.id)}
                />
                Assigned
              </label>
              <button
                type="submit"
                className="ml-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
              >
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
      {children}
    </span>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminProjectsList() {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const projects = await prisma.projectRow.findMany({
    include: { owner: true, assignments: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:underline">
          ← Admin
        </Link>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create new projects (Project # validated as XXX-XXX) and manage
            engineer assignments per project.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85"
        >
          + New project
        </Link>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-strong)] text-left text-xs text-[var(--muted)]">
            <th className="px-3 py-2">Project #</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Owner</th>
            <th className="px-3 py-2 text-right">Assigned engineers</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-[var(--border)]">
              <td className="px-3 py-2 font-mono text-xs tracking-wider">{p.id}</td>
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2 text-xs">
                {p.status === "pipeline" ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-[#BA7517] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white">
                    Pipeline
                  </span>
                ) : (
                  p.status
                )}
              </td>
              <td className="px-3 py-2 text-xs">{p.owner?.name ?? "—"}</td>
              <td className="px-3 py-2 text-right text-xs">
                {p.assignments.length}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

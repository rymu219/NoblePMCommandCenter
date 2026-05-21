import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TimeRollupsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getUTCFullYear();
  const month = sp.month ? parseInt(sp.month, 10) : now.getUTCMonth() + 1;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const [entries, users, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { entryDate: { gte: start, lt: end } },
      include: { user: true, project: true },
    }),
    prisma.user.findMany({
      where: { role: "engineer" },
      orderBy: { name: "asc" },
    }),
    prisma.projectRow.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Matrix: rows = projects, cols = engineers, value = hours.
  const matrix = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!matrix.has(e.projectId)) matrix.set(e.projectId, new Map());
    const row = matrix.get(e.projectId)!;
    row.set(e.userId, (row.get(e.userId) ?? 0) + e.hours);
  }
  const projectsWithHours = projects.filter((p) => matrix.has(p.id));
  const grandTotal = entries.reduce((s, e) => s + e.hours, 0);

  const prev = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:underline">
          ← Admin
        </Link>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Time rollups
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hours by Project × Engineer for the selected month. Replaces the
            spreadsheet&rsquo;s ALL tab.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/admin/time-rollups?year=${prev.getUTCFullYear()}&month=${prev.getUTCMonth() + 1}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
          >
            ← Prev
          </Link>
          <span className="font-mono text-xs text-[var(--muted)]">
            {year}-{String(month).padStart(2, "0")}
          </span>
          <Link
            href={`/admin/time-rollups?year=${next.getUTCFullYear()}&month=${next.getUTCMonth() + 1}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-noble-stone/40"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-noble-black text-white">
              <th className="px-3 py-2 text-left text-xs font-medium">
                Project #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium">Name</th>
              {users.map((u) => (
                <th
                  key={u.id}
                  className="px-2 py-2 text-right text-xs font-medium"
                >
                  {u.name}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {projectsWithHours.map((p) => {
              const row = matrix.get(p.id) ?? new Map<string, number>();
              const total = users.reduce((s, u) => s + (row.get(u.id) ?? 0), 0);
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface)]/40"
                >
                  <td className="px-3 py-1.5 font-mono text-xs tracking-wider">
                    {p.id}
                  </td>
                  <td className="px-3 py-1.5">{p.name}</td>
                  {users.map((u) => (
                    <td
                      key={u.id}
                      className="px-2 py-1.5 text-right font-mono text-xs tabular-nums"
                    >
                      {row.get(u.id) ?? "—"}
                    </td>
                  ))}
                  <td className="bg-[var(--surface)]/60 px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums">
                    {total}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-noble-stone/30 font-medium">
              <td className="px-3 py-2" colSpan={2}>
                Engineer total
              </td>
              {users.map((u) => {
                const t = Array.from(matrix.values()).reduce(
                  (s, row) => s + (row.get(u.id) ?? 0),
                  0
                );
                return (
                  <td
                    key={u.id}
                    className="px-2 py-2 text-right font-mono tabular-nums"
                  >
                    {t}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {projectsWithHours.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No time entries logged for this month yet.
        </p>
      ) : null}
    </div>
  );
}

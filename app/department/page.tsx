import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionShell } from "@/components/section-shell";
import { healthMeta } from "@/components/v2/health";
import { loadDepartment } from "@/lib/department-loader";
import { userDeptDisplay, USER_DEPARTMENTS } from "@/lib/status";
import { getCurrentUser } from "@/lib/auth";

/*
 * v2 Department — the department-head view. Scoped automatically by the
 * signed-in user's department (admins can switch via ?dept=). Read-only
 * and fully derived: team hours, the department's open follow-ups, and
 * the projects the team touches.
 */

export default async function DepartmentPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { dept: requested } = await searchParams;
  const dept = user.role === "admin" && requested ? requested : user.department;
  const view = await loadDepartment(dept);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 py-8">
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-medium text-noble-black">
          {userDeptDisplay(dept)} — Department
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your team&rsquo;s hours, open follow-ups and active projects. Derived
          live — nothing to maintain.
        </p>
        {user.role === "admin" ? (
          <div className="no-print mt-3 flex flex-wrap gap-1.5">
            {USER_DEPARTMENTS.map((d) => (
              <Link
                key={d.value}
                href={`/department?dept=${d.value}`}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  d.value === dept
                    ? "bg-noble-black text-white"
                    : "border border-[var(--border)] text-noble-black/70 hover:bg-noble-stone/40"
                }`}
              >
                {d.display}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <SectionShell title="Team">
        {view.members.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No active members in this department.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2 text-right">Hours this week</th>
                  <th className="px-3 py-2 text-right">Last 4 weeks</th>
                </tr>
              </thead>
              <tbody>
                {view.members.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)] text-noble-black/90">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{m.title ?? ""}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {m.hoursThisWeek.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {m.hoursLast4Weeks.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell title={`Open follow-ups for ${userDeptDisplay(dept)} (${view.followUps.length})`}>
        {view.followUps.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nothing open — clear board.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {view.followUps.map((f) => (
              <div
                key={f.id}
                className="flex items-start gap-2.5 rounded-md border border-[var(--border)] bg-white px-3 py-2"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    f.overdue ? "bg-noble-red" : "bg-noble-black/30"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm leading-snug text-noble-black/90">{f.body}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                    <Link href={`/projects/${f.projectId}`} className="hover:underline">
                      <span className="font-mono">{f.projectId}</span> {f.projectName}
                    </Link>
                    {f.dueIso ? (
                      <span className={f.overdue ? "text-noble-red" : ""}>
                        {" "}
                        · due {f.dueIso}
                        {f.overdue ? " (overdue)" : ""}
                      </span>
                    ) : null}
                    {" "}· open {f.ageDays}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell title="Projects your team touches (last 30 days)">
        {view.projects.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No recent project activity.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Health</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2 text-right">Team hours (30d)</th>
                  <th className="px-3 py-2 text-right">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {view.projects.map((p) => {
                  const meta = healthMeta(p.health);
                  return (
                    <tr key={p.id} className="border-t border-[var(--border)] text-noble-black/90">
                      <td className="px-3 py-2">
                        <Link href={`/projects/${p.id}`} className="hover:underline">
                          <span className="font-mono text-xs text-[var(--muted)]">{p.id}</span>{" "}
                          <span className="font-medium">{p.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">{p.ownerName ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {p.teamHours30d.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[var(--muted)]">
                        {p.lastUpdatedIso}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </div>
  );
}

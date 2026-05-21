import Link from "next/link";
import { SAMPLE_PROJECT_INDEX } from "@/lib/sample-data";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-role-process-fill text-[#085041]",
    "Not started": "bg-noble-fog text-noble-black",
    "On hold": "bg-role-automation-fill text-[#633806]",
    Complete: "bg-noble-stone text-noble-black",
    Archived: "bg-noble-fog text-noble-black/60",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        map[status] ?? "bg-noble-fog text-noble-black"
      }`}
    >
      {status}
    </span>
  );
}

function staleDays(date: string): number {
  const then = new Date(date).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const projects = SAMPLE_PROJECT_INDEX;
  const totals = projects.reduce(
    (a, p) => ({
      hoursLogged: a.hoursLogged + p.hoursLogged,
      hoursEstimated: a.hoursEstimated + (p.hoursEstimated ?? 0),
    }),
    { hoursLogged: 0, hoursEstimated: 0 }
  );

  const stale = projects.filter((p) => staleDays(p.lastUpdated) > 30);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-noble-black">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Programs and projects across Noble Plastics. Click any project to
          open the full template view.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Active projects" value={`${projects.length}`} />
        <Card
          label="Hours logged (sample)"
          value={`${totals.hoursLogged}`}
          unit="hrs"
        />
        <Card
          label="Hours estimated"
          value={`${totals.hoursEstimated}`}
          unit="hrs"
        />
        <Card
          label="Stale (30d+)"
          value={`${stale.length}`}
          unit="projects"
          accent={stale.length > 0}
        />
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="font-medium text-noble-black">Projects</h2>
          <Link
            href="/admin/new-project"
            className="rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85"
          >
            + New Project
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted)]">
                <th className="px-4 py-2">Project #</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Program</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Last updated</th>
                <th className="px-4 py-2 text-right">Hours (logged / est)</th>
                <th className="px-4 py-2">Next gate</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const days = staleDays(p.lastUpdated);
                const isStale = days > 30;
                return (
                  <tr
                    key={p.projectNumber}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface)]/60"
                  >
                    <td className="px-4 py-2 font-mono text-xs tracking-wider">
                      <Link
                        href={`/projects/${p.projectNumber}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {p.projectNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/projects/${p.projectNumber}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[var(--muted)]">
                      <Link
                        href={`/programs/${p.programPrefix}`}
                        className="hover:underline"
                      >
                        {p.programPrefix}-
                      </Link>
                    </td>
                    <td className="px-4 py-2">{statusBadge(p.status)}</td>
                    <td className="px-4 py-2">{p.owner}</td>
                    <td
                      className={`px-4 py-2 text-xs ${
                        isStale ? "text-noble-red" : "text-[var(--muted)]"
                      }`}
                    >
                      {p.lastUpdated}
                      {isStale ? ` · ${days}d` : ""}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.hoursLogged}
                      <span className="text-[var(--muted)]">
                        {" / "}
                        {p.hoursEstimated ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--muted)]">
                      {p.nextGate ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-[var(--muted)]">
        v0 scaffold. Data shown above is sample data drawn from the time
        tracking spreadsheet you shared, plus the E-Delta Canister template.
      </p>
    </div>
  );
}

function Card({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        accent
          ? "border-noble-red/30 bg-noble-red/5"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div
          className={`text-2xl font-medium leading-tight ${
            accent ? "text-noble-red" : "text-noble-black"
          }`}
        >
          {value}
        </div>
        {unit ? (
          <div className="text-xs text-[var(--muted)]">{unit}</div>
        ) : null}
      </div>
    </div>
  );
}

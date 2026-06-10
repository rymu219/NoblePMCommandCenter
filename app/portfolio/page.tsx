import { redirect } from "next/navigation";
import { SectionShell } from "@/components/section-shell";
import { PortfolioTimeline } from "@/components/v2/portfolio-timeline";
import { ProjectCard } from "@/components/v2/project-card";
import { HEALTHS, healthMeta } from "@/components/v2/health";
import { loadPortfolio, type PortfolioProject } from "@/lib/portfolio-loader";
import { getCurrentUser } from "@/lib/auth";

/*
 * v2 Portfolio — the executive view. Health-colored project cards, the
 * all-projects milestone timeline, and budget burn. 100% derived from
 * project/milestone/budget data: nothing here is hand-maintained.
 */

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { projects, todayIso } = await loadPortfolio();

  const healthCounts = new Map<string, number>();
  for (const p of projects) {
    healthCounts.set(p.health, (healthCounts.get(p.health) ?? 0) + 1);
  }
  const budgetTotal = projects.reduce((s, p) => s + (p.budgetTotal ?? 0), 0);
  const spentTotal = projects.reduce((s, p) => s + (p.spentTotal ?? 0), 0);
  const overdueCount = projects.reduce(
    (s, p) => s + p.openMilestones.filter((m) => m.overdue).length,
    0
  );

  const byProgram = new Map<string, PortfolioProject[]>();
  for (const p of projects) {
    const key = `${p.programPrefix}|${p.programName ?? ""}`;
    (byProgram.get(key) ?? byProgram.set(key, []).get(key)!).push(p);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-medium text-noble-black">Portfolio</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every active project at a glance — health, schedule and burn. Derived
          live from project data; click anything to drill in.
        </p>
      </div>

      {/* summary chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-noble-black px-3 py-1 text-xs font-medium text-white">
          {projects.length} active projects
        </span>
        {HEALTHS.map((h) => {
          const n = healthCounts.get(h.value) ?? 0;
          if (n === 0) return null;
          return (
            <span
              key={h.value}
              className={`rounded-full px-3 py-1 text-xs font-medium ${h.pill}`}
            >
              {n} {h.label.toLowerCase()}
            </span>
          );
        })}
        {overdueCount > 0 ? (
          <span className="rounded-full border border-noble-red px-3 py-1 text-xs font-medium text-noble-red">
            {overdueCount} overdue milestones
          </span>
        ) : null}
        {budgetTotal > 0 ? (
          <span className="ml-auto text-xs text-[var(--muted)]">
            {fmtMoney(spentTotal)} spent of {fmtMoney(budgetTotal)} budgeted
          </span>
        ) : null}
      </div>

      <SectionShell title="Schedule — open milestones across all projects">
        <PortfolioTimeline projects={projects} todayIso={todayIso} />
      </SectionShell>

      {[...byProgram.entries()].map(([key, group]) => {
        const [prefix, name] = key.split("|");
        return (
          <SectionShell
            key={key}
            title={name ? `${prefix} — ${name}` : `Program ${prefix}`}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </SectionShell>
        );
      })}

      {projects.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No active projects.</p>
      ) : null}

      {/* keep the worst news visible even after scrolling the cards */}
      {projects.some((p) => p.health !== "on_track") ? (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-white p-4">
          <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
            Needs attention
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {projects
              .filter((p) => p.health !== "on_track")
              .map((p) => {
                const meta = healthMeta(p.health);
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <a href={`/projects/${p.id}`} className="hover:underline">
                      <span className="font-mono text-xs text-[var(--muted)]">{p.id}</span>{" "}
                      {p.name}
                    </a>
                    <span className="text-xs text-[var(--muted)]">
                      — {meta.label}
                      {p.nextMilestone?.overdue
                        ? `, "${p.nextMilestone.title}" overdue since ${p.nextMilestone.targetIso}`
                        : ""}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

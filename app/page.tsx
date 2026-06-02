import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  loadPortfolio,
  loadOpenFollowups,
  loadPortfolioNotes,
  loadAttentionItems,
} from "@/lib/status-loader";
import { listProjectsForDashboard } from "@/lib/project-loader";
import { AttentionStrip } from "@/components/attention-strip";
import { PageContainer } from "@/components/page-container";
import { PageHero } from "@/components/page-hero";
import { StatChip } from "@/components/stat-chip";
import { StatusPill } from "@/components/status-pill";
import { StatusSummary } from "@/components/status-summary";
import { deptDisplay, statusMeta } from "@/lib/status";
import { PortfolioNote } from "./portfolio-note";
import { PublishButton } from "./publish-button";

/** Department → accent color for follow-up cards. Reuses the role tokens where
 *  they exist; falls back to supplementary brand colors for the rest. */
const DEPT_ACCENT: Record<string, string> = {
  engineering: "var(--color-role-engineering)",
  process: "var(--color-role-process)",
  automation: "var(--color-role-automation)",
  quality: "var(--color-role-quality)",
  program_pm: "var(--color-noble-navy)",
  operations: "var(--color-noble-slate)",
  sales: "var(--color-noble-brick)",
  purchasing: "var(--color-noble-navy)",
  scheduling: "var(--color-noble-slate)",
};
function deptAccent(dept: string): string {
  return DEPT_ACCENT[dept] ?? "var(--color-noble-navy)";
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DailyReportDashboard() {
  const user = await getCurrentUser();
  const today = todayUtc();
  const isAdmin = user?.role === "admin";
  const [portfolio, followups, notes, projectsList, attention] = await Promise.all([
    loadPortfolio(),
    loadOpenFollowups(),
    loadPortfolioNotes(today),
    listProjectsForDashboard(),
    loadAttentionItems({ isAdmin, today }),
  ]);

  const canEdit = user?.role === "admin" || user?.role === "engineer";

  // Group projects with status updates vs not, by program.
  const portfolioWithStatus = portfolio
    .map((g) => ({
      ...g,
      projects: g.projects.filter((p) => p.status),
    }))
    .filter((g) => g.projects.length > 0);

  const portfolioNoStatus = portfolio
    .map((g) => ({ ...g, projects: g.projects.filter((p) => !p.status) }))
    .filter((g) => g.projects.length > 0);

  // Auto-suggest key risks from At Risk / Blocked projects.
  const atRiskPreview = portfolio
    .flatMap((g) => g.projects)
    .filter((p) => p.status && ["at_risk", "blocked"].includes(p.status.label))
    .map(
      (p) =>
        `- ${p.projectName}: ${statusMeta(p.status!.label).display}${
          p.status?.qualifier ? ` (${p.status.qualifier})` : ""
        }`
    )
    .join("\n");

  const snapshot = {
    reportDate: today.toISOString(),
    notes,
    portfolio: portfolioWithStatus,
    followups,
  };

  const activeCount = projectsList.filter((p) => p.status !== "Pipeline").length;

  return (
    <PageContainer>
      <PageHero
        eyebrow="Daily Tooling Report — Draft"
        title={prettyDate(today)}
        subtitle={
          <>
            Live draft of today&rsquo;s report. Publishing snapshots a permanent
            copy to <Link href="/reports" className="underline">Reports</Link>.
          </>
        }
        actions={
          <div className="flex items-center gap-2 no-print">
            <Link
              href="/projects"
              className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs hover:bg-noble-stone/40"
            >
              Projects (list)
            </Link>
            {isAdmin ? <PublishButton snapshot={snapshot} /> : null}
          </div>
        }
        stats={
          <>
            <StatChip
              value={portfolio.length}
              label="Programs"
              accent="var(--color-noble-navy)"
            />
            <StatChip
              value={activeCount}
              label="Active projects"
              accent="var(--color-role-process)"
            />
            <StatChip
              value={Object.keys(followups).length}
              label="Follow-up owners"
              accent="var(--color-role-automation)"
            />
            <StatChip
              value={attention.total}
              label="Need attention"
              accent="var(--color-noble-red)"
            />
          </>
        }
      />

      {/* WHAT NEEDS ATTENTION */}
      <AttentionStrip groups={attention} />

      {/* PRIORITY CALLOUT */}
      <ReportSection title="Priority Callout">
        <div className="card border-l-4 border-l-noble-red p-4">
          <PortfolioNote
            kind="priority_callout"
            initialBody={notes.priority_callout ?? ""}
            placeholder="Top 3–5 things to act on today. One per line; start with - for bullets."
            canEdit={canEdit}
          />
        </div>
      </ReportSection>

      {/* PROGRAMS + PROJECTS */}
      {portfolioWithStatus.length === 0 ? (
        <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          No status updates posted yet. Open any{" "}
          <Link href="/projects" className="underline">
            project
          </Link>{" "}
          and click <span className="font-medium">+ New status update</span> to
          add one.
        </div>
      ) : null}
      {portfolioWithStatus.map((group) => (
        <ReportSection
          key={group.prefix}
          title={`${group.programName ?? "Program"} — ${group.prefix}-`}
        >
          <div className="grid grid-cols-1 gap-4">
            {group.projects.map((p) => (
              <article
                key={p.projectId}
                className="card card-interactive overflow-hidden"
              >
                {/* Status-colored top stripe (echoes the dashboard metric cards). */}
                <div className={`h-1.5 ${statusMeta(p.status!.label).bar}`} />
                <div className="p-4">
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/projects/${p.projectId}`}
                        className="font-serif text-lg font-medium text-noble-black hover:underline"
                      >
                        {p.projectName}
                      </Link>
                      <div className="mt-1 inline-block rounded bg-noble-stone/40 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-[var(--muted-strong)]">
                        {p.projectId}
                      </div>
                    </div>
                    <StatusPill
                      label={p.status!.label}
                      qualifier={p.status!.qualifier}
                    />
                  </header>
                  <div className="mt-3">
                    <StatusSummary blocks={p.status!.blocks} />
                  </div>
                  <div className="mt-3 text-[10px] text-[var(--muted)]">
                    Reported {p.status!.reportDate.toISOString().slice(0, 10)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ReportSection>
      ))}

      {/* Projects without any status update yet — surface so they don't disappear */}
      {portfolioNoStatus.length > 0 ? (
        <ReportSection title="No status posted yet">
          <ul className="card divide-y divide-[var(--border)] overflow-hidden">
            {portfolioNoStatus.flatMap((g) =>
              g.projects.map((p) => (
                <li
                  key={p.projectId}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span>
                    <span className="font-mono text-xs text-[var(--muted)] mr-2">
                      {p.projectId}
                    </span>
                    <Link
                      href={`/projects/${p.projectId}`}
                      className="hover:underline"
                    >
                      {p.projectName}
                    </Link>
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {g.prefix}-
                  </span>
                </li>
              ))
            )}
          </ul>
        </ReportSection>
      ) : null}

      {/* FOLLOW-UP LIST BY OWNER */}
      <ReportSection title="Follow-up list by owner">
        {Object.keys(followups).length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No open action items.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(followups).map(([dept, items]) => (
              <div
                key={dept}
                className="card card-interactive border-l-4 p-3"
                style={{ borderLeftColor: deptAccent(dept) }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-[10px] font-semibold tracking-[0.12em] uppercase"
                    style={{ color: deptAccent(dept) }}
                  >
                    {deptDisplay(dept)}
                  </div>
                  <span className="rounded-full bg-noble-stone/40 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-strong)]">
                    {items.length}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-2">
                      <span className="text-noble-red">·</span>
                      <span>
                        <Link
                          href={`/projects/${it.projectId}`}
                          className="text-noble-navy hover:underline"
                        >
                          {it.projectName}
                        </Link>
                        : {it.body}
                        {it.dueDate ? (
                          <span className="ml-1 text-xs text-[var(--muted)]">
                            (due {it.dueDate.toISOString().slice(0, 10)})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      {/* KEY RISKS */}
      <ReportSection title="Key risks summary">
        <div className="card border-l-4 border-l-[#BA7517] p-4">
          {atRiskPreview && !notes.key_risks ? (
            <p className="mb-2 text-xs italic text-[var(--muted)]">
              Auto-suggested from At Risk / Blocked projects (edit to refine):
              <br />
              {atRiskPreview.split("\n").map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </p>
          ) : null}
          <PortfolioNote
            kind="key_risks"
            initialBody={notes.key_risks ?? ""}
            placeholder="Cross-portfolio risks. One per line; start with - for bullets."
            canEdit={canEdit}
          />
        </div>
      </ReportSection>

      {/* FORWARD-LOOKING NOTES */}
      <ReportSection title="Forward-looking notes">
        <div className="card border-l-4 border-l-noble-navy p-4">
          <PortfolioNote
            kind="forward_looking"
            initialBody={notes.forward_looking ?? ""}
            placeholder="What to watch in the next window."
            canEdit={canEdit}
          />
        </div>
      </ReportSection>

      <footer className="mt-12 border-t border-[var(--border)] pt-4 text-[10px] font-semibold tracking-[0.16em] uppercase text-noble-black/60 flex justify-between">
        <span>Noble Plastics • PM Command Center</span>
        <span>{prettyDate(today)}</span>
      </footer>

      {/* Hidden snapshot link to all-projects list for quick admin reference */}
      <p className="mt-4 text-xs text-[var(--muted)]">
        Showing{" "}
        {projectsList.filter((p) => p.status !== "Pipeline").length} active
        projects across {portfolio.length} programs.
      </p>
    </PageContainer>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-noble-red" aria-hidden />
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-noble-red">
          {title}
        </h2>
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
      </div>
      {children}
    </section>
  );
}

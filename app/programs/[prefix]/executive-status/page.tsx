import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProgramRollup } from "@/lib/program-rollup";
import { getCurrentUser } from "@/lib/auth";
import { ProgramNarrativeEditor } from "./narrative-editor";
import { deptDisplay } from "@/lib/status";

export const dynamic = "force-dynamic";

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function healthPill(health: string | null): {
  label: string;
  className: string;
} {
  if (!health) return { label: "—", className: "bg-noble-stone/40 text-noble-black/70" };
  if (health === "on_schedule") return { label: "ON SCHEDULE", className: "bg-emerald-700 text-white" };
  if (health === "at_risk") return { label: "AT RISK", className: "bg-amber-600 text-white" };
  if (health === "off_track") return { label: "OFF TRACK", className: "bg-noble-red text-white" };
  return { label: health.toUpperCase(), className: "bg-noble-stone/40 text-noble-black/70" };
}

function statusPill(label: string | null): { display: string; className: string } {
  const lc = (label ?? "").toLowerCase();
  if (lc.includes("at risk") || lc === "at_risk")
    return { display: "At Risk", className: "bg-amber-100 text-amber-900" };
  if (lc.includes("block")) return { display: "Blocked", className: "bg-red-100 text-red-900" };
  if (lc.includes("on track") || lc === "on_track")
    return { display: "On Track", className: "bg-emerald-100 text-emerald-900" };
  if (lc.includes("in progress") || lc === "in_progress")
    return { display: "In Progress", className: "bg-blue-100 text-blue-900" };
  if (lc.includes("complete")) return { display: "Complete", className: "bg-noble-stone/50 text-noble-black/70" };
  return { display: label ?? "—", className: "bg-noble-stone/40 text-noble-black/80" };
}

export default async function ExecutiveStatusPage({
  params,
}: {
  params: Promise<{ prefix: string }>;
}) {
  const { prefix } = await params;
  const [rollup, user] = await Promise.all([
    loadProgramRollup(prefix),
    getCurrentUser(),
  ]);
  if (!rollup) notFound();

  // For now any admin can edit the program-level narrative.
  const canEdit = user?.role === "admin";
  const overallHealth =
    rollup.totals.atRiskProjectCount === 0 ? "on_schedule" : "at_risk";
  const overall = healthPill(overallHealth);
  const today = new Date();

  return (
    <article className="mx-auto w-full max-w-[1024px] px-8 py-8 print:px-0 print:py-0">
      <div className="no-print mb-3 flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href={`/programs/${prefix}`} className="hover:underline">
          ← Program {prefix}-
        </Link>
        <Link href="/" className="hover:underline">
          Daily Report
        </Link>
      </div>

      {/* Header */}
      <header className="border-b-2 border-noble-black pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[11px] font-semibold tracking-[0.28em] text-noble-red">
            EXECUTIVE STATUS REPORT
          </div>
          <div className="text-[11px] tracking-[0.18em] text-[var(--muted)]">
            {fmtLongDate(today).toUpperCase()}
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl font-medium leading-tight text-noble-black">
              {rollup.programName ?? `Program ${prefix}`}
            </h1>
            <div className="mt-1 text-sm text-[var(--muted)]">
              Program <span className="font-mono">{prefix}-</span>
              {rollup.customer ? <> · {rollup.customer}</> : null}
              <> · {rollup.totals.activeProjectCount} active project{rollup.totals.activeProjectCount === 1 ? "" : "s"}</>
            </div>
          </div>
          <span
            className={`rounded-md px-4 py-1.5 text-[12px] font-semibold tracking-[0.22em] ${overall.className}`}
          >
            {overall.label}
          </span>
        </div>
      </header>

      {/* Totals strip */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <TotalCard label="Program budget" value={fmtMoney(rollup.totals.budget)} subline="Approved across all projects" />
        <TotalCard label="Committed" value={fmtMoney(rollup.totals.committed)} subline="POs placed" />
        <TotalCard label="Forecast" value={fmtMoney(rollup.totals.forecast)} subline="Estimate at completion" />
        <TotalCard
          label="Headroom"
          value={(rollup.totals.headroom >= 0 ? "+" : "−") + fmtMoney(Math.abs(rollup.totals.headroom))}
          subline={rollup.totals.headroom >= 0 ? "Under program budget" : "Over program budget"}
          accent={rollup.totals.headroom >= 0 ? "positive" : "negative"}
        />
      </section>

      {/* Executive summary */}
      <SectionLabel>EXECUTIVE SUMMARY</SectionLabel>
      {rollup.execSummary ? (
        <div className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-relaxed text-noble-black">
          {rollup.execSummary}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2.5 text-sm text-[var(--muted)]">
          No executive summary written for this reporting period.
          {canEdit ? " Use the editor at the bottom of the report to write one." : ""}
        </p>
      )}

      {/* Project status table */}
      <SectionLabel>PROJECTS</SectionLabel>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-noble-black text-left text-[10px] uppercase tracking-wider text-noble-black/70">
            <th className="px-2 py-1.5">Project #</th>
            <th className="px-2 py-1.5">Name</th>
            <th className="px-2 py-1.5">Status</th>
            <th className="px-2 py-1.5">Owner</th>
            <th className="px-2 py-1.5 text-right">Budget</th>
            <th className="px-2 py-1.5 text-right">Forecast</th>
            <th className="px-2 py-1.5">Next key date</th>
          </tr>
        </thead>
        <tbody>
          {rollup.projects.map((p) => {
            const sp = statusPill(p.latestStatusLabel);
            return (
              <tr key={p.id} className="border-b border-[var(--border)] align-top">
                <td className="px-2 py-2 font-mono text-xs tracking-wider">{p.id}</td>
                <td className="px-2 py-2">
                  <Link href={`/projects/${p.id}`} className="font-medium text-noble-black hover:underline">
                    {p.name}
                  </Link>
                  {p.latestStatusOneLiner ? (
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {p.latestStatusOneLiner}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${sp.className}`}>
                    {sp.display}
                  </span>
                  {p.latestStatusQualifier ? (
                    <div className="mt-0.5 text-[10px] italic text-[var(--muted)]">
                      {p.latestStatusQualifier}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-xs">{p.ownerName ?? "—"}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">
                  {p.budgetTotal != null ? fmtMoney(p.budgetTotal) : "—"}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs">
                  {p.forecastTotal != null ? fmtMoney(p.forecastTotal) : "—"}
                </td>
                <td className="px-2 py-2 text-xs">
                  {p.nextPhaseEnd ? (
                    <>
                      <span className="font-medium">{p.nextPhaseEnd.name}</span>
                      <span className="ml-1 text-[var(--muted)]">{fmtDate(p.nextPhaseEnd.date)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Two-up: Upcoming Milestones + Open Risks */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <SectionLabel>UPCOMING MILESTONES · NEXT 60 DAYS</SectionLabel>
          {rollup.upcomingMilestones.length === 0 ? (
            <Empty text="No phase boundaries within the next 60 days." />
          ) : (
            <ul className="space-y-2">
              {rollup.upcomingMilestones.map((m, i) => (
                <li key={i} className="flex items-start gap-3 border-l-2 border-noble-red bg-white px-3 py-2 text-sm">
                  <div className="w-20 shrink-0 font-mono text-xs tracking-wider text-noble-black">
                    {fmtDate(m.date)}
                  </div>
                  <div>
                    <div>{m.phaseName}</div>
                    <div className="text-xs text-[var(--muted)]">
                      <span className="font-mono">{m.projectId}</span> · {m.projectName}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SectionLabel>OPEN RISKS &amp; PRE-CONDITIONS</SectionLabel>
          {rollup.openRisks.length === 0 ? (
            <Empty text="No unresolved risks across the program." />
          ) : (
            <ul className="space-y-2">
              {rollup.openRisks.map((r, i) => (
                <li key={i} className="flex items-start gap-3 border-l-2 border-amber-500 bg-white px-3 py-2 text-sm">
                  <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-noble-red" />
                  <div className="flex-1">
                    <div>{r.text}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      <span className="font-mono">{r.projectId}</span> · {r.projectName}
                      {r.owner ? <> · owner {r.owner}</> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Decisions needed for customer */}
      <SectionLabel>DECISIONS NEEDED FROM CUSTOMER</SectionLabel>
      {rollup.decisionsAsked ? (
        <div className="whitespace-pre-wrap rounded-md border-l-4 border-noble-red bg-white px-4 py-3 text-sm leading-relaxed text-noble-black">
          {rollup.decisionsAsked}
        </div>
      ) : (
        <Empty text="No decisions outstanding for customer review." />
      )}

      {/* Open action items grouped by department */}
      <SectionLabel>OPEN FOLLOW-UPS</SectionLabel>
      <ActionItemTable items={rollup.openActionItems} />

      {/* Recent decisions */}
      <SectionLabel>RECENT DECISIONS · LAST 30 DAYS</SectionLabel>
      {rollup.recentDecisions.length === 0 ? (
        <Empty text="No decisions logged in the last 30 days." />
      ) : (
        <ul className="space-y-1.5">
          {rollup.recentDecisions.map((d, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="w-20 shrink-0 font-mono text-xs tracking-wider text-noble-black/70">
                {d.date}
              </div>
              <div className="flex-1">
                <div>{d.decision}</div>
                <div className="text-xs text-[var(--muted)]">
                  <span className="font-mono">{d.projectId}</span> · {d.projectName} · {d.source}
                  {d.author ? <> · {d.author}</> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-noble-black pt-3 text-[11px] tracking-[0.22em] text-noble-black/70">
        NOBLE PLASTICS
        <span className="mx-3">•</span>
        {prefix}{rollup.customer ? ` — ${rollup.customer.toUpperCase()}` : ""}
        <span className="mx-3">•</span>
        EXECUTIVE STATUS REPORT
      </footer>

      {canEdit ? (
        <div className="no-print mt-8">
          <ProgramNarrativeEditor
            prefix={prefix}
            initial={{
              execSummary: rollup.execSummary ?? "",
              decisionsAsked: rollup.decisionsAsked ?? "",
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-7 mb-3 text-[10px] font-semibold tracking-[0.28em] text-noble-red">
      {children}
    </h2>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2.5 text-sm text-[var(--muted)]">
      {text}
    </p>
  );
}

function TotalCard({
  label,
  value,
  subline,
  accent,
}: {
  label: string;
  value: string;
  subline?: string;
  accent?: "positive" | "negative";
}) {
  const valColor =
    accent === "positive"
      ? "text-emerald-700"
      : accent === "negative"
        ? "text-noble-red"
        : "text-noble-black";
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-4 py-3">
      <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-noble-black/60">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold leading-tight ${valColor}`}>{value}</div>
      {subline ? <div className="mt-0.5 text-xs text-[var(--muted)]">{subline}</div> : null}
    </div>
  );
}

function ActionItemTable({
  items,
}: {
  items: Array<{
    projectId: string;
    projectName: string;
    ownerDept: string;
    body: string;
    dueDate: Date | null;
  }>;
}) {
  if (items.length === 0) {
    return <Empty text="No open follow-ups across the program." />;
  }
  // Group by ownerDept
  const groups = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.ownerDept] ??= []).push(it);
    return acc;
  }, {});
  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([dept, list]) => (
        <div key={dept}>
          <div className="mb-1 text-[11px] font-semibold tracking-wider uppercase text-noble-black/80">
            {deptDisplay(dept)}
          </div>
          <ul className="space-y-1 text-sm">
            {list.map((it, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-noble-red">·</span>
                <span className="flex-1">
                  {it.body}
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    [{it.projectId}]
                  </span>
                  {it.dueDate ? (
                    <span className="ml-1 text-xs text-[var(--muted)]">
                      due {it.dueDate.toISOString().slice(0, 10)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

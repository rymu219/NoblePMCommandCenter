import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/status-pill";
import { StatusBlocks } from "@/components/status-blocks";
import { StatusSkeletonHeader } from "@/components/status-skeleton";
import { deptDisplay, parseBlocks } from "@/lib/status";

/*
 * Renders a frozen Report snapshot. The snapshot JSON mirrors the
 * dashboard's structure so the layout is consistent.
 */

interface SnapshotShape {
  reportDate: string;
  notes: Record<string, string>;
  portfolio: Array<{
    prefix: string;
    programName: string | null;
    projects: Array<{
      projectId: string;
      projectName: string;
      status: {
        label: string;
        qualifier: string | null;
        reportDate: string;
        blocks: unknown; // could be array or string
        // Skeleton fields — present on snapshots published after the skeleton
        // shipped; absent (undefined) on older ones. Date is an ISO string
        // here because JSON.stringify serializes Date that way.
        scheduleConfidence?: string | null;
        budgetConfidence?: string | null;
        nextMilestone?: string | null;
        nextMilestoneDate?: string | null;
        topFocus?: string | null;
      } | null;
    }>;
  }>;
  followups: Record<
    string,
    Array<{
      id: string;
      projectId: string;
      projectName: string;
      body: string;
      dueDate: string | null;
    }>
  >;
}

function prettyDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function coerceBlocks(b: unknown): { heading: string; body: string }[] {
  if (Array.isArray(b)) {
    return b
      .filter(
        (x): x is { heading: string; body: string } =>
          x && typeof x.heading === "string" && typeof x.body === "string"
      )
      .map((x) => ({ heading: x.heading, body: x.body }));
  }
  if (typeof b === "string") return parseBlocks(b);
  return [];
}

export default async function ReportSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) notFound();
  let snap: SnapshotShape;
  try {
    snap = JSON.parse(report.snapshot);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-noble-red">
            Daily Tooling Report — Published
          </div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            {prettyDate(snap.reportDate)}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Published {report.publishedAt.toISOString().slice(0, 10)}. Frozen
            snapshot — does not reflect later edits.
          </p>
        </div>
        <Link
          href="/reports"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40 no-print"
        >
          ← All reports
        </Link>
      </div>

      <ReportSection title="Priority Callout">
        <Body body={snap.notes?.priority_callout ?? ""} />
      </ReportSection>

      {snap.portfolio
        .filter((g) => g.projects.some((p) => p.status))
        .map((group) => (
          <ReportSection
            key={group.prefix}
            title={`${group.programName ?? "Program"} — ${group.prefix}-`}
          >
            <div className="space-y-4">
              {group.projects
                .filter((p) => p.status)
                .map((p) => (
                  <article
                    key={p.projectId}
                    className="rounded-lg border border-[var(--border)] bg-white p-4"
                  >
                    <header className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-serif text-lg font-medium text-noble-black">
                          {p.projectName}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--muted)]">
                          {p.projectId}
                        </div>
                      </div>
                      <StatusPill
                        label={p.status!.label}
                        qualifier={p.status!.qualifier}
                      />
                    </header>
                    <div className="mt-3">
                      <StatusSkeletonHeader
                        skeleton={{
                          scheduleConfidence:
                            p.status!.scheduleConfidence ?? null,
                          budgetConfidence: p.status!.budgetConfidence ?? null,
                          nextMilestone: p.status!.nextMilestone ?? null,
                          nextMilestoneDate: p.status!.nextMilestoneDate
                            ? new Date(p.status!.nextMilestoneDate)
                            : null,
                          topFocus: p.status!.topFocus ?? null,
                        }}
                      />
                    </div>
                    <div className="mt-3">
                      <StatusBlocks blocks={coerceBlocks(p.status!.blocks)} />
                    </div>
                    <div className="mt-3 text-[10px] text-[var(--muted)]">
                      Reported {p.status!.reportDate.slice(0, 10)}
                    </div>
                  </article>
                ))}
            </div>
          </ReportSection>
        ))}

      <ReportSection title="Follow-up list by owner">
        {Object.keys(snap.followups ?? {}).length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No open action items at publish.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(snap.followups).map(([dept, items]) => (
              <div
                key={dept}
                className="rounded-lg border border-[var(--border)] bg-white p-3"
              >
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-noble-black/70">
                  {deptDisplay(dept)}
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-2">
                      <span className="text-noble-red">·</span>
                      <span>
                        {it.projectName}: {it.body}
                        {it.dueDate ? (
                          <span className="ml-1 text-xs text-[var(--muted)]">
                            (due {it.dueDate.slice(0, 10)})
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

      <ReportSection title="Key risks summary">
        <Body body={snap.notes?.key_risks ?? ""} />
      </ReportSection>

      <ReportSection title="Forward-looking notes">
        <Body body={snap.notes?.forward_looking ?? ""} />
      </ReportSection>

      <footer className="mt-12 border-t border-[var(--border)] pt-4 text-[10px] font-semibold tracking-[0.16em] uppercase text-noble-black/60 flex justify-between">
        <span>Noble Plastics • PM Command Center</span>
        <span>{prettyDate(snap.reportDate)}</span>
      </footer>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-noble-red">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Body({ body }: { body: string }) {
  const lines = body.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) {
    return <p className="text-sm italic text-[var(--muted)]">—</p>;
  }
  const allBulleted = lines.every((l) => /^[-•·]\s+/.test(l));
  if (allBulleted) {
    return (
      <ul className="list-disc pl-5 text-sm leading-relaxed text-noble-black/85">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^[-•·]\s+/, "")}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-1 text-sm leading-relaxed text-noble-black/85">
      {lines.map((l, i) =>
        /^[-•·]\s+/.test(l) ? (
          <div key={i} className="pl-4 relative">
            <span className="absolute left-0 text-noble-red">·</span>
            {l.replace(/^[-•·]\s+/, "")}
          </div>
        ) : (
          <p key={i}>{l}</p>
        )
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/project-header";
import { SectionShell } from "@/components/section-shell";
import { SummaryCardsSection } from "@/components/sections/summary-cards";
import { PartsMaterialSection } from "@/components/sections/parts-material";
import { HoursByRoleSection } from "@/components/sections/hours-by-role";
import { GanttOverview } from "@/components/sections/gantt-overview";
import { GanttDetail } from "@/components/sections/gantt-detail";
import { RisksSection } from "@/components/sections/risks";
import { DecisionsSection } from "@/components/sections/decisions";
import { NotesBlock } from "@/components/sections/notes-block";
import { Legend } from "@/components/sections/legend";
import { StatusPill } from "@/components/status-pill";
import { StatusBlocks } from "@/components/status-blocks";
import { loadProject } from "@/lib/project-loader";
import { loadLatestStatus } from "@/lib/status-loader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deptDisplay } from "@/lib/status";
import { StatusEditor } from "./status-editor";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, latest, user, openItems] = await Promise.all([
    loadProject(id),
    loadLatestStatus(id),
    getCurrentUser(),
    prisma.actionItem.findMany({
      where: { projectId: id, completedAt: null },
      orderBy: [{ ownerDept: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!project) notFound();

  const s = project.sections;
  const canEdit = user?.role === "admin" || user?.role === "engineer";

  const itemsByDept = openItems.reduce<Record<string, typeof openItems>>(
    (acc, it) => {
      (acc[it.ownerDept] ??= []).push(it);
      return acc;
    },
    {}
  );

  return (
    <article className="mx-auto w-full max-w-[960px] px-6 py-8">
      <ProjectHeader project={project} isAdmin={user?.role === "admin"} />

      {/* Current Status — always at top */}
      <SectionShell title="Current status">
        {latest ? (
          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <StatusPill
                  label={latest.label}
                  qualifier={latest.qualifier}
                  size="lg"
                />
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Reported {latest.reportDate.toISOString().slice(0, 10)}
                  {latest.authorName ? ` · ${latest.authorName}` : ""}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <StatusBlocks blocks={latest.blocks} />
            </div>
            {Object.keys(itemsByDept).length > 0 ? (
              <div className="mt-5 border-t border-[var(--border)] pt-3">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
                  Open action items
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries(itemsByDept).map(([dept, list]) => (
                    <div key={dept}>
                      <div className="text-[11px] font-medium text-noble-black">
                        {deptDisplay(dept)}
                      </div>
                      <ul className="mt-1 space-y-1 text-sm text-noble-black/85">
                        {list.map((it) => (
                          <li key={it.id} className="flex gap-2">
                            <span className="text-noble-red">·</span>
                            <span>
                              {it.body}
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
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No status updates yet for this project.
          </p>
        )}
        {canEdit ? (
          <div className="no-print mt-3">
            <StatusEditor projectId={project.projectNumber} />
          </div>
        ) : null}
      </SectionShell>

      {s.summaryCards ? (
        <SectionShell title="Summary">
          <SummaryCardsSection rows={s.summaryCards} />
        </SectionShell>
      ) : null}

      {s.partsMaterial ? (
        <SectionShell title="Parts & material by run">
          <PartsMaterialSection rows={s.partsMaterial.rows} />
        </SectionShell>
      ) : null}

      {s.hoursByRole ? (
        <SectionShell title="Hours by role">
          <HoursByRoleSection rows={s.hoursByRole.rows} />
        </SectionShell>
      ) : null}

      {s.ganttOverview ? (
        <SectionShell title="Gantt — schedule overview">
          <GanttOverview {...s.ganttOverview} />
        </SectionShell>
      ) : null}

      {s.ganttDetail ? (
        <SectionShell title="Part requalification — sequential detail (day / hour scale)">
          <GanttDetail {...s.ganttDetail} />
        </SectionShell>
      ) : null}

      <SectionShell title="Legend">
        <Legend />
      </SectionShell>

      {s.risks ? (
        <SectionShell title="Risks & pre-conditions">
          <RisksSection items={s.risks} />
        </SectionShell>
      ) : null}

      <SectionShell title="Decisions log">
        <DecisionsSection items={s.decisions ?? []} />
      </SectionShell>

      {s.notes && s.notes.length > 0 ? (
        <SectionShell title="Notes">
          <NotesBlock blocks={s.notes} />
        </SectionShell>
      ) : null}
    </article>
  );
}

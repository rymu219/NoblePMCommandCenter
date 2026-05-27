import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/project-header";
import { SectionShell } from "@/components/section-shell";
import { SectionToggleBar } from "@/components/section-toggle-bar";
import { SectionEdit } from "@/components/sections/section-edit";
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
import { buildGanttLegend } from "@/lib/types";
import { loadProject } from "@/lib/project-loader";
import { loadLatestStatus } from "@/lib/status-loader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusEditor } from "./status-editor";
import { OpenActionItems } from "./open-action-items";

interface Toggles {
  summary_cards: boolean;
  parts_material: boolean;
  hours_by_role: boolean;
  gantt_overview: boolean;
  gantt_detail: boolean;
  risks_preconditions: boolean;
  decisions_log: boolean;
  notes_freeform: boolean;
}

function readToggles(
  raw: string | null | undefined,
  hasData: Partial<Toggles>
): Toggles {
  let parsed: Record<string, boolean> = {};
  try {
    parsed = JSON.parse(raw ?? "{}") as Record<string, boolean>;
  } catch {
    /* fall through to defaults */
  }
  const isEmpty = Object.keys(parsed).length === 0;
  // Backward-compatible default: when no toggles have been saved yet,
  // show any section that has data. Once the user explicitly saves
  // toggles, those are authoritative.
  const pick = (k: keyof Toggles): boolean =>
    isEmpty ? !!hasData[k] : !!parsed[k];
  return {
    summary_cards: pick("summary_cards"),
    parts_material: pick("parts_material"),
    hours_by_role: pick("hours_by_role"),
    gantt_overview: pick("gantt_overview"),
    gantt_detail: pick("gantt_detail"),
    risks_preconditions: pick("risks_preconditions"),
    decisions_log: pick("decisions_log"),
    notes_freeform: pick("notes_freeform"),
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, latest, user, openItems, rowMeta] = await Promise.all([
    loadProject(id),
    loadLatestStatus(id),
    getCurrentUser(),
    prisma.actionItem.findMany({
      where: { projectId: id, completedAt: null },
      orderBy: [{ ownerDept: "asc" }, { createdAt: "asc" }],
    }),
    prisma.projectRow.findUnique({
      where: { id },
      select: { templateToggles: true, ownerId: true },
    }),
  ]);
  if (!project) notFound();

  const s = project.sections;
  const isAdmin = user?.role === "admin";
  const isOwner = user ? rowMeta?.ownerId === user.id : false;
  const canEdit = isAdmin || isOwner;
  const canManageToggles = isAdmin || isOwner;
  const toggles = readToggles(rowMeta?.templateToggles, {
    summary_cards: !!(s.summaryCards && s.summaryCards.length),
    parts_material: !!(s.partsMaterial && s.partsMaterial.rows.length),
    hours_by_role: !!(s.hoursByRole && s.hoursByRole.rows.length),
    gantt_overview: !!(s.ganttOverview && s.ganttOverview.bars.length),
    gantt_detail: !!(s.ganttDetail && s.ganttDetail.steps.length),
    risks_preconditions: !!(s.risks && s.risks.length),
    decisions_log: !!(s.decisions && s.decisions.length),
    notes_freeform: !!(s.notes && s.notes.length),
  });

  return (
    <article className="mx-auto w-full max-w-[960px] px-6 py-8">
      <ProjectHeader project={project} isAdmin={isAdmin} />

      {canManageToggles ? (
        <SectionToggleBar
          projectId={project.projectNumber}
          enabled={toggles as unknown as { [k: string]: boolean }}
        />
      ) : null}

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
            <OpenActionItems
              projectId={project.projectNumber}
              canEdit={canEdit}
              items={openItems.map((it) => ({
                id: it.id,
                ownerDept: it.ownerDept,
                body: it.body,
                due: it.dueDate ? it.dueDate.toISOString().slice(0, 10) : null,
              }))}
            />
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

      {toggles.summary_cards ? (
        <SectionShell title="Summary">
          <SectionEdit
            projectId={project.projectNumber}
            kind="summary_cards"
            initial={s.summaryCards ?? []}
            canEdit={canEdit}
          >
            {s.summaryCards && s.summaryCards.length > 0 ? (
              <SummaryCardsSection rows={s.summaryCards} />
            ) : (
              <EmptyState text="No summary cards yet — click Edit to add." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.parts_material ? (
        <SectionShell title="Parts & material by run">
          <SectionEdit
            projectId={project.projectNumber}
            kind="parts_material"
            initial={s.partsMaterial?.rows ?? []}
            canEdit={canEdit}
          >
            {s.partsMaterial && s.partsMaterial.rows.length > 0 ? (
              <PartsMaterialSection rows={s.partsMaterial.rows} />
            ) : (
              <EmptyState text="No runs logged yet — click Edit to add." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.hours_by_role ? (
        <SectionShell title="Hours by role">
          <SectionEdit
            projectId={project.projectNumber}
            kind="hours_by_role"
            initial={s.hoursByRole?.rows ?? []}
            canEdit={canEdit}
          >
            {s.hoursByRole && s.hoursByRole.rows.length > 0 ? (
              <HoursByRoleSection rows={s.hoursByRole.rows} />
            ) : (
              <EmptyState text="No hours logged yet — click Edit to add." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.gantt_overview ? (
        <SectionShell title="Gantt — schedule overview">
          <SectionEdit
            projectId={project.projectNumber}
            kind="gantt_overview"
            initial={
              s.ganttOverview ?? { totalWeeks: 12, bars: [], gates: [] }
            }
            canEdit={canEdit}
          >
            {s.ganttOverview && s.ganttOverview.bars.length > 0 ? (
              <GanttOverview {...s.ganttOverview} />
            ) : (
              <EmptyState text="No Gantt bars yet — click Edit to lay out the schedule." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.gantt_detail ? (
        <SectionShell title="Part requalification — sequential detail (day / hour scale)">
          <SectionEdit
            projectId={project.projectNumber}
            kind="gantt_detail"
            initial={
              s.ganttDetail ?? {
                totalDays: 3,
                workingStartHour: 8,
                workingEndHour: 17,
                steps: [],
              }
            }
            canEdit={canEdit}
          >
            {s.ganttDetail && s.ganttDetail.steps.length > 0 ? (
              <GanttDetail {...s.ganttDetail} />
            ) : (
              <EmptyState text="No hour-scale steps yet — click Edit to add." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.gantt_overview || toggles.gantt_detail ? (
        <SectionShell title="Legend">
          <Legend
            items={buildGanttLegend(s.ganttOverview?.bars, s.ganttDetail?.steps)}
          />
        </SectionShell>
      ) : null}

      {toggles.risks_preconditions ? (
        <SectionShell title="Risks & pre-conditions">
          <SectionEdit
            projectId={project.projectNumber}
            kind="risks_preconditions"
            initial={s.risks ?? []}
            canEdit={canEdit}
          >
            {s.risks && s.risks.length > 0 ? (
              <RisksSection items={s.risks} />
            ) : (
              <EmptyState text="No risks or pre-conditions yet — click Edit to add." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.decisions_log ? (
        <SectionShell title="Decisions log">
          <SectionEdit
            projectId={project.projectNumber}
            kind="decisions_log"
            initial={s.decisions ?? []}
            defaultAuthor={user?.name}
            canEdit={canEdit}
          >
            {s.decisions && s.decisions.length > 0 ? (
              <DecisionsSection items={s.decisions} />
            ) : (
              <EmptyState text="No decisions logged yet — click Edit to record one." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}

      {toggles.notes_freeform ? (
        <SectionShell title="Notes">
          <SectionEdit
            projectId={project.projectNumber}
            kind="notes_freeform"
            initial={s.notes ?? []}
            canEdit={canEdit}
          >
            {s.notes && s.notes.length > 0 ? (
              <NotesBlock blocks={s.notes} />
            ) : (
              <EmptyState text="No notes yet — click Edit to capture anything off-template." />
            )}
          </SectionEdit>
        </SectionShell>
      ) : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-3 text-sm text-[var(--muted)]">
      {text}
    </p>
  );
}

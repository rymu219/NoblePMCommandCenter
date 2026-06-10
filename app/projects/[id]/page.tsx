import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionShell } from "@/components/section-shell";
import { HealthPill } from "@/components/v2/health-pill";
import { ProjectTimeline } from "@/components/v2/timeline";
import { NarrativeCard } from "@/components/v2/narrative-card";
import { BudgetStrip } from "@/components/v2/budget-strip";
import { RisksList } from "@/components/v2/risks-list";
import { DecisionsList } from "@/components/v2/decisions-list";
import { RunsTable } from "@/components/v2/runs-table";
import { NotesCard } from "@/components/v2/notes-card";
import { AddFollowUp } from "@/components/v2/add-follow-up";
import { OpenActionItems } from "./open-action-items";
import { ProjectMilestones } from "./project-milestones";
import { ProjectQuality } from "@/components/quality/project-quality";
import { DevChecklistBlock } from "./dev-checklist";
import { loadProjectV2 } from "@/lib/project-v2-loader";
import { loadProjectMilestones } from "@/lib/board-loader";
import { loadProjectQuality } from "@/lib/quality-loader";
import { loadDevChecklist } from "@/lib/dev-checklist-loader";
import { loadIssueSummary } from "@/lib/issues-loader";
import { ISSUE_STATUSES } from "@/lib/issues";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/*
 * v2 unified project page — the PM's single editing surface (see
 * docs/v2-plan.md). Everything edits in place: health pill, narrative
 * composer, budget figures, risks/decisions/runs rows, notes. The
 * timeline is a pure projection of Phase + Milestone rows, so editing
 * the milestone list IS editing the chart. No section toggles, no
 * modals, no JSON blobs.
 */

const STATUS_DISPLAY: Record<string, string> = {
  pipeline: "Pipeline",
  not_started: "Not started",
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  archived: "Archived",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, user, milestones, quality, devChecklist, issueSummary, openItems] =
    await Promise.all([
      loadProjectV2(id),
      getCurrentUser(),
      loadProjectMilestones(id),
      loadProjectQuality(id),
      loadDevChecklist(id),
      loadIssueSummary(id),
      prisma.actionItem.findMany({
        where: { projectId: id, completedAt: null },
        orderBy: [{ ownerDept: "asc" }, { createdAt: "asc" }],
      }),
    ]);
  if (!project) notFound();

  const isAdmin = user?.role === "admin";
  const isOwner = user ? project.ownerId === user.id : false;
  const canEdit = isAdmin || isOwner;
  const todayIso = new Date().toISOString().slice(0, 10);
  const hasTimeline =
    project.phases.length > 0 ||
    project.timelineMilestones.some((m) => m.targetIso || m.actualIso);

  return (
    <article className="mx-auto w-full max-w-[1080px] px-6 py-8">
      {/* header */}
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
          <Link
            href={`/programs/${project.programPrefix}`}
            className="no-print rounded bg-noble-stone/40 px-2 py-0.5 font-mono tracking-wider text-noble-black hover:bg-noble-stone/70"
          >
            {project.programPrefix}- · {project.programName ?? "Program"}
          </Link>
          <span className="font-mono tracking-wider text-noble-black">{project.id}</span>
          <span>·</span>
          <span>{STATUS_DISPLAY[project.status] ?? project.status}</span>
          <span>·</span>
          <span>Owner: {project.ownerName ?? "—"}</span>
          <span>·</span>
          <span>{Math.round(project.hoursLogged).toLocaleString()} h logged</span>
          <span>·</span>
          <span>Last updated {project.lastUpdatedIso}</span>
          <span className="no-print ml-auto flex gap-2">
            <Link
              href={`/projects/${project.id}/dashboard`}
              className="rounded-md border border-[var(--border)] px-2 py-0.5 text-noble-black/70 hover:bg-noble-stone/40"
            >
              Dashboard →
            </Link>
            {isAdmin ? (
              <Link
                href={`/admin/projects/${project.id}`}
                className="rounded-md border border-[var(--border)] px-2 py-0.5 text-noble-black/70 hover:bg-noble-stone/40"
              >
                Edit project
              </Link>
            ) : null}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-medium leading-tight text-noble-black">
            {project.name}
          </h1>
          <HealthPill projectId={project.id} health={project.health} canEdit={canEdit} />
        </div>
        {project.subtitle ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{project.subtitle}</p>
        ) : null}
      </header>

      {/* status + follow-ups */}
      <SectionShell title="Status">
        <NarrativeCard
          projectId={project.id}
          health={project.health}
          latest={project.latestUpdate}
          canEdit={canEdit}
        />
        <div className="rounded-b-lg px-1">
          <OpenActionItems
            projectId={project.id}
            canEdit={canEdit}
            items={openItems.map((it) => ({
              id: it.id,
              ownerDept: it.ownerDept,
              body: it.body,
              due: it.dueDate ? it.dueDate.toISOString().slice(0, 10) : null,
            }))}
          />
          {canEdit ? <AddFollowUp projectId={project.id} /> : null}
        </div>
      </SectionShell>

      {/* timeline */}
      {hasTimeline ? (
        <SectionShell title="Timeline">
          <ProjectTimeline
            phases={project.phases}
            milestones={project.timelineMilestones}
            todayIso={todayIso}
          />
        </SectionShell>
      ) : null}

      {/* milestones */}
      {milestones.length > 0 || canEdit ? (
        <SectionShell title="Milestones">
          <ProjectMilestones
            projectId={project.id}
            milestones={milestones}
            canEdit={canEdit}
            isAdmin={isAdmin}
          />
        </SectionShell>
      ) : null}

      {/* budget */}
      {project.budget.total != null ||
      project.budget.spent != null ||
      project.budget.forecast != null ||
      canEdit ? (
        <SectionShell title="Budget">
          <BudgetStrip projectId={project.id} budget={project.budget} canEdit={canEdit} />
        </SectionShell>
      ) : null}

      {/* risks + decisions, side by side on wide screens */}
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        <SectionShell title="Risks & pre-conditions">
          <RisksList projectId={project.id} risks={project.risks} canEdit={canEdit} />
        </SectionShell>
        <SectionShell title="Decisions log">
          <DecisionsList
            projectId={project.id}
            decisions={project.decisions}
            canEdit={canEdit}
            defaultAuthor={user?.name}
          />
        </SectionShell>
      </div>

      {/* production runs */}
      {project.runs.length > 0 || canEdit ? (
        <SectionShell title="Parts & material by run">
          <RunsTable projectId={project.id} runs={project.runs} canEdit={canEdit} />
        </SectionShell>
      ) : null}

      {/* manufacturing development */}
      {!devChecklist.empty || canEdit ? (
        <SectionShell title="Manufacturing Development">
          <DevChecklistBlock
            projectId={project.id}
            checklist={devChecklist}
            canEdit={canEdit}
          />
        </SectionShell>
      ) : null}

      {/* quality */}
      {quality.active.length > 0 || quality.completed.length > 0 ? (
        <SectionShell title="Quality">
          <ProjectQuality active={quality.active} completed={quality.completed} />
        </SectionShell>
      ) : null}

      {/* issues */}
      {issueSummary.total > 0 || canEdit ? (
        <SectionShell title="Issue Tracker">
          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-noble-black">
                {issueSummary.total} issues
              </span>
              {ISSUE_STATUSES.map((s) => (
                <span
                  key={s.value}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.badge}`}
                >
                  {issueSummary.byStatus[s.value] ?? 0} {s.label}
                </span>
              ))}
              <Link
                href={`/projects/${project.id}/issues`}
                className="no-print ml-auto rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40"
              >
                Open issue tracker →
              </Link>
            </div>
          </div>
        </SectionShell>
      ) : null}

      {/* notes */}
      {project.notes || canEdit ? (
        <SectionShell title="Notes">
          <NotesCard projectId={project.id} notes={project.notes} canEdit={canEdit} />
        </SectionShell>
      ) : null}
    </article>
  );
}

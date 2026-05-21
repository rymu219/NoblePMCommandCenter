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
import { loadProject } from "@/lib/project-loader";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) notFound();

  const s = project.sections;

  return (
    <article className="mx-auto w-full max-w-[960px] px-6 py-8">
      <ProjectHeader project={project} />

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

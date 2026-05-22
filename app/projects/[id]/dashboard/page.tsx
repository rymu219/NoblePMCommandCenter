import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DASH, type TrackColor } from "@/components/dashboard/colors";
import { DashboardHero } from "@/components/dashboard/hero";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { ProgramTimeline } from "@/components/dashboard/program-timeline";
import { BudgetDetail } from "@/components/dashboard/budget-detail";
import {
  DashSectionLabel,
  DashboardFooter,
  TriggerMilestoneStrip,
} from "@/components/dashboard/footer-strip";
import { PhasesEditor } from "@/components/dashboard/phases-editor";
import { BudgetTracksEditor } from "@/components/dashboard/budget-tracks-editor";
import { MetaEditor } from "@/components/dashboard/meta-editor";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtUpdated(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, phases, tracks, user] = await Promise.all([
    prisma.projectRow.findUnique({
      where: { id },
      include: { program: true, owner: true },
    }),
    prisma.phase.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    }),
    prisma.budgetTrack.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    }),
    getCurrentUser(),
  ]);
  if (!project) notFound();

  const isAdmin = user?.role === "admin";
  const isOwner = user ? project.ownerId === user.id : false;
  const canEdit = isAdmin || isOwner;

  const health =
    (project.dashboardHealth as "on_schedule" | "at_risk" | "off_track" | null) ??
    "on_schedule";

  const budgetTotal = project.budgetTotal ?? 0;
  const committedTotal = project.committedTotal ?? 0;
  const forecastTotal = project.forecastTotal ?? 0;
  const headroom = budgetTotal - forecastTotal;

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const phaseRows = phases.map((p) => ({
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    color: (p.color as TrackColor) ?? "slate",
    isCurrent: p.isCurrent,
  }));

  const trackRows = tracks.map((t) => ({
    name: t.name,
    amount: t.amount,
    color: (t.color as TrackColor) ?? "slate",
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: DASH.bg, color: DASH.text }}
    >
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <Link
          href={`/projects/${id}`}
          className="no-print mb-4 inline-block text-[11px] tracking-[0.18em]"
          style={{ color: DASH.muted }}
        >
          ← BACK TO PROJECT
        </Link>

        <DashboardHero
          projectNumber={project.id}
          programPrefix={project.programPrefix}
          projectName={project.name}
          customerName={project.program?.customer ?? null}
          updatedLabel={fmtUpdated(project.lastUpdatedAt)}
          health={health}
        />

        <div className="mt-8">
          <MetricCards
            cards={[
              {
                label: "Budget",
                value: fmtMoney(budgetTotal),
                subline: "Approved",
                accent: "slate",
              },
              {
                label: "Committed",
                value: fmtMoney(committedTotal),
                subline: "POs placed",
                accent: "yellow",
              },
              {
                label: "Forecast",
                value: fmtMoney(forecastTotal),
                subline: "Estimate at completion",
                accent: "red",
              },
              {
                label: "Headroom",
                value: (headroom >= 0 ? "+" : "−") + fmtMoney(Math.abs(headroom)),
                subline: project.headroomNote ?? (headroom >= 0 ? "Under budget" : "Over budget"),
                accent: "headroom",
              },
            ]}
          />
        </div>

        <DashSectionLabel>PROGRAM TIMELINE</DashSectionLabel>
        <ProgramTimeline phases={phaseRows} today={todayUtc} />
        {canEdit ? (
          <div className="no-print mt-2 flex justify-end">
            <PhasesEditor projectId={id} initial={phaseRows} />
          </div>
        ) : null}

        <DashSectionLabel
          extra={
            <span>
              <span className="mx-2" style={{ color: DASH.muted }}>•</span>
              {fmtMoney(budgetTotal)} APPROVED
            </span>
          }
        >
          BUDGET DETAIL
        </DashSectionLabel>
        <BudgetDetail
          tracks={trackRows}
          budgetTotal={budgetTotal}
          forecastTotal={forecastTotal}
          headroom={Math.max(headroom, 0)}
        />
        {canEdit ? (
          <div className="no-print mt-2 flex justify-end gap-2">
            <BudgetTracksEditor projectId={id} initial={trackRows} />
            <MetaEditor
              projectId={id}
              initial={{
                budgetTotal: project.budgetTotal,
                committedTotal: project.committedTotal,
                forecastTotal: project.forecastTotal,
                headroomNote: project.headroomNote,
                nextTrigger: project.nextTrigger,
                keyMilestone: project.keyMilestone,
                dashboardHealth: project.dashboardHealth,
              }}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <TriggerMilestoneStrip
            nextTrigger={project.nextTrigger}
            keyMilestone={project.keyMilestone}
          />
        </div>

        <DashboardFooter
          programPrefix={project.programPrefix}
          customer={project.program?.customer ?? null}
          dateLabel={fmtFullDate(todayUtc)}
        />
      </div>
    </div>
  );
}

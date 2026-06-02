import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadBoard } from "@/lib/board-loader";
import { loadQualityBoard } from "@/lib/quality-loader";
import { PageHero } from "@/components/page-hero";
import { StatChip } from "@/components/stat-chip";
import { Swimlane } from "./swimlane";
import { QualityBoard } from "./quality-board";

/*
 * Command Center board. Swimlanes are one-per-engineer; visibility is enforced
 * in loadBoard (engineer → own lane only; admin/viewer → all + Unassigned).
 */
export default async function BoardPage() {
  const user = await requireUser();
  const [board, quality] = await Promise.all([
    loadBoard(user),
    loadQualityBoard(),
  ]);
  const canEditQuality = user.role === "admin";

  // Hero counts derived from the loaded lanes (no extra queries).
  let openMilestones = 0;
  let overdueMilestones = 0;
  for (const lane of board.swimlanes) {
    for (const section of lane.sections) {
      if (section.key === "completed") continue;
      openMilestones += section.milestones.length;
      if (section.key === "overdue" || section.key === "undated") {
        overdueMilestones += section.milestones.length;
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <PageHero
        eyebrow="Command Center"
        title="The Board"
        subtitle={
          board.canEditMilestones
            ? "Every engineer's milestones and subtasks. You own milestone dates; engineers own their subtasks."
            : "Your milestones and subtasks. Check off work as you go; milestone dates are set by your PM."
        }
        actions={
          <Link
            href="/board/report"
            className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-noble-black no-print hover:bg-noble-stone/40"
          >
            Slippage report →
          </Link>
        }
        stats={
          <>
            <StatChip
              value={board.swimlanes.length}
              label="Lanes"
              accent="var(--color-noble-navy)"
            />
            <StatChip
              value={openMilestones}
              label="Open milestones"
              accent="var(--color-role-process)"
            />
            <StatChip
              value={overdueMilestones}
              label="Overdue / undated"
              accent="var(--color-noble-red)"
            />
          </>
        }
      />

      {board.swimlanes.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          No swimlanes to show yet. Once projects are assigned and an admin adds
          milestones, they&rsquo;ll appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {board.swimlanes.map((lane) => (
            <Swimlane
              key={lane.ownerId}
              lane={lane}
              canEditMilestones={board.canEditMilestones}
              canEditSubtasks={board.canEditSubtasks}
            />
          ))}
        </div>
      )}

      {/* Quality department awareness — global, at the bottom of The Board. */}
      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-noble-black">Quality</h2>
          <p className="text-sm text-[var(--muted)]">
            What the quality department is inspecting — for awareness. Active work
            up top; completed inspections (with how they landed vs. target)
            below.
          </p>
        </div>
        <QualityBoard
          active={quality.active}
          completed={quality.completed}
          canEdit={canEditQuality}
        />
      </section>
    </div>
  );
}

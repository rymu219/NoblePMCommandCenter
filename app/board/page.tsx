import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadBoard } from "@/lib/board-loader";
import { Swimlane } from "./swimlane";

/*
 * Command Center board. Swimlanes are one-per-engineer; visibility is enforced
 * in loadBoard (engineer → own lane only; admin/viewer → all + Unassigned).
 */
export default async function BoardPage() {
  const user = await requireUser();
  const board = await loadBoard(user);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {board.canEditMilestones
              ? "Every engineer's milestones and subtasks. You own milestone dates; engineers own their subtasks."
              : "Your milestones and subtasks. Check off work as you go; milestone dates are set by your PM."}
          </p>
        </div>
        <Link
          href="/board/report"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-noble-black hover:bg-noble-stone/40"
        >
          Slippage report →
        </Link>
      </div>

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
    </div>
  );
}

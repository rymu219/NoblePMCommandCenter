"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleSubtaskAction } from "@/app/board/board-actions";

/* Open subtasks across projects, checkbox-completable in place. */

export interface MyTask {
  id: string;
  title: string;
  dueIso: string | null;
  overdue: boolean;
  milestoneTitle: string;
  milestoneTargetIso: string | null;
}

export interface MyTaskGroup {
  projectId: string;
  projectName: string;
  tasks: MyTask[];
}

export function MyTasks({ groups }: { groups: MyTaskGroup[] }) {
  const [pending, startTransition] = useTransition();

  if (groups.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No open tasks — anything new lands here from the{" "}
        <Link href="/board" className="underline">
          board
        </Link>
        .
      </p>
    );
  }

  function complete(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("done", "true");
      await toggleSubtaskAction(fd);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.projectId} className="rounded-lg border border-[var(--border)] bg-white p-3">
          <Link
            href={`/projects/${g.projectId}`}
            className="text-xs font-semibold text-noble-black hover:underline"
          >
            <span className="font-mono text-[var(--muted)]">{g.projectId}</span> {g.projectName}
          </Link>
          <ul className="mt-2 space-y-1.5">
            {g.tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => complete(t.id)}
                  disabled={pending}
                  title="Mark done"
                  className="mt-0.5 h-3.5 w-3.5 accent-[#0F6E56]"
                />
                <span className="min-w-0 flex-1 text-sm leading-snug text-noble-black/90">
                  {t.title}
                  <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                    {t.milestoneTitle}
                    {t.milestoneTargetIso ? ` — ${t.milestoneTargetIso}` : ""}
                    {t.dueIso ? (
                      <span className={t.overdue ? "text-noble-red" : ""}>
                        {" "}
                        · due {t.dueIso}
                        {t.overdue ? " (overdue)" : ""}
                      </span>
                    ) : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

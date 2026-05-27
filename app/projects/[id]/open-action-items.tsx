"use client";

import { useTransition } from "react";
import { deptDisplay } from "@/lib/status";
import {
  toggleActionItemAction,
  deleteActionItemAction,
} from "./status-actions";

export interface OpenActionItem {
  id: string;
  ownerDept: string;
  body: string;
  due: string | null;
}

export function OpenActionItems({
  projectId,
  items,
  canEdit,
}: {
  projectId: string;
  items: OpenActionItem[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  const byDept = items.reduce<Record<string, OpenActionItem[]>>((acc, it) => {
    (acc[it.ownerDept] ??= []).push(it);
    return acc;
  }, {});

  function resolve(id: string) {
    startTransition(async () => {
      await toggleActionItemAction(id, true, projectId);
    });
  }
  function remove(id: string) {
    if (!confirm("Delete this action item? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteActionItemAction(id, projectId);
    });
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-3">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
        Open action items
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
        {Object.entries(byDept).map(([dept, list]) => (
          <div key={dept}>
            <div className="text-[11px] font-medium text-noble-black">
              {deptDisplay(dept)}
            </div>
            <ul className="mt-1 space-y-1 text-sm text-noble-black/85">
              {list.map((it) => (
                <li key={it.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-noble-red">·</span>
                  <span className="flex-1">
                    {it.body}
                    {it.due ? (
                      <span className="ml-1 text-xs text-[var(--muted)]">
                        (due {it.due})
                      </span>
                    ) : null}
                  </span>
                  {canEdit ? (
                    <span className="no-print flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => resolve(it.id)}
                        disabled={pending}
                        className="text-[11px] font-medium text-[#0F6E56] hover:underline disabled:opacity-50"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        disabled={pending}
                        className="text-[11px] font-medium text-noble-red hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

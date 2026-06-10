"use client";

import { useState, useTransition } from "react";
import { SaveError } from "@/components/save-error";
import { saveBudgetAction } from "@/app/projects/[id]/v2-actions";

/*
 * Budget at a glance: one stacked burn bar (spent → committed vs budget,
 * forecast tick) + the four figures. Click any figure to edit it in place;
 * Enter or blur saves, Esc cancels.
 */

type Field = "total" | "spent" | "committed" | "forecast";

const FIELD_META: Array<{ key: Field; label: string; form: string }> = [
  { key: "total", label: "Budget", form: "budgetTotal" },
  { key: "spent", label: "Spent", form: "spentTotal" },
  { key: "committed", label: "Committed", form: "committedTotal" },
  { key: "forecast", label: "Forecast", form: "forecastTotal" },
];

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function BudgetStrip({
  projectId,
  budget,
  canEdit,
}: {
  projectId: string;
  budget: { total: number | null; spent: number | null; committed: number | null; forecast: number | null };
  canEdit: boolean;
}) {
  const [values, setValues] = useState(budget);
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { total, spent, committed, forecast } = values;
  const denom = Math.max(total ?? 0, forecast ?? 0, (spent ?? 0) + (committed ?? 0), 1);
  const spentPct = ((spent ?? 0) / denom) * 100;
  const committedPct = ((committed ?? 0) / denom) * 100;
  const budgetPct = total != null ? (total / denom) * 100 : null;
  const forecastPct = forecast != null ? (forecast / denom) * 100 : null;
  const headroom = total != null && forecast != null ? total - forecast : null;
  const overBudget = headroom != null && headroom < 0;

  function beginEdit(f: Field) {
    if (!canEdit) return;
    setEditing(f);
    setDraft(values[f] != null ? String(values[f]) : "");
    setError(null);
  }

  function commit(f: Field) {
    const raw = draft.replace(/[$,\s]/g, "");
    const parsed = raw === "" ? null : Number(raw);
    if (parsed != null && !Number.isFinite(parsed)) {
      setError(`"${draft}" is not a number.`);
      return;
    }
    const next = { ...values, [f]: parsed };
    setEditing(null);
    if (next[f] === values[f]) return;
    setValues(next);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("projectId", projectId);
        for (const m of FIELD_META) fd.set(m.form, next[m.key] != null ? String(next[m.key]) : "");
        await saveBudgetAction(fd);
        setError(null);
      } catch (e) {
        setValues(values); // roll back the optimistic value
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  const hasAny = total != null || spent != null || committed != null || forecast != null;
  if (!hasAny && !canEdit) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {FIELD_META.map((m) => (
          <div key={m.key}>
            <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/55">
              {m.label}
            </div>
            {editing === m.key ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(m.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit(m.key);
                  if (e.key === "Escape") setEditing(null);
                }}
                inputMode="decimal"
                className="mt-0.5 w-full rounded border border-noble-black/30 px-1.5 py-0.5 font-mono text-sm text-noble-black focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => beginEdit(m.key)}
                disabled={!canEdit || pending}
                className={`mt-0.5 block font-mono text-base text-noble-black ${
                  canEdit ? "rounded px-1 -mx-1 hover:bg-noble-stone/40" : "cursor-default"
                }`}
                title={canEdit ? "Click to edit" : undefined}
              >
                {fmtMoney(values[m.key])}
              </button>
            )}
          </div>
        ))}
      </div>

      {hasAny ? (
        <div className="mt-4">
          <div className="relative h-4 overflow-hidden rounded bg-[var(--surface)]">
            <div
              className="absolute inset-y-0 left-0 bg-noble-black"
              style={{ width: `${Math.min(spentPct, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 bg-noble-black/35"
              style={{ left: `${Math.min(spentPct, 100)}%`, width: `${Math.min(committedPct, 100 - Math.min(spentPct, 100))}%` }}
            />
            {forecastPct != null ? (
              <div
                className="absolute inset-y-0 w-0.5 bg-[#BA7517]"
                style={{ left: `calc(${Math.min(forecastPct, 99.7)}% - 1px)` }}
                title={`Forecast ${fmtMoney(forecast)}`}
              />
            ) : null}
            {budgetPct != null ? (
              <div
                className="absolute inset-y-0 w-0.5 bg-noble-red"
                style={{ left: `calc(${Math.min(budgetPct, 99.7)}% - 1px)` }}
                title={`Budget ${fmtMoney(total)}`}
              />
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-noble-black" /> Spent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-noble-black/35" /> Committed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-0.5 bg-[#BA7517]" /> Forecast
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-0.5 bg-noble-red" /> Budget
            </span>
            {headroom != null ? (
              <span className={`ml-auto font-medium ${overBudget ? "text-noble-red" : "text-[#0F6E56]"}`}>
                {overBudget ? `${fmtMoney(-headroom)} over forecast vs budget` : `${fmtMoney(headroom)} headroom`}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <SaveError message={error} />
    </div>
  );
}

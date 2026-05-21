import type { SummaryCard } from "@/lib/types";

export function SummaryCardsSection({ rows }: { rows: SummaryCard[][] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
        >
          {row.map((card, j) => (
            <div
              key={j}
              className="rounded-lg bg-[var(--surface)] px-4 py-3.5"
            >
              <div className="text-xs text-[var(--muted)]">{card.label}</div>
              <div className="mt-1 text-[22px] font-medium leading-tight text-noble-black">
                {card.value}
              </div>
              {card.unit ? (
                <div className="mt-0.5 text-xs text-[var(--muted)]">{card.unit}</div>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

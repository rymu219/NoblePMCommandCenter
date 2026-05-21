import type { RiskItem } from "@/lib/types";

export function RisksSection({ items }: { items: RiskItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No risks or pre-conditions logged yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((r, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-white px-3 py-2"
        >
          <span
            className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
              r.resolved ? "bg-role-process" : "bg-noble-red"
            }`}
          />
          <div className="flex-1">
            <div className={r.resolved ? "line-through text-[var(--muted)]" : ""}>
              {r.text}
            </div>
            {r.owner ? (
              <div className="text-xs text-[var(--muted)]">Owner: {r.owner}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

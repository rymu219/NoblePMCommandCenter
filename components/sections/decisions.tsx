import type { DecisionItem } from "@/lib/types";

export function DecisionsSection({ items }: { items: DecisionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No decisions logged yet. Decisions captured from meetings will land
        here after the approval review.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-strong)] text-left text-xs font-medium text-[var(--muted)]">
          <th className="px-2 py-2">Date</th>
          <th className="px-2 py-2">Decision</th>
          <th className="px-2 py-2">Source</th>
          <th className="px-2 py-2">Author</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d, i) => (
          <tr key={i} className="border-b border-[var(--border)] align-top">
            <td className="whitespace-nowrap px-2 py-2 text-[var(--muted)]">
              {d.date}
            </td>
            <td className="px-2 py-2">{d.decision}</td>
            <td className="px-2 py-2 text-[var(--muted)]">{d.source}</td>
            <td className="px-2 py-2 text-[var(--muted)]">{d.author}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

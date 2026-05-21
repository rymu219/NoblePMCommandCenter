import type { PartsRunRow } from "@/lib/types";

export function PartsMaterialSection({ rows }: { rows: PartsRunRow[] }) {
  const totals = rows.reduce(
    (acc, r) => ({
      parts: acc.parts + r.parts,
      lbs: acc.lbs + r.lbs,
      kg: acc.kg + r.kg,
    }),
    { parts: 0, lbs: 0, kg: 0 }
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-strong)] text-left text-xs font-medium text-[var(--muted)]">
          <th className="px-2 py-2">Run / phase</th>
          <th className="px-2 py-2">Purpose</th>
          <th className="px-2 py-2 text-right">Parts</th>
          <th className="px-2 py-2 text-right">Lbs</th>
          <th className="px-2 py-2 text-right">Kg</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-[var(--border)] align-top">
            <td className="px-2 py-2">{r.name}</td>
            <td className="px-2 py-2">{r.purpose}</td>
            <td className="px-2 py-2 text-right">{r.parts}</td>
            <td className="px-2 py-2 text-right">{r.lbs.toFixed(1)}</td>
            <td className="px-2 py-2 text-right">{r.kg.toFixed(1)}</td>
          </tr>
        ))}
        <tr className="border-t border-[var(--border-strong)] font-medium">
          <td colSpan={2} className="px-2 py-2">
            Total
          </td>
          <td className="px-2 py-2 text-right">{totals.parts}</td>
          <td className="px-2 py-2 text-right">{totals.lbs.toFixed(1)}</td>
          <td className="px-2 py-2 text-right">{totals.kg.toFixed(1)}</td>
        </tr>
      </tbody>
    </table>
  );
}

import type { HoursRow, Role } from "@/lib/types";
import { ROLE_META } from "@/lib/types";

export function HoursByRoleSection({ rows }: { rows: HoursRow[] }) {
  const roleOrder: Role[] = ["engineering", "process", "automation", "quality"];
  const groups = roleOrder.map((role) => ({
    role,
    items: rows.filter((r) => r.role === role),
    subtotal: rows
      .filter((r) => r.role === role)
      .reduce((s, r) => s + r.hours, 0),
  }));

  const grandTotal = rows.reduce((s, r) => s + r.hours, 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-strong)] text-left text-xs font-medium text-[var(--muted)]">
          <th className="px-2 py-2">Role</th>
          <th className="px-2 py-2">Task</th>
          <th className="px-2 py-2 text-right">Hours</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <>
            {g.items.map((r, i) => (
              <tr
                key={`${g.role}-${i}`}
                className="border-b border-[var(--border)]"
              >
                <td className="px-2 py-2">
                  <span
                    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[2px] align-middle"
                    style={{ background: ROLE_META[g.role].stroke }}
                  />
                  {r.who}
                </td>
                <td className="px-2 py-2">{r.task}</td>
                <td className="px-2 py-2 text-right">{r.hours}</td>
              </tr>
            ))}
            {g.items.length > 0 ? (
              <tr
                key={`${g.role}-sub`}
                className="border-b border-[var(--border)] italic text-[var(--muted)]"
              >
                <td colSpan={2} className="px-2 py-2">
                  {ROLE_META[g.role].label} subtotal
                </td>
                <td className="px-2 py-2 text-right">{g.subtotal}</td>
              </tr>
            ) : null}
          </>
        ))}
        <tr className="border-t border-[var(--border-strong)] font-medium">
          <td colSpan={2} className="px-2 py-2">
            Total person-hours
          </td>
          <td className="px-2 py-2 text-right">{grandTotal}</td>
        </tr>
      </tbody>
    </table>
  );
}

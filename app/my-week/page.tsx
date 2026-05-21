import { SAMPLE_ENGINEERS, SAMPLE_PROJECT_INDEX } from "@/lib/sample-data";

/*
 * "My Week" — daily grid mirroring the time-tracking spreadsheet the user
 * shared. Read-only in v0; v1 makes it editable with optimistic save.
 *
 * Sample data hard-codes Kenneth's Jan 5, 2026 week from the screenshot:
 *   647-004 Bulkhead Housing: T 2, W 8, Th 9, F 6 = 25
 *   663-002 Gordon Hold Down Clip: M 1, T 2 = 3
 *   692-001 Rumble Roller — Handle Grip: M 1 = 1
 *   999-999 Miscellaneous: M 2, T 4 = 6
 *   150-029 Spectra TOW 2A: M 3 = 3
 */

const SAMPLE_HOURS: Record<string, [number, number, number, number, number]> = {
  "647-004": [0, 2, 8, 9, 6],
  "663-002": [1, 2, 0, 0, 0],
  "692-001": [1, 0, 0, 0, 0],
  "999-999": [2, 4, 0, 0, 0],
  "150-029": [3, 0, 0, 0, 0],
  "112-066": [4, 0, 0, 0, 2],
};

const SAMPLE_NOTES: Record<string, string> = {};

const DAYS = ["Mon Jan 5", "Tue Jan 6", "Wed Jan 7", "Thu Jan 8", "Fri Jan 9"] as const;

export default function MyWeekPage() {
  const engineer = "Kenneth";
  const rows = SAMPLE_PROJECT_INDEX.filter((p) => p.owner === engineer || p.projectNumber === "999-999" || p.projectNumber === "501-001");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            My Week
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Daily hours per project. Tab through cells; weekly totals roll up
            automatically. Replaces the per-engineer monthly spreadsheet.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Engineer</span>
          <select
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
            defaultValue={engineer}
          >
            {SAMPLE_ENGINEERS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <span className="ml-3 text-[var(--muted)]">Week of</span>
          <input
            type="date"
            defaultValue="2026-01-05"
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-noble-black text-white">
              <th className="px-3 py-2 text-left text-xs font-medium">
                Project #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium">
                Project Name
              </th>
              {DAYS.map((d) => (
                <th
                  key={d}
                  className="px-2 py-2 text-right text-xs font-medium"
                >
                  {d}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium">
                Total
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const cells = SAMPLE_HOURS[p.projectNumber] ?? [0, 0, 0, 0, 0];
              const total = cells.reduce((a, b) => a + b, 0);
              return (
                <tr
                  key={p.projectNumber}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface)]/40"
                >
                  <td className="px-3 py-1.5 font-mono text-xs tracking-wider">
                    {p.projectNumber}
                  </td>
                  <td className="px-3 py-1.5 text-sm">
                    <span className="text-noble-navy underline-offset-2 hover:underline">
                      {p.name}
                    </span>
                  </td>
                  {cells.map((v, i) => (
                    <td
                      key={i}
                      className="px-2 py-1.5 text-right font-mono text-xs tabular-nums"
                    >
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        defaultValue={v || ""}
                        className="w-16 rounded-md border border-transparent bg-transparent px-2 py-1 text-right focus:border-[var(--border-strong)] focus:bg-white focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="bg-[var(--surface)]/60 px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums">
                    {total}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      defaultValue={SAMPLE_NOTES[p.projectNumber] ?? ""}
                      placeholder="…"
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs focus:border-[var(--border-strong)] focus:bg-white focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-noble-black/40 bg-noble-stone/30 text-sm font-medium">
              <td className="px-3 py-2" colSpan={2}>
                Day total
              </td>
              {DAYS.map((_, i) => {
                const sum = rows.reduce(
                  (s, p) => s + (SAMPLE_HOURS[p.projectNumber]?.[i] ?? 0),
                  0
                );
                return (
                  <td
                    key={i}
                    className="px-2 py-2 text-right font-mono tabular-nums"
                  >
                    {sum}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {rows.reduce(
                  (s, p) =>
                    s + (SAMPLE_HOURS[p.projectNumber]?.reduce((a, b) => a + b, 0) ?? 0),
                  0
                )}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Tip: if a project you worked on isn&rsquo;t listed, ask the admin to
        assign it to you. Use <span className="font-mono">999-999</span> for
        non-project work and explain it in the Notes column.
      </p>
    </div>
  );
}

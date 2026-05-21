import Link from "next/link";
import { prisma } from "@/lib/prisma";

const KIND_LABEL: Record<string, string> = {
  daily_tooling: "Daily Tooling Report",
  executive_status: "Executive Status Report",
};

export default async function ReportsIndex() {
  const reports = await prisma.report.findMany({
    orderBy: [{ reportDate: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-noble-black">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Snapshots of Daily Tooling Reports and Executive Status Reports.
            Each report is a frozen copy of what was rendered when published.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40"
        >
          Today&rsquo;s draft →
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          No reports published yet. From the{" "}
          <Link href="/" className="underline">
            dashboard
          </Link>{" "}
          (Admin), click <span className="font-medium">Publish daily report</span>{" "}
          to snapshot today.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
          {reports.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <Link
                href={`/reports/${r.id}`}
                className="flex items-baseline justify-between hover:underline"
              >
                <div>
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-red">
                    {KIND_LABEL[r.kind] ?? r.kind}
                    {r.programPrefix ? ` · ${r.programPrefix}-` : ""}
                  </div>
                  <div className="text-base font-medium text-noble-black">
                    {r.reportDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  Published {r.publishedAt.toISOString().slice(0, 10)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/*
 * Tools — a home for printable meeting sheets and other day-to-day
 * handouts. Each card links to a sheet laid out for printing (the chrome
 * is hidden behind `no-print`).
 */

const SHEETS: Array<{ href: string; title: string; blurb: string }> = [
  {
    href: "/tools/production-meeting",
    title: "Production Meeting",
    blurb:
      "Daily production huddle note sheet — date and a line per IMM (10–13, B1–B9, C1–C6).",
  },
  {
    href: "/tools/engineering-meeting",
    title: "Engineering Meeting",
    blurb:
      "Daily engineering huddle sheet — each engineer with the projects they're assigned to, plus spots for Aimee and Scott.",
  },
];

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-medium text-noble-black">Tools</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Printable meeting sheets and handouts. Open one, then print it to
          write notes during the meeting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHEETS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card group rounded-lg border border-[var(--border)] bg-white p-5 transition-colors hover:border-noble-black/30"
          >
            <h2 className="font-serif text-lg font-medium text-noble-black group-hover:underline">
              {s.title}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">{s.blurb}</p>
            <span className="mt-3 inline-block text-xs font-medium text-noble-red">
              Open sheet →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

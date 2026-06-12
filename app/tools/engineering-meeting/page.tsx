import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "../print-button";

/*
 * Engineering Meeting — printable daily note sheet. One block per engineer
 * listing the projects (number + name) they're assigned to, pulled live
 * from project assignments, plus dedicated write-in spots for Aimee and
 * Scott. Print and annotate by hand during the huddle.
 */

// Engineers to surface, in meeting order. Matched against the User.name
// field by first name (case-insensitive) so the production data's full
// names ("Kent Smith") still resolve.
const ENGINEER_NAMES = [
  "Kent",
  "Dont",
  "Victor",
  "Billy",
  "Kris",
  "Kenneth",
  "Kelsey",
];

// People who get a labelled write-in box rather than a project pull.
const SPECIAL_NAMES = ["Aimee", "Scott"];

interface EngineerBlock {
  label: string;
  matched: boolean;
  projects: { id: string; name: string }[];
}

async function loadEngineerBlocks(): Promise<EngineerBlock[]> {
  // Pull every assignment with its user + project once, then bucket by the
  // requested first names. Cheaper and simpler than a query per engineer.
  const users = await prisma.user.findMany({
    where: { active: true },
    select: {
      name: true,
      assignments: {
        select: {
          project: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });

  return ENGINEER_NAMES.map((first) => {
    const needle = first.toLowerCase();
    const user = users.find((u) => {
      const firstToken = u.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      return firstToken === needle || firstToken.startsWith(needle);
    });

    const projects = (user?.assignments ?? [])
      .map((a) => a.project)
      .filter((p) => p.status !== "archived")
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => ({ id: p.id, name: p.name }));

    return {
      label: user?.name ?? first,
      matched: Boolean(user),
      projects,
    };
  });
}

export default async function EngineeringMeetingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const blocks = await loadEngineerBlocks();

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-8 print:py-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/tools" className="text-sm text-noble-black/70 hover:underline">
          ← Tools
        </Link>
        <PrintButton />
      </div>

      <header className="mb-6 flex items-end justify-between border-b-2 border-noble-black pb-3">
        <h1 className="font-serif text-3xl font-semibold text-noble-black">
          Engineering Meeting
        </h1>
        <div className="flex items-end gap-2">
          <span className="text-sm font-medium text-noble-black/70">Date</span>
          <span className="inline-block w-48 border-b border-noble-black/60">
            &nbsp;
          </span>
        </div>
      </header>

      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {blocks.map((b) => (
          <section
            key={b.label}
            className="break-inside-avoid rounded-lg border border-[var(--border)] p-3"
          >
            <h2 className="mb-2 border-b border-noble-black/30 pb-1 font-serif text-lg font-semibold text-noble-black">
              {b.label}
            </h2>
            {b.projects.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {b.projects.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-2 text-sm">
                    <span className="font-mono font-semibold text-noble-black">
                      {p.id}
                    </span>
                    <span className="text-noble-black/80">{p.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                {b.matched
                  ? "No active projects assigned."
                  : "No matching engineer found."}
              </p>
            )}
            {/* A few blank lines for write-in notes. */}
            <div className="mt-3 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border-b border-noble-black/20">
                  &nbsp;
                </div>
              ))}
            </div>
          </section>
        ))}

        {SPECIAL_NAMES.map((name) => (
          <section
            key={name}
            className="break-inside-avoid rounded-lg border-2 border-noble-black/50 p-3"
          >
            <h2 className="mb-2 border-b border-noble-black/30 pb-1 font-serif text-lg font-semibold text-noble-black">
              {name}
            </h2>
            <div className="mt-1 flex flex-col gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-noble-black/20">
                  &nbsp;
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectAction } from "../actions";


export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const { error } = await searchParams;
  const engineers = await prisma.user.findMany({
    where: { role: { in: ["engineer", "admin"] }, active: true },
    orderBy: { name: "asc" },
  });
  const programs = await prisma.program.findMany({ orderBy: { prefix: "asc" } });

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-8">
      <BackLink href="/admin" label="Admin" />
      <h1 className="mt-2 font-serif text-3xl font-medium text-noble-black">
        New project
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Project # is the primary key — pick any unused <span className="font-mono">XXX-XXX</span>
        . If the 3-digit prefix is new, it creates a new Program row. For a
        Pipeline item you can leave it blank and a placeholder is assigned.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-noble-red/10 px-3 py-2 text-sm text-noble-red">
          {error}
        </p>
      ) : null}

      <form action={createProjectAction} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block md:col-span-1">
            <Lbl>Project #</Lbl>
            <input
              name="projectId"
              pattern="[0-9]{3}-[0-9]{3}"
              placeholder="647-008"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm tracking-wider focus:border-noble-red/40 focus:outline-none"
            />
            <Hint>
              Format <span className="font-mono">XXX-XXX</span> (digits). Leave
              blank for a <span className="font-medium">Pipeline</span> item —
              we&rsquo;ll assign a placeholder.
            </Hint>
          </label>
          <label className="block md:col-span-2">
            <Lbl>Project name</Lbl>
            <input
              name="name"
              required
              placeholder="Bulkhead Automation"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <Lbl>Subtitle / one-line context</Lbl>
          <input
            name="subtitle"
            placeholder="e.g., 12 weeks tool modification at Byrne · part requalification begins after mold returns"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <Lbl>Owner</Lbl>
            <select
              name="ownerId"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="">(unassigned)</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Lbl>Status</Lbl>
            <select
              name="status"
              defaultValue="active"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="pipeline">Pipeline — scoping, not official yet</option>
              <option value="not_started">Not started</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
            <Hint>
              <span className="font-medium">Pipeline</span> is a holding pen for
              prospective work — kept out of rollups &amp; the daily report, and
              flagged in Admin until you promote it to a real project.
            </Hint>
          </label>
          <label className="block">
            <Lbl>Customer (optional)</Lbl>
            <input
              name="customer"
              placeholder="First Solar"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <Lbl>Program name (for the prefix, if creating new)</Lbl>
          <input
            name="programName"
            list="program-list"
            placeholder="First Solar"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none"
          />
          <datalist id="program-list">
            {programs.map((p) => (
              <option key={p.prefix} value={p.name ?? p.prefix}>
                {p.prefix}-
              </option>
            ))}
          </datalist>
          <Hint>If the prefix already exists, the existing program is reused.</Hint>
        </label>

        <label className="flex items-start gap-2 rounded-md border border-[var(--border)] p-3 hover:bg-[var(--surface)]/60">
          <input type="checkbox" name="seedDevChecklist" value="1" className="mt-0.5" />
          <span>
            <span className="text-sm font-medium text-noble-black">
              Seed manufacturing-development checklist
            </span>
            <span className="block text-xs text-[var(--muted)]">
              Pre-populate the standard 5-phase / 27-task molded-part development
              process. You can also apply it later from the project page.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin"
            className="rounded-md border border-[var(--border)] px-3 py-2 text-xs hover:bg-noble-stone/40"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-noble-red px-3 py-2 text-xs font-medium text-white hover:bg-noble-red/85"
          >
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
      {children}
    </span>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs text-[var(--muted)]">{children}</span>;
}

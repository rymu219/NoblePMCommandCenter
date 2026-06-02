import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectAction } from "../actions";

const SECTIONS: Array<{ value: string; label: string; help: string }> = [
  { value: "summary_cards", label: "Summary cards", help: "Top-of-page key metric cards." },
  { value: "parts_material", label: "Parts & material by run", help: "For Part Requal / production runs." },
  { value: "hours_by_role", label: "Hours by role", help: "Estimated + actuals by Engineering / Process / Automation / Quality." },
  { value: "gantt_overview", label: "Gantt — week scale", help: "The week-scale overview Gantt." },
  { value: "gantt_detail", label: "Gantt — hour scale", help: "Tightly sequenced cure/measure cycles." },
  { value: "risks_preconditions", label: "Risks & pre-conditions", help: "Owner + resolved/unresolved." },
  { value: "decisions_log", label: "Decisions log", help: "Date · decision · source · author." },
  { value: "notes_freeform", label: "Notes (free-form)", help: "Markdown catch-all." },
];

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
        . If the 3-digit prefix is new, it creates a new Program row.
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
              required
              pattern="[0-9]{3}-[0-9]{3}"
              placeholder="647-008"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm tracking-wider focus:border-noble-red/40 focus:outline-none"
            />
            <Hint>Format <span className="font-mono">XXX-XXX</span> (digits).</Hint>
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

        <fieldset className="rounded-md border border-[var(--border)] p-3">
          <legend className="px-1 text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
            Planning sections to enable
          </legend>
          <p className="mb-2 text-xs text-[var(--muted)]">
            Tick the sections this project needs. You can toggle more on later.
            The Status section is always on.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {SECTIONS.map((s) => (
              <label
                key={s.value}
                className="flex items-start gap-2 rounded-md p-1.5 hover:bg-[var(--surface)]/60"
              >
                <input type="checkbox" name="section" value={s.value} className="mt-0.5" />
                <span>
                  <span className="text-sm font-medium text-noble-black">{s.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{s.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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

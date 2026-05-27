import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const [users, projects, closes, entries] = await Promise.all([
    prisma.user.count(),
    prisma.projectRow.count(),
    prisma.periodClose.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.timeEntry.count(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        Admin
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Internal controls. Period close, rollups, user management. Most
        modules are placeholders for v2 — period close and the time rollup
        are live now.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={users} />
        <Stat label="Projects" value={projects} />
        <Stat label="Time entries" value={entries} />
        <Stat label="Closed months" value={closes.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard
          title="Time rollups"
          description="Per-engineer / per-month / per-project actuals across the team. Replaces the spreadsheet's ALL tab."
          href="/admin/time-rollups"
          cta="Open rollups"
        />
        <AdminCard
          title="Period close"
          description="Close a month to lock time entries. Engineers cannot edit closed months. Admin can reopen with an audit-logged action."
          href="/admin/period-close"
          cta="Manage period close"
        />
        <AdminCard
          title="Projects + engineer assignments"
          description="Create new projects (Project # validated as XXX-XXX) and assign engineers to control which projects appear pre-listed on each engineer's My Week."
          href="/admin/projects"
          cta="Manage projects"
        />
        <AdminCard
          title="Roster"
          description="Add people and edit their name, job title, department, role, and hourly rate. New people get the default password to change on first sign-in."
          href="/admin/users"
          cta="Manage roster"
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-medium leading-tight text-noble-black">
        {value}
      </div>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
  cta,
  disabled,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-white px-4 py-3 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="font-medium text-noble-black">{title}</div>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-3 inline-block rounded-md bg-noble-black px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-black/85"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

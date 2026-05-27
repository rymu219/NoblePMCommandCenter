import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  USER_DEPARTMENTS,
  USER_ROLES,
  userDeptDisplay,
} from "@/lib/status";
import {
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
} from "./actions";

const OK_MESSAGES: Record<string, string> = {
  created: "Person added to the roster.",
  updated: "Changes saved.",
  password: "Password reset to the default.",
};

function roleDisplay(r: string) {
  return USER_ROLES.find((x) => x.value === r)?.display ?? r;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole(["admin"]).catch(() => redirect("/"));
  const { error, ok } = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-8">
      <div className="text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:underline">
          ← Admin
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl font-medium text-noble-black">
        Roster
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add people and edit their name, job title, department, role, and hourly
        rate. New people are created with the default password
        (&ldquo;nobleplastics&rdquo;) to change after first sign-in.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-noble-red/10 px-3 py-2 text-sm text-noble-red">
          {error}
        </p>
      ) : null}
      {ok && OK_MESSAGES[ok] ? (
        <p className="mt-4 rounded-md bg-[#0F6E56]/10 px-3 py-2 text-sm text-[#0F6E56]">
          {OK_MESSAGES[ok]}
        </p>
      ) : null}

      {/* Add a person */}
      <details className="mt-6 rounded-lg border border-[var(--border)] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-noble-black">
          + Add a person to the roster
        </summary>
        <form action={createUserAction} className="border-t border-[var(--border)] p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input name="name" required placeholder="Jane Doe" className={INPUT} />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                placeholder="jane.doe@nobleplastics.local"
                className={INPUT}
              />
            </Field>
            <Field label="Job title">
              <input name="title" placeholder="Senior Process Engineer" className={INPUT} />
            </Field>
            <Field label="Hourly rate (optional)">
              <input
                name="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 95"
                className={INPUT}
              />
            </Field>
            <Field label="Department">
              <select name="department" defaultValue="engineering" className={INPUT}>
                {USER_DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.display}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role (permissions)">
              <select name="role" defaultValue="engineer" className={INPUT}>
                {USER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.display}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-noble-red px-3 py-2 text-xs font-medium text-white hover:bg-noble-red/85"
            >
              Add person
            </button>
          </div>
        </form>
      </details>

      {/* Roster */}
      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        {users.map((u, i) => (
          <details key={u.id} className={i > 0 ? "border-t border-[var(--border)]" : ""}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="font-medium text-noble-black">{u.name}</span>
              {u.title ? (
                <span className="text-sm text-noble-black/70">{u.title}</span>
              ) : null}
              <span className="text-xs text-[var(--muted)]">
                {userDeptDisplay(u.department)} · {roleDisplay(u.role)}
              </span>
              {!u.active ? (
                <span className="rounded-full bg-noble-stone/60 px-2 py-0.5 text-[10px] font-medium text-noble-black/70">
                  inactive
                </span>
              ) : null}
              <span className="ml-auto text-xs text-[var(--muted)]">{u.email}</span>
            </summary>

            <form
              action={updateUserAction}
              className="border-t border-[var(--border)] bg-[var(--surface)]/40 p-4"
            >
              <input type="hidden" name="id" value={u.id} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Name">
                  <input name="name" required defaultValue={u.name} className={INPUT} />
                </Field>
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={u.email}
                    className={INPUT}
                  />
                </Field>
                <Field label="Job title">
                  <input
                    name="title"
                    defaultValue={u.title ?? ""}
                    placeholder="Senior Process Engineer"
                    className={INPUT}
                  />
                </Field>
                <Field label="Hourly rate (optional)">
                  <input
                    name="hourlyRate"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={u.hourlyRate ?? ""}
                    className={INPUT}
                  />
                </Field>
                <Field label="Department">
                  <select name="department" defaultValue={u.department} className={INPUT}>
                    {USER_DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.display}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Role (permissions)">
                  <select name="role" defaultValue={u.role} className={INPUT}>
                    {USER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.display}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-noble-black/80">
                <input type="checkbox" name="active" defaultChecked={u.active} />
                Active (can sign in and be assigned)
              </label>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-noble-black px-3 py-2 text-xs font-medium text-white hover:bg-noble-black/85"
                >
                  Save changes
                </button>
              </div>
            </form>

            <form
              action={resetUserPasswordAction}
              className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)]"
            >
              <input type="hidden" name="id" value={u.id} />
              <span>Reset this person&rsquo;s password to the default.</span>
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-2.5 py-1 font-medium text-noble-black hover:bg-noble-stone/40"
              >
                Reset password
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        {label}
      </span>
      {children}
    </label>
  );
}

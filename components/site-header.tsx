import Link from "next/link";
import { redirect } from "next/navigation";
import { NobleLogo } from "@/components/noble-logo";
import { MainNav } from "@/components/main-nav";
import { MoonPhaseTracker } from "@/components/moon-phase";
import { getCurrentUser, signOut } from "@/lib/auth";

/*
 * v2 nav — one destination per persona (docs/v2-plan.md): Portfolio for
 * the high-level view, Projects to drill in, My Work for engineers,
 * Department for dept heads, Admin + the daily report for the PM. Old
 * routes (/board, /reports, /programs, /execution, /my-week) stay
 * reachable by URL until phase 4 removes them.
 */
const NAV: Array<{ href: string; label: string; roles?: string[] }> = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/projects", label: "Projects" },
  { href: "/my-work", label: "My Work", roles: ["engineer", "admin"] },
  { href: "/department", label: "Department", roles: ["viewer", "admin"] },
  { href: "/", label: "Daily Report", roles: ["admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/sign-in");
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="no-print border-b border-noble-black/10 bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href={user ? "/" : "/sign-in"} className="flex items-center gap-3">
          <NobleLogo className="h-8 w-auto" />
          <span className="hidden text-sm font-semibold tracking-wide uppercase text-noble-black sm:inline">
            PM Command Center
          </span>
        </Link>
        {user ? (
          <MainNav
            items={NAV.filter(
              (n) => !n.roles || n.roles.includes(user.role)
            ).map(({ href, label }) => ({ href, label }))}
          />
        ) : (
          <div className="flex-1" />
        )}
        <MoonPhaseTracker />
        <div className="hidden items-center gap-3 text-sm md:flex">
          {user ? (
            <>
              <span className="text-noble-black/70">
                {user.name}{" "}
                <span className="uppercase text-[var(--muted)]">
                  ({user.role})
                </span>
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-noble-black/80 hover:bg-noble-stone/40"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-noble-black hover:bg-noble-stone/40"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { NobleLogo } from "@/components/noble-logo";
import { getCurrentUser, signOut } from "@/lib/auth";

const NAV: Array<{ href: string; label: string; roles?: string[] }> = [
  { href: "/", label: "Dashboard" },
  { href: "/programs", label: "Programs" },
  { href: "/projects", label: "Projects" },
  { href: "/my-week", label: "My Week", roles: ["engineer", "admin"] },
  { href: "/meetings", label: "Meetings" },
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
          <nav className="flex flex-1 items-center gap-1 text-sm">
            {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-noble-black/80 transition-colors hover:bg-noble-stone/40 hover:text-noble-black"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        ) : (
          <div className="flex-1" />
        )}
        <div className="hidden items-center gap-3 text-sm md:flex">
          {user ? (
            <>
              <span className="text-noble-black/60">
                {user.name}{" "}
                <span className="text-noble-black/40 uppercase">
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

import Link from "next/link";
import { NobleLogo } from "@/components/noble-logo";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/", label: "Dashboard" },
  { href: "/programs", label: "Programs" },
  { href: "/projects", label: "Projects" },
  { href: "/my-week", label: "My Week" },
  { href: "/meetings", label: "Meetings" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="no-print border-b border-noble-black/10 bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <NobleLogo className="h-8 w-auto" />
          <span className="hidden text-sm font-semibold tracking-wide uppercase text-noble-black sm:inline">
            PM Command Center
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-noble-black/80 transition-colors hover:bg-noble-stone/40 hover:text-noble-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 text-sm md:flex">
          <span className="text-noble-black/60">Signed in as</span>
          <span className="font-medium">Ryan (Admin)</span>
        </div>
      </div>
    </header>
  );
}

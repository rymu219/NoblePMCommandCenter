"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex flex-1 items-center gap-1 text-sm">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-noble-stone/60 px-3 py-1.5 font-semibold text-noble-black"
                : "rounded-md px-3 py-1.5 text-noble-black/80 transition-colors hover:bg-noble-stone/40 hover:text-noble-black"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

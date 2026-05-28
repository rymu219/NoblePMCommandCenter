import Link from "next/link";

/** Consistent "← Back" navigation for deep pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-noble-black hover:underline"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

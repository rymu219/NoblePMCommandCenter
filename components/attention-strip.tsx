import Link from "next/link";
import type { AttentionGroups, AttentionItem } from "@/lib/status-loader";

interface Category {
  key: keyof Omit<AttentionGroups, "total">;
  title: string;
  /** left border + label color */
  accent: string;
  labelColor: string;
}

const CATEGORIES: Category[] = [
  { key: "overdue", title: "Overdue", accent: "border-l-noble-red", labelColor: "text-noble-red" },
  { key: "dueSoon", title: "Due soon", accent: "border-l-[#BA7517]", labelColor: "text-[#8a5a12]" },
  { key: "stale", title: "Stale", accent: "border-l-noble-slate", labelColor: "text-noble-slate" },
  { key: "milestones", title: "Upcoming", accent: "border-l-noble-navy", labelColor: "text-noble-navy" },
  { key: "periodClose", title: "Period close", accent: "border-l-noble-brick", labelColor: "text-noble-brick" },
];

export function AttentionStrip({ groups }: { groups: AttentionGroups }) {
  if (groups.total === 0) return null;
  const active = CATEGORIES.filter((c) => groups[c.key].length > 0);

  return (
    <section className="mb-8" aria-label="What needs attention">
      <h2 className="mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-noble-red">
        Needs attention
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((c) => (
          <Card key={c.key} category={c} items={groups[c.key]} />
        ))}
      </div>
    </section>
  );
}

function Card({ category, items }: { category: Category; items: AttentionItem[] }) {
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <div className={`rounded-lg border border-[var(--border)] border-l-4 ${category.accent} bg-white p-3`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] font-semibold tracking-[0.12em] uppercase ${category.labelColor}`}>
          {category.title}
        </span>
        <span className="text-lg font-semibold leading-none text-noble-black">
          {items.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5 text-xs">
        {shown.map((it, i) => (
          <li key={i} className="leading-snug">
            <Link href={it.href} className="text-noble-navy hover:underline">
              {it.label}
            </Link>
            {it.meta ? (
              <span className="ml-1 text-[var(--muted)]">· {it.meta}</span>
            ) : null}
          </li>
        ))}
        {extra > 0 ? (
          <li className="text-[var(--muted)]">+{extra} more</li>
        ) : null}
      </ul>
    </div>
  );
}

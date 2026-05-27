import type { LegendItem } from "@/lib/types";
import { ROLE_META } from "@/lib/types";

const DEFAULT_ITEMS: LegendItem[] = [
  { label: "Engineering", fill: ROLE_META.engineering.fill, stroke: ROLE_META.engineering.stroke },
  { label: "Process", fill: ROLE_META.process.fill, stroke: ROLE_META.process.stroke },
  { label: "Process / setup", fill: ROLE_META.automation.fill, stroke: ROLE_META.automation.stroke },
  { label: "Quality measurement", fill: ROLE_META.quality.fill, stroke: ROLE_META.quality.stroke },
];

export function Legend({ items }: { items?: LegendItem[] }) {
  const list = items && items.length ? items : DEFAULT_ITEMS;
  return (
    <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
      {list.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{
              background: it.fill,
              border: `0.5px ${it.dashed ? "dashed" : "solid"} ${it.stroke}`,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

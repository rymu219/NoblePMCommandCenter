import { ROLE_META } from "@/lib/types";

export function Legend() {
  const items: Array<{ label: string; fill: string; stroke: string; dashed?: boolean }> = [
    { label: "Engineering", fill: ROLE_META.engineering.fill, stroke: ROLE_META.engineering.stroke },
    { label: "Process / Byrne tool work", fill: ROLE_META.process.fill, stroke: ROLE_META.process.stroke },
    { label: "Process / setup", fill: ROLE_META.automation.fill, stroke: ROLE_META.automation.stroke },
    { label: "Quality measurement", fill: ROLE_META.quality.fill, stroke: ROLE_META.quality.stroke },
    { label: "12-hr cure hold (mold in press, 24-hr clock)", fill: "rgba(128,128,128,0.15)", stroke: "#888780", dashed: true },
    { label: "Non-working hours (5pm–8am)", fill: "#f1efe8", stroke: "#d3d1c7" },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
      {items.map((it, i) => (
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

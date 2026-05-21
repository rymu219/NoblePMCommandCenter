import { statusMeta } from "@/lib/status";

export function StatusPill({
  label,
  qualifier,
  size = "md",
}: {
  label: string;
  qualifier?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const meta = statusMeta(label);
  const text =
    qualifier && qualifier.trim().length > 0
      ? `${meta.display} (${qualifier})`
      : meta.display;
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-wide ${px} ${meta.pill}`}
    >
      {text}
    </span>
  );
}

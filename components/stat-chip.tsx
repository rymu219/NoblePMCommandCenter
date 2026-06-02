/**
 * Compact metric pill for page heroes: a big number, a tracked uppercase label,
 * and a small accent dot. Color is supplied by the caller (a brand/role token or
 * hex) so the chip stays meaning-agnostic. Server component — no client JS.
 */
export function StatChip({
  value,
  label,
  accent = "var(--color-noble-navy)",
}: {
  value: number | string;
  label: string;
  /** CSS color for the accent dot + numeral tint. */
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white/70 px-3 py-2 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="leading-none">
        <div
          className="text-xl font-bold tracking-tight"
          style={{ color: accent }}
        >
          {value}
        </div>
        <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--muted-strong)]">
          {label}
        </div>
      </div>
    </div>
  );
}

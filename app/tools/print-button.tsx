"use client";

/*
 * Small client island so the otherwise-static printable sheets can trigger
 * the browser print dialog. Hidden when printing via `no-print`.
 */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-noble-black hover:bg-noble-stone/40"
    >
      {label}
    </button>
  );
}

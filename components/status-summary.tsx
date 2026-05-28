import type { StatusBlock } from "@/lib/status";
import { StatusBlocks } from "./status-blocks";

/**
 * Compact status presentation for the dense daily-report view: leads with
 * the first block's heading + a 2-line preview, with the complete status
 * tucked behind a native <details> disclosure so cards stay scannable.
 * (The project page still renders the full StatusBlocks directly.)
 */
export function StatusSummary({ blocks }: { blocks: StatusBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="text-xs italic text-[var(--muted)]">No status detail yet.</p>
    );
  }

  const first = blocks[0];
  const firstLine =
    first.body
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0]
      ?.replace(/^[-•·]\s+/, "") ?? "";

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--muted-strong)]">
        {first.heading}
      </div>
      {firstLine ? (
        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-noble-black/85">
          {firstLine}
        </p>
      ) : null}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-noble-navy hover:underline">
          Full status{blocks.length > 1 ? ` — ${blocks.length} sections` : ""}
        </summary>
        <div className="mt-2">
          <StatusBlocks blocks={blocks} />
        </div>
      </details>
    </div>
  );
}

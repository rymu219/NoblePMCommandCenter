import type { StatusBlock } from "@/lib/status";

/*
 * Renders the labeled sub-blocks (Impacts, Logistics, Customer, etc.)
 * inside a status update. Bodies support newline-separated lines; we
 * render lines that look bulleted (start with - or •) as a UL, otherwise
 * as paragraphs.
 */
export function StatusBlocks({ blocks }: { blocks: StatusBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="text-xs italic text-[var(--muted)]">
        No status detail yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i}>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-noble-black/70">
            {b.heading}
          </div>
          <BlockBody body={b.body} />
        </div>
      ))}
    </div>
  );
}

function BlockBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (lines.length === 0) return null;
  const allBulleted = lines.every((l) => /^[-•·]\s+/.test(l));
  if (allBulleted) {
    return (
      <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-noble-black/85">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^[-•·]\s+/, "")}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mt-1 space-y-1 text-sm leading-relaxed text-noble-black/85">
      {lines.map((l, i) => {
        if (/^[-•·]\s+/.test(l)) {
          return (
            <div key={i} className="pl-4 relative">
              <span className="absolute left-0 text-noble-red">·</span>
              {l.replace(/^[-•·]\s+/, "")}
            </div>
          );
        }
        return <p key={i}>{l}</p>;
      })}
    </div>
  );
}

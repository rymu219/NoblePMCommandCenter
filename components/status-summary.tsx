import { MarkdownLite } from "@/components/v2/markdown";

/**
 * Compact status presentation for the dense daily-report view: a 2-line
 * preview with the complete narrative tucked behind a native <details>
 * disclosure so cards stay scannable.
 */
export function StatusSummary({ narrative }: { narrative: string | null }) {
  if (!narrative?.trim()) {
    return (
      <p className="text-xs italic text-[var(--muted)]">No status detail yet.</p>
    );
  }

  const firstLine =
    narrative
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0]
      ?.replace(/^[-•·]\s+/, "")
      .replace(/\*\*/g, "") ?? "";
  const multiParagraph = narrative.split(/\n\s*\n/).filter((p) => p.trim()).length > 1;

  return (
    <div>
      {firstLine ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-noble-black/85">
          {firstLine}
        </p>
      ) : null}
      {multiParagraph || firstLine.length < narrative.trim().length - 4 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-noble-navy hover:underline">
            Full status
          </summary>
          <div className="mt-2 rounded-md bg-[var(--surface)] px-3 py-2.5">
            <MarkdownLite text={narrative} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

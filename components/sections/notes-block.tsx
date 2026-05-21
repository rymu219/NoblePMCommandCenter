/*
 * Tiny markdown-ish renderer: bold runs delimited by **. No external deps.
 * For full markdown later, swap in `react-markdown`.
 */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={i++} className="font-medium text-noble-black">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function NotesBlock({ blocks }: { blocks: string[] }) {
  return (
    <div className="space-y-3 rounded-md bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
      {blocks.map((b, i) => (
        <p key={i}>{renderInline(b)}</p>
      ))}
    </div>
  );
}

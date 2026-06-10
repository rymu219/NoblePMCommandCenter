/*
 * Markdown-lite renderer shared by the v2 narrative + notes cards.
 * Same rules as the legacy NotesBlock: **bold** runs, blank-line
 * paragraphs. Pure module — safe in server and client components.
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

export function MarkdownLite({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-noble-black/85">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {renderInline(p)}
        </p>
      ))}
    </div>
  );
}

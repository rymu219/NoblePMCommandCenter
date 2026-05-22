"use client";

import { useState } from "react";
import { SectionButtons } from "./section-buttons";

interface Props {
  initial: string[];
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function NotesEditor({ initial, submit, busy, cancel }: Props) {
  const [text, setText] = useState(initial.join("\n\n"));

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Notes (markdown-lite)
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Paragraphs separated by blank lines. <span className="font-mono">**bold**</span>{" "}
        renders bold.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm leading-relaxed focus:border-noble-red/40 focus:outline-none"
        placeholder="Catch-all notes for anything off-template…"
      />
      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit({
            blocks: text
              .split(/\n{2,}/)
              .map((b) => b.trim())
              .filter(Boolean),
          })
        }
      />
    </div>
  );
}

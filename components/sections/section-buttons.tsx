"use client";

/** Save/Cancel button pair shared across every section editor. */
export function SectionButtons({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-noble-stone/40"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/** Small + button used inside repeatable-row editors. */
export function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 rounded-md border border-[var(--border)] px-3 py-1 text-xs text-noble-black/80 hover:bg-noble-stone/40"
    >
      + {label}
    </button>
  );
}

/** Standard row-remove "×" button used in repeatable-row editors. */
export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove row"
      className="rounded-md px-2 py-1 text-xs text-noble-red hover:bg-noble-red/10"
    >
      ×
    </button>
  );
}

"use client";

import { useState } from "react";
import type { SummaryCard } from "@/lib/types";
import { AddRowButton, RemoveRowButton, SectionButtons } from "./section-buttons";

interface CardEdit extends SummaryCard {
  id: number;
}
interface RowEdit {
  id: number;
  cards: CardEdit[];
}

let _id = 1;
const nextId = () => _id++;

interface Props {
  initial: SummaryCard[][];
  submit: (payload: unknown) => void;
  busy: boolean;
  cancel: () => void;
}

export function SummaryCardsEditor({ initial, submit, busy, cancel }: Props) {
  const [rows, setRows] = useState<RowEdit[]>(
    initial.length
      ? initial.map((row) => ({
          id: nextId(),
          cards: row.map((c) => ({ ...c, id: nextId() })),
        }))
      : [
          {
            id: nextId(),
            cards: [{ id: nextId(), label: "", value: "", unit: "" }],
          },
        ]
  );

  function updateCard(rowId: number, cardId: number, patch: Partial<CardEdit>) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === rowId
          ? {
              ...r,
              cards: r.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
            }
          : r
      )
    );
  }
  function addCard(rowId: number) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === rowId
          ? { ...r, cards: [...r.cards, { id: nextId(), label: "", value: "", unit: "" }] }
          : r
      )
    );
  }
  function removeCard(rowId: number, cardId: number) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === rowId ? { ...r, cards: r.cards.filter((c) => c.id !== cardId) } : r
      )
    );
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      { id: nextId(), cards: [{ id: nextId(), label: "", value: "", unit: "" }] },
    ]);
  }
  function removeRow(rowId: number) {
    setRows((rs) => rs.filter((r) => r.id !== rowId));
  }

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/70">
        Summary cards
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Each row renders as a grid of cards. Add multiple rows for groups
        (e.g., a row of project-level metrics + a row of per-phase metrics).
      </p>

      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)]/40 p-2"
          >
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-noble-black/60">
              <span>Row of {row.cards.length} card{row.cards.length === 1 ? "" : "s"}</span>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-noble-red hover:underline"
              >
                Remove row
              </button>
            </div>
            <div className="space-y-2">
              {row.cards.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_1fr_180px_auto] items-center gap-2"
                >
                  <input
                    value={c.label}
                    onChange={(e) => updateCard(row.id, c.id, { label: e.target.value })}
                    placeholder="Label (e.g., Calendar time)"
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
                  />
                  <input
                    value={c.value}
                    onChange={(e) => updateCard(row.id, c.id, { value: e.target.value })}
                    placeholder="Value (e.g., 12 weeks)"
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
                  />
                  <input
                    value={c.unit ?? ""}
                    onChange={(e) => updateCard(row.id, c.id, { unit: e.target.value })}
                    placeholder="Subline (optional)"
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
                  />
                  <RemoveRowButton onClick={() => removeCard(row.id, c.id)} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addCard(row.id)}
              className="mt-2 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-noble-black/80 hover:bg-noble-stone/40"
            >
              + Add card to row
            </button>
          </div>
        ))}
      </div>

      <AddRowButton onClick={addRow} label="Add row of cards" />

      <SectionButtons
        busy={busy}
        onCancel={cancel}
        onSave={() =>
          submit(
            rows
              .map((r) =>
                r.cards
                  .filter((c) => c.label.trim() || c.value.trim())
                  .map(({ id: _id, ...rest }) => ({
                    label: rest.label,
                    value: rest.value,
                    unit: rest.unit?.trim() || undefined,
                  }))
              )
              .filter((row) => row.length > 0)
          )
        }
      />
    </div>
  );
}

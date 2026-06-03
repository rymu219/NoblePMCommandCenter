"use client";

import { useMemo, useRef, useState } from "react";

export interface ProjectOption {
  id: string;
  name: string;
}

const label = (p: ProjectOption) => `${p.id} — ${p.name}`;

/**
 * Searchable single-select for projects. Type to filter by project number or
 * name; pick to select. Optional (a "— Unassigned —" row clears it). Lightweight
 * — no dependency, closes on blur. Used by the Quality inspection form.
 */
export function ProjectCombobox({
  projects,
  value,
  onChange,
  placeholder = "Search project # or name…",
  className = "",
}: {
  projects: ProjectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = projects.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? projects.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(q))
      : projects;
    return list.slice(0, 50);
  }, [projects, query]);

  function pick(id: string | null) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <input
        value={open ? query : selected ? label(selected) : ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
      />
      {selected && !open ? (
        <button
          type="button"
          aria-label="Clear project"
          onClick={() => pick(null)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-noble-red"
        >
          ✕
        </button>
      ) : null}

      {open ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full min-w-[240px] overflow-auto rounded-md border border-[var(--border)] bg-white shadow-[var(--shadow-md)]"
          onMouseDown={(e) => {
            // Keep focus so onBlur doesn't fire before the click registers.
            e.preventDefault();
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          <li>
            <button
              type="button"
              onClick={() => pick(null)}
              className="block w-full px-2 py-1.5 text-left text-xs italic text-[var(--muted)] hover:bg-noble-stone/40"
            >
              — Unassigned —
            </button>
          </li>
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p.id)}
                className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-noble-stone/40 ${
                  p.id === value ? "bg-noble-stone/30 font-medium" : ""
                }`}
              >
                <span className="font-mono text-xs text-[var(--muted)]">{p.id}</span>{" "}
                {p.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-[var(--muted)]">No matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

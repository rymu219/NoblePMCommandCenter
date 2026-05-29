"use client";

import { useEffect, useState } from "react";
import { getMoonPhase, moonLitPath, type MoonPhase } from "@/lib/moon-phase";

/**
 * Subtle, real-time moon-phase tracker for the site header. Renders a small
 * silhouette of the current illuminated disc plus a compact label. The phase
 * is computed on the client (after mount) to reflect the viewer's "now" and
 * to avoid a server/client hydration mismatch; it refreshes periodically.
 */
export function MoonPhaseTracker() {
  const [phase, setPhase] = useState<MoonPhase | null>(null);

  useEffect(() => {
    const update = () => setPhase(getMoonPhase(new Date()));
    update();
    // The phase drifts slowly; a quarter-hour refresh keeps it honest
    // without churn.
    const id = setInterval(update, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const r = 8;
  const size = (r + 1) * 2; // small breathing room for the ring stroke
  const c = r + 1;

  // Before mount we render an empty disc placeholder of the same size so the
  // header layout doesn't shift once the phase resolves.
  const label = phase ? phase.name : "Moon phase";
  const illum = phase ? Math.round(phase.illumination * 100) : null;
  const title = phase
    ? `${phase.name} · ${illum}% illuminated · day ${phase.age.toFixed(1)} of 29.5`
    : "Moon phase";

  return (
    <div
      className="flex items-center gap-2 text-noble-black/55"
      title={title}
      aria-label={phase ? `Moon phase: ${title}` : "Moon phase"}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-hidden="true"
        className="shrink-0"
      >
        <g transform={`translate(${c} ${c})`}>
          <circle
            r={r}
            fill="#ffffff"
            stroke="rgba(17,25,33,0.28)"
            strokeWidth={1}
          />
          {phase && phase.illumination > 0.01 ? (
            <path d={moonLitPath(phase.fraction, r)} fill="rgba(17,25,33,0.72)" />
          ) : null}
        </g>
      </svg>
      <span className="hidden text-xs font-medium tracking-wide whitespace-nowrap lg:inline">
        {label}
      </span>
    </div>
  );
}

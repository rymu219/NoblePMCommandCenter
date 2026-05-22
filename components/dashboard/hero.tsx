import { DASH } from "./colors";

interface Props {
  projectNumber: string;
  programPrefix: string;
  projectName: string;
  customerName?: string | null;
  updatedLabel: string;
  /** "ON SCHEDULE" | "AT RISK" | "OFF TRACK" — controls the pill colorway. */
  health: "on_schedule" | "at_risk" | "off_track";
}

const HEALTH_META: Record<
  Props["health"],
  { label: string; bg: string; text: string }
> = {
  on_schedule: { label: "ON SCHEDULE", bg: DASH.green, text: "#ffffff" },
  at_risk: { label: "AT RISK", bg: DASH.amber, text: "#ffffff" },
  off_track: { label: "OFF TRACK", bg: DASH.red, text: "#ffffff" },
};

export function DashboardHero({
  projectNumber,
  projectName,
  updatedLabel,
  health,
}: Props) {
  const h = HEALTH_META[health];
  return (
    <header>
      <div
        className="flex items-center gap-4 text-[12px] font-medium tracking-[0.28em]"
        style={{ color: DASH.yellow }}
      >
        <span>PROGRAM DASHBOARD</span>
        <span style={{ color: DASH.muted }}>•</span>
        <span>{projectNumber}</span>
        <span style={{ color: DASH.muted }}>•</span>
        <span>{projectName.toUpperCase()}</span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-6">
        <h1 className="font-sans text-5xl font-bold leading-tight tracking-tight text-white">
          {projectName}
        </h1>
        <div className="flex flex-col items-end">
          <span
            className="rounded-md px-5 py-2 text-[14px] font-semibold tracking-[0.22em]"
            style={{ background: h.bg, color: h.text }}
          >
            {h.label}
          </span>
          <span className="mt-2 text-xs italic" style={{ color: DASH.muted }}>
            Updated {updatedLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

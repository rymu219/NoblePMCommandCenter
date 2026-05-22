import { DASH } from "./colors";

interface Props {
  nextTrigger?: string | null;
  keyMilestone?: string | null;
}

export function TriggerMilestoneStrip({ nextTrigger, keyMilestone }: Props) {
  if (!nextTrigger && !keyMilestone) return null;
  return (
    <div
      className="rounded-md px-4 py-3 text-sm"
      style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {nextTrigger ? (
          <div className="flex items-baseline gap-3">
            <span
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: DASH.yellow }}
            >
              NEXT TRIGGER
            </span>
            <span className="italic text-white">{nextTrigger}</span>
          </div>
        ) : null}
        {nextTrigger && keyMilestone ? (
          <span style={{ color: DASH.muted }}>•</span>
        ) : null}
        {keyMilestone ? (
          <div className="flex items-baseline gap-3">
            <span
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: DASH.yellow }}
            >
              KEY MILESTONE
            </span>
            <span className="italic text-white">{keyMilestone}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FooterProps {
  programPrefix: string;
  customer?: string | null;
  dateLabel: string;
}

export function DashboardFooter({ programPrefix, customer, dateLabel }: FooterProps) {
  return (
    <footer
      className="mt-6 flex items-center justify-between text-[11px] tracking-[0.22em]"
      style={{ color: DASH.muted }}
    >
      <div>
        NOBLE PLASTICS
        <span className="mx-3" style={{ color: DASH.muted }}>•</span>
        {programPrefix}
        {customer ? (
          <>
            <span className="mx-1.5">—</span>
            {customer.toUpperCase()}
          </>
        ) : null}
      </div>
      <div className="italic tracking-normal">{dateLabel}</div>
    </footer>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
  extra?: React.ReactNode;
}

export function DashSectionLabel({ children, extra }: SectionLabelProps) {
  return (
    <div className="mt-8 mb-3 flex items-end gap-3">
      <h2
        className="text-[12px] font-semibold tracking-[0.28em]"
        style={{ color: DASH.yellow }}
      >
        {children}
      </h2>
      {extra ? (
        <span className="text-[12px] tracking-[0.18em] text-white/80">
          {extra}
        </span>
      ) : null}
    </div>
  );
}

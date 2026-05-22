import { DASH } from "./colors";

interface Card {
  label: string;
  /** Big numeral, e.g., "$552K" or "+$14K". */
  value: string;
  /** Subline below the label. */
  subline?: string;
  /** Stripe / numeral color. */
  accent: "slate" | "yellow" | "red" | "headroom";
}

function colorsFor(accent: Card["accent"]) {
  switch (accent) {
    case "yellow":
      return { stripe: DASH.yellow, numeral: "#ffffff", label: DASH.yellow };
    case "red":
      return { stripe: DASH.red, numeral: "#ffffff", label: DASH.red };
    case "headroom":
      return { stripe: DASH.yellow, numeral: DASH.yellow, label: DASH.yellow };
    case "slate":
    default:
      return { stripe: DASH.track.slate, numeral: "#ffffff", label: DASH.muted };
  }
}

export function MetricCards({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => {
        const cc = colorsFor(c.accent);
        return (
          <div
            key={i}
            className="overflow-hidden rounded-md"
            style={{ background: DASH.panel }}
          >
            <div className="h-1.5" style={{ background: cc.stripe }} />
            <div className="px-5 py-4">
              <div
                className="text-[44px] font-bold leading-none tracking-tight"
                style={{ color: cc.numeral }}
              >
                {c.value}
              </div>
              <div
                className="mt-2 text-[12px] font-semibold tracking-[0.28em]"
                style={{ color: cc.label }}
              >
                {c.label.toUpperCase()}
              </div>
              {c.subline ? (
                <div
                  className="mt-1 text-xs italic"
                  style={{ color: DASH.muted }}
                >
                  {c.subline}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

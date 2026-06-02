/**
 * Reusable branded header band used by the Home (Daily Report) and Board pages.
 * Sits on the `.hero-band` (faint brand gradient + red top accent). Slots:
 * a red eyebrow, a big serif title, a subtitle, an optional right-side action
 * area, and an optional row of stat chips below. Server component — no client JS.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  stats,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned controls (buttons/links). Wrap interactive ones in .no-print. */
  actions?: React.ReactNode;
  /** Row of <StatChip /> elements rendered under the title. */
  stats?: React.ReactNode;
}) {
  return (
    <header className="hero-band animate-rise mb-8 px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-noble-red">
            {eyebrow}
          </div>
          <h1 className="mt-1 font-serif text-3xl font-medium text-noble-black sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {stats ? (
        <div className="mt-5 flex flex-wrap gap-2.5">{stats}</div>
      ) : null}
    </header>
  );
}

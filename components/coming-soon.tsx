interface Props {
  title: string;
  description: string;
  bullets?: string[];
}

export function ComingSoon({ title, description, bullets }: Props) {
  return (
    <div className="mx-auto w-full max-w-[960px] px-6 py-12">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        {title}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">
        {description}
      </p>
      {bullets ? (
        <ul className="mt-6 space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-noble-red">·</span>
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-6 text-xs text-[var(--muted)]">
        v0 placeholder. Wired up in subsequent build phases.
      </p>
    </div>
  );
}

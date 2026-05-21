interface Props {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionShell({ title, actions, children }: Props) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-serif text-base font-medium text-noble-black">
          {title}
        </h2>
        {actions ? <div className="no-print">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

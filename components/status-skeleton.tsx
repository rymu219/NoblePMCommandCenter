import {
  budgetMeta,
  scheduleMeta,
  type StatusSkeleton,
} from "@/lib/status";

/*
 * Renders the lightweight structured "skeleton" header that sits above the
 * free narrative on a status update: schedule + budget confidence chips, the
 * next milestone (+ date), and the one-line top focus / blocker. Fields are
 * all optional; anything unset renders as a muted "—". A header with nothing
 * set renders nothing at all so legacy updates stay clean.
 */
export function StatusSkeletonHeader({
  skeleton,
}: {
  skeleton: StatusSkeleton;
}) {
  const sched = scheduleMeta(skeleton.scheduleConfidence);
  const budget = budgetMeta(skeleton.budgetConfidence);
  const milestone = skeleton.nextMilestone?.trim() || null;
  const focus = skeleton.topFocus?.trim() || null;
  const milestoneDate = skeleton.nextMilestoneDate
    ? skeleton.nextMilestoneDate.toISOString().slice(0, 10)
    : null;

  const hasAnything =
    sched || budget || milestone || milestoneDate || focus;
  if (!hasAnything) return null;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <Field label="Schedule">
          {sched ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${sched.pill}`}
            >
              {sched.display}
            </span>
          ) : (
            <Dash />
          )}
        </Field>
        <Field label="Budget">
          {budget ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${budget.pill}`}
            >
              {budget.display}
            </span>
          ) : (
            <Dash />
          )}
        </Field>
        <Field label="Next milestone">
          {milestone || milestoneDate ? (
            <span className="font-medium text-noble-black">
              {milestone ?? "—"}
              {milestoneDate ? (
                <span className="ml-1 font-normal text-[var(--muted)]">
                  · {milestoneDate}
                </span>
              ) : null}
            </span>
          ) : (
            <Dash />
          )}
        </Field>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
          Top focus
        </span>
        {focus ? (
          <span className="text-sm font-medium text-noble-black">{focus}</span>
        ) : (
          <Dash />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-semibold tracking-wider uppercase text-noble-black/60">
        {label}
      </span>
      {children}
    </span>
  );
}

function Dash() {
  return <span className="text-[var(--muted)]">—</span>;
}

"use client";

import { useEffect, useState } from "react";

/*
 * Acknowledgment bits for completed work — "gone but not forgotten".
 *
 *  - ThankYouLine: the persistent "🙏 Thank you, {name}!" shown on completed
 *    milestone cards in the lane archive (renderable from a server component).
 *  - ThanksFlash: a transient "🎉 Thanks!" that plays for a couple of seconds
 *    the moment a subtask is checked done, then fades.
 */

export function ThankYouLine({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-role-process)]">
      <span aria-hidden>🙏</span>
      <span>Thank you{name ? `, ${name}` : ""}!</span>
    </div>
  );
}

export function ThanksFlash({ trigger }: { trigger: number }) {
  // Visible while the latest trigger hasn't yet been dismissed by the timeout.
  const [dismissed, setDismissed] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;
    const id = setTimeout(() => setDismissed(trigger), 2200);
    return () => clearTimeout(id);
  }, [trigger]);

  if (trigger === 0 || trigger === dismissed) return null;
  return (
    <span className="animate-pulse rounded bg-[var(--color-role-process)]/12 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-role-process)]">
      🎉 Thanks!
    </span>
  );
}

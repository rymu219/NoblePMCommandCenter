"use client";

import { useTransition } from "react";
import { publishDailyReportAction } from "./dashboard-actions";

interface Props {
  snapshot: unknown;
}

export function PublishButton({ snapshot }: Props) {
  const [pending, startTransition] = useTransition();
  function go() {
    if (!confirm("Publish today's Daily Tooling Report?")) return;
    startTransition(async () => {
      try {
        await publishDailyReportAction(JSON.stringify(snapshot));
      } catch (e) {
        alert(e instanceof Error ? e.message : "Publish failed.");
      }
    });
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="rounded-md bg-noble-red px-3 py-1.5 text-xs font-medium text-white hover:bg-noble-red/85 disabled:opacity-60"
    >
      {pending ? "Publishing…" : "Publish daily report"}
    </button>
  );
}

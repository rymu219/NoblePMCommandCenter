/**
 * Shared failure notice for the light-themed in-place editors. Shows the
 * underlying error and — crucially — reassures the user their input is still
 * on screen so a transient blip (e.g. a Railway redeploy) never tempts a
 * refresh, which is the only thing that actually discards their work.
 */
export function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-3 rounded-md bg-noble-red/10 px-3 py-2 text-xs text-noble-red">
      <span className="font-medium">{message}</span>
      <span className="mt-1 block text-noble-red/85">
        Your entries are still here — don&rsquo;t refresh. Fix anything noted
        above, or wait a few seconds and click Save again (the server may be
        restarting after a deploy).
      </span>
    </div>
  );
}

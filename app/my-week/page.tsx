import { redirect } from "next/navigation";

/* /my-week merged into /my-work (v2 phase 4) — forward, keeping the week. */
export default async function MyWeekRedirect({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  redirect(week ? `/my-work?week=${week}` : "/my-work");
}

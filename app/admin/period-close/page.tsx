import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function closeMonth(formData: FormData) {
  "use server";
  const u = await requireRole(["admin"]);
  const year = parseInt(String(formData.get("year") ?? "0"), 10);
  const month = parseInt(String(formData.get("month") ?? "0"), 10);
  if (!year || !month) return;
  await prisma.periodClose.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: { year, month, closedById: u.id },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: u.id,
      entityType: "PeriodClose",
      entityId: `${year}-${String(month).padStart(2, "0")}`,
      action: "close",
    },
  });
  revalidatePath("/admin/period-close");
  revalidatePath("/my-week");
}

async function reopenMonth(formData: FormData) {
  "use server";
  const u = await requireRole(["admin"]);
  const year = parseInt(String(formData.get("year") ?? "0"), 10);
  const month = parseInt(String(formData.get("month") ?? "0"), 10);
  await prisma.periodClose.deleteMany({ where: { year, month } });
  await prisma.auditLog.create({
    data: {
      actorUserId: u.id,
      entityType: "PeriodClose",
      entityId: `${year}-${String(month).padStart(2, "0")}`,
      action: "reopen",
    },
  });
  revalidatePath("/admin/period-close");
  revalidatePath("/my-week");
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function PeriodClosePage() {
  await requireRole(["admin"]).catch(() => redirect("/"));

  const closes = await prisma.periodClose.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { closedBy: true },
  });
  const now = new Date();
  const year = now.getUTCFullYear();
  const months: Array<{ year: number; month: number }> = [];
  // Show the last 12 months + the current.
  for (let i = 0; i < 13; i++) {
    const d = new Date(Date.UTC(year, now.getUTCMonth() - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }
  const closedMap = new Map(
    closes.map((c) => [`${c.year}-${c.month}`, c])
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-8">
      <div className="flex items-baseline gap-3 text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:underline">
          ← Admin
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl font-medium text-noble-black">
        Period close
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Close a month to lock all time entries inside it. Engineers cannot
        edit closed months. Admin can reopen at any time — every action is
        audit-logged.
      </p>

      <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {months.map((m) => {
          const key = `${m.year}-${m.month}`;
          const c = closedMap.get(key);
          return (
            <li
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <div className="font-medium text-noble-black">
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </div>
                {c ? (
                  <div className="text-xs text-[var(--muted)]">
                    Closed {c.closedAt.toISOString().slice(0, 10)} by{" "}
                    {c.closedBy.name}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--muted)]">Open</div>
                )}
              </div>
              {c ? (
                <form action={reopenMonth}>
                  <input type="hidden" name="year" value={m.year} />
                  <input type="hidden" name="month" value={m.month} />
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-noble-stone/40"
                  >
                    Reopen
                  </button>
                </form>
              ) : (
                <form action={closeMonth}>
                  <input type="hidden" name="year" value={m.year} />
                  <input type="hidden" name="month" value={m.month} />
                  <button
                    type="submit"
                    className="rounded-md bg-noble-black px-3 py-1 text-xs font-medium text-white hover:bg-noble-black/85"
                  >
                    Close month
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

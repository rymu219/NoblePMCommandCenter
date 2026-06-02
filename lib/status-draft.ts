/*
 * Auto-draft a status update from a project's STRUCTURED activity, so the PM
 * edits a starting draft instead of composing from a blank page.
 *
 * What it gathers since the last status update (or the last 30 days for a
 * first-ever status): milestones / subtasks completed, committed dates that
 * moved, items now overdue, and what's coming up next.
 *
 * PRIVACY: MilestoneReplan.reason is admin-only and "never surfaced to
 * engineers" (see prisma/schema.prisma). A StatusUpdate is broadly viewable, so
 * the draft reports *that a date moved and by how many days* (already public on
 * the project page) but DELIBERATELY OMITS the private reason category — the PM
 * supplies the "why" in their own (audience-appropriate) words.
 */

import { prisma } from "./prisma";
import { ymd } from "./time-tracking";
import { todayUTC } from "./slippage";

export interface DraftBlock {
  heading: string;
  body: string;
}

export interface StatusDraft {
  blocks: DraftBlock[];
  /** Suggested status label derived from the activity, or null. */
  suggestedLabel: string | null;
  /** ISO day of the "activity since …" boundary; null for a first-ever status. */
  sinceIso: string | null;
  /** False when nothing changed worth describing. */
  hasActivity: boolean;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function midnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((midnight(a).getTime() - midnight(b).getTime()) / 86400000);
}

function bullets(lines: string[]): string {
  return lines.map((l) => `- ${l}`).join("\n");
}

function signed(n: number): string {
  const a = Math.abs(n);
  const unit = `${a} day${a === 1 ? "" : "s"}`;
  if (n > 0) return `+${unit}`;
  if (n < 0) return `−${unit}`;
  return "same day";
}

/**
 * Build a draft status from everything that changed on the project since the
 * last status update. Read-only — never writes.
 */
export async function buildStatusDraft(projectId: string): Promise<StatusDraft> {
  const today = todayUTC();
  const horizon = addDays(today, 14);

  const lastStatus = await prisma.statusUpdate.findFirst({
    where: { projectId },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    select: { createdAt: true },
  });

  const since = lastStatus?.createdAt ?? addDays(today, -30);
  const sinceDay = midnight(since);

  const [milestones, actionItems] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        subtasks: {
          select: { title: true, dueDate: true, completedAt: true },
        },
        replans: {
          where: { at: { gte: since } },
          orderBy: { at: "asc" },
          select: { kind: true, fromDate: true, toDate: true, deltaDays: true },
        },
      },
    }),
    prisma.actionItem.findMany({
      where: { projectId },
      select: { body: true, dueDate: true, completedAt: true },
    }),
  ]);

  // --- Progress: milestones + subtasks completed since the boundary ---
  const completedMs = milestones.filter(
    (m) => m.actualDate && m.actualDate >= sinceDay
  );
  const completedSubs = milestones.flatMap((m) =>
    m.subtasks.filter((s) => s.completedAt && s.completedAt >= since)
  );

  const progress: string[] = [
    ...completedMs.map(
      (m) => `Completed: ${m.title}${m.actualDate ? ` (${ymd(m.actualDate)})` : ""}`
    ),
  ];
  if (completedSubs.length) {
    const names = completedSubs.slice(0, 4).map((s) => s.title);
    const extra = completedSubs.length - names.length;
    progress.push(
      `Closed out ${completedSubs.length} subtask${
        completedSubs.length === 1 ? "" : "s"
      }: ${names.join("; ")}${extra > 0 ? ` (+${extra} more)` : ""}`
    );
  }

  // --- Schedule: committed dates that moved (reason intentionally omitted) ---
  const moves: string[] = [];
  let pushedLater = false;
  for (const m of milestones) {
    for (const r of m.replans) {
      if (r.deltaDays > 0) pushedLater = true;
      const verb = r.kind === "rebaseline" ? "baseline reset" : "target moved";
      const from = r.fromDate ? ymd(r.fromDate) : "—";
      const to = r.toDate ? ymd(r.toDate) : "—";
      moves.push(`${m.title}: ${verb} ${from} → ${to} (${signed(r.deltaDays)})`);
    }
  }

  // --- Risks / attention: items now overdue ---
  const overdue: string[] = [];
  for (const m of milestones) {
    for (const s of m.subtasks) {
      if (!s.completedAt && s.dueDate && s.dueDate < today) {
        overdue.push(
          `${m.title} — "${s.title}" overdue ${daysBetween(today, s.dueDate)}d`
        );
      }
    }
  }
  for (const a of actionItems) {
    if (!a.completedAt && a.dueDate && a.dueDate < today) {
      overdue.push(`Action overdue ${daysBetween(today, a.dueDate)}d: ${a.body}`);
    }
  }

  // --- Next steps: what's coming up in the next two weeks ---
  const upcoming: string[] = [];
  for (const m of milestones) {
    if (!m.actualDate && m.targetDate && m.targetDate >= today && m.targetDate <= horizon) {
      upcoming.push(`${m.title} — target ${ymd(m.targetDate)}`);
    }
  }
  for (const a of actionItems) {
    if (!a.completedAt && a.dueDate && a.dueDate >= today && a.dueDate <= horizon) {
      upcoming.push(`${a.body} — due ${ymd(a.dueDate)}`);
    }
  }

  const blocks: DraftBlock[] = [];
  if (progress.length) blocks.push({ heading: "Progress", body: bullets(progress) });
  if (moves.length) blocks.push({ heading: "Schedule", body: bullets(moves) });
  if (overdue.length) blocks.push({ heading: "Risk", body: bullets(overdue) });
  if (upcoming.length) blocks.push({ heading: "Next Steps", body: bullets(upcoming) });

  // Suggested label: overdue or a slip => at risk; clean progress => on track.
  let suggestedLabel: string | null = null;
  if (overdue.length || pushedLater) suggestedLabel = "at_risk";
  else if (progress.length) suggestedLabel = "on_track";
  else if (upcoming.length) suggestedLabel = "in_progress";

  return {
    blocks,
    suggestedLabel,
    sinceIso: lastStatus ? ymd(sinceDay) : null,
    hasActivity: blocks.length > 0,
  };
}

/*
 * Issue Tracker vocabulary + import types (Part → Issue → Challenges/Actions).
 *
 * The app stores and triages issues; the rich content is generated OUTSIDE the
 * app (record meeting → transcript → Claude) and pasted in as JSON. This module
 * defines the status vocabulary and the import payload shape so the parser
 * (lib/issues-import.ts) and the UI stay in sync. No IO here.
 */

export const ISSUE_STATUSES = [
  { value: "open", label: "Open", badge: "bg-noble-red/10 text-noble-red" },
  { value: "pending", label: "Pending", badge: "bg-[#BA7517]/15 text-[#BA7517]" },
  { value: "awaiting_customer", label: "Awaiting Customer", badge: "bg-noble-navy/10 text-noble-navy" },
  { value: "resolved", label: "Resolved", badge: "bg-[#0F6E56]/12 text-[#0F6E56]" },
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number]["value"];

const STATUS_META: Record<string, { label: string; badge: string }> = Object.fromEntries(
  ISSUE_STATUSES.map((s) => [s.value, { label: s.label, badge: s.badge }])
);

export function statusLabel(v: string): string {
  return STATUS_META[v]?.label ?? v;
}
export function statusBadge(v: string): string {
  return STATUS_META[v]?.badge ?? "bg-noble-stone/50 text-noble-black/70";
}

/** Coerce a free-text status (from imported JSON) into our vocabulary. */
export function normalizeStatus(raw: unknown): IssueStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "open";
  if (s.startsWith("resolv") || s === "closed" || s === "done") return "resolved";
  if (s.startsWith("await")) return "awaiting_customer";
  if (s.startsWith("pend") || s === "in progress" || s === "in_progress") return "pending";
  return "open";
}

// --- Import payload shape ---------------------------------------------------

export interface ImportAction {
  body: string;
  owner?: string;
  done?: boolean;
}
export interface ImportChallenge {
  title: string;
  body: string;
}
export interface ImportIssue {
  charLabel?: string;
  title: string;
  synopsis?: string;
  status?: string;
  owner?: string;
  challenges?: ImportChallenge[];
  actions?: ImportAction[];
}
export interface ImportPart {
  name: string;
  drawingNumber?: string;
  revision?: string;
  cavities?: number;
  issues?: ImportIssue[];
}
export interface ImportPayload {
  parts?: ImportPart[];
  /** Issues that apply to all parts (rendered in a cross-cutting section). */
  crossCutting?: ImportIssue[];
}

/** Match key for append de-dup of parts: drawing number, else name (lowercased). */
export function partMatchKey(p: { drawingNumber?: string | null; name: string }): string {
  return (p.drawingNumber?.trim() || p.name.trim()).toLowerCase();
}

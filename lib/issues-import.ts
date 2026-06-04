import {
  normalizeStatus,
  type ImportAction,
  type ImportChallenge,
  type ImportIssue,
  type ImportPart,
  type ImportPayload,
} from "./issues";

/*
 * Lenient parser/validator for pasted Issue-Tracker JSON (produced by Claude
 * outside the app). Coerces and trims; never throws on shape quirks — returns a
 * normalized payload plus a count, or an error string for genuinely bad input.
 * Pure (no IO) so it can be unit-tested.
 */

export interface ParsedImport {
  payload: NormalizedPayload;
  /** Total issues across parts + cross-cutting (for the confirmation message). */
  issueCount: number;
  partCount: number;
}

export interface NormalizedIssue {
  charLabel: string | null;
  title: string;
  synopsis: string | null;
  status: string;
  owner: string | null;
  challenges: ImportChallenge[];
  actions: { body: string; owner: string | null; done: boolean }[];
}
export interface NormalizedPart {
  name: string;
  drawingNumber: string | null;
  revision: string | null;
  cavities: number | null;
  issues: NormalizedIssue[];
}
export interface NormalizedPayload {
  parts: NormalizedPart[];
  crossCutting: NormalizedIssue[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strOrNull = (v: unknown): string | null => str(v) || null;

function normIssue(raw: ImportIssue): NormalizedIssue | null {
  const title = str(raw?.title);
  if (!title) return null; // an issue must at least have a title
  const challenges: ImportChallenge[] = Array.isArray(raw.challenges)
    ? raw.challenges
        .map((c) => ({ title: str(c?.title), body: str(c?.body) }))
        .filter((c) => c.title || c.body)
    : [];
  const actions = Array.isArray(raw.actions)
    ? (raw.actions as ImportAction[])
        .map((a) => ({ body: str(a?.body), owner: strOrNull(a?.owner), done: a?.done === true }))
        .filter((a) => a.body)
    : [];
  return {
    charLabel: strOrNull(raw.charLabel),
    title,
    synopsis: strOrNull(raw.synopsis),
    status: normalizeStatus(raw.status),
    owner: strOrNull(raw.owner),
    challenges,
    actions,
  };
}

function normIssues(arr: unknown): NormalizedIssue[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((i) => normIssue(i as ImportIssue)).filter((i): i is NormalizedIssue => i !== null);
}

export function parseIssueImport(text: string): ParsedImport | { error: string } {
  let data: ImportPayload;
  try {
    data = JSON.parse(text) as ImportPayload;
  } catch {
    return { error: "That isn't valid JSON. Paste the JSON block Claude produced." };
  }
  if (!data || typeof data !== "object") return { error: "Expected a JSON object with a \"parts\" array." };

  const parts: NormalizedPart[] = Array.isArray(data.parts)
    ? data.parts
        .map((p: ImportPart) => {
          const name = str(p?.name) || str(p?.drawingNumber);
          if (!name) return null;
          const cav = Number(p?.cavities);
          return {
            name,
            drawingNumber: strOrNull(p?.drawingNumber),
            revision: strOrNull(p?.revision),
            cavities: Number.isFinite(cav) && cav > 0 ? Math.trunc(cav) : null,
            issues: normIssues(p?.issues),
          };
        })
        .filter((p): p is NormalizedPart => p !== null)
    : [];

  const crossCutting = normIssues(data.crossCutting);

  const issueCount =
    parts.reduce((n, p) => n + p.issues.length, 0) + crossCutting.length;
  if (parts.length === 0 && crossCutting.length === 0) {
    return { error: "No parts or issues found. Expected { \"parts\": [...] }." };
  }

  return { payload: { parts, crossCutting }, issueCount, partCount: parts.length };
}

/** The exact prompt + schema to hand external Claude so its output imports cleanly. */
export const IMPORT_PROMPT = `Read the attached engineering-review transcript and output ONLY a JSON object (no prose, no markdown fences) matching this schema:

{
  "parts": [
    {
      "name": "string (part name)",
      "drawingNumber": "string (optional)",
      "revision": "string (optional)",
      "cavities": 0,
      "issues": [
        {
          "charLabel": "drawing callout / characteristic # (optional)",
          "title": "short issue label",
          "synopsis": "1-2 sentence: what is wrong and why it matters",
          "status": "Open | Pending | Awaiting Customer | Resolved",
          "owner": "name or role (optional)",
          "challenges": [
            { "title": "challenge name", "body": "full paragraph explaining why it's difficult" }
          ],
          "actions": [
            { "body": "specific next action", "owner": "name/role (optional)", "done": false }
          ]
        }
      ]
    }
  ],
  "crossCutting": [ { /* same issue shape, for issues that apply to all parts */ } ]
}

Identify every distinct issue discussed. Group by part. Put issues that span all parts in "crossCutting". Output valid JSON only.`;

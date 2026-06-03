/*
 * Systemic Vitality Index (SVI) — pure scoring engine.
 *
 * A deterministic, explainable 0–100 leading indicator of how healthy a
 * project's *execution system* is — not whether a single date slipped, but
 * whether the machine that delivers dates is degrading. Four sub-dimensions,
 * fixed weights, no AI. Keep this file free of Prisma / IO so the math can be
 * unit-reasoned (see lib/svi.test.ts). The Prisma read-side lives in
 * lib/svi-loader.ts and maps raw rows into the input shapes below.
 *
 * Framing (management theory the dimensions operationalize):
 *   Decision Speed  — Alignment Velocity        (hidden decision bottlenecks)
 *   Repeat Problems — Chronic Inflammation Index (common-cause / structural failure)
 *   Info Freshness  — Information Half-Life       (stale coordination inputs)
 *   Early Warning   — Psychological Transparency  (suppression / late surprises)
 *
 * Design rules carried from the spec:
 *   - Confidence QUALIFIES a score, it never depresses it.
 *   - Empty data → benign score + LOW confidence (never punish new projects,
 *     never divide by zero).
 *   - Sub-scores are count-independent ratios so projects of different sizes
 *     compare fairly.
 */

import { dayDelta, todayUTC } from "./slippage";

// --- Public taxonomy --------------------------------------------------------

export type SviDimension =
  | "decisionSpeed"
  | "repeatProblems"
  | "infoFreshness"
  | "earlyWarning";

export type Confidence = "high" | "moderate" | "low";

export interface BandMeta {
  min: number;
  label: string;
  /** Coarse tone for UI coloring. */
  tone: "strong" | "stable" | "fragile" | "atRisk" | "critical";
  /** One-line leadership action for the band. */
  action: string;
}

/** Bands, highest first. */
export const SVI_BANDS: BandMeta[] = [
  { min: 85, label: "Strong Vitality", tone: "strong", action: "Maintain operating rhythm." },
  { min: 70, label: "Stable but Watch", tone: "stable", action: "Inspect the weakest dimension." },
  { min: 55, label: "Fragile", tone: "fragile", action: "Targeted leadership review." },
  { min: 40, label: "At Risk", tone: "atRisk", action: "Run a formal recovery review." },
  { min: 0, label: "Critical", tone: "critical", action: "Immediate intervention." },
];

export function bandFor(score: number): BandMeta {
  return SVI_BANDS.find((b) => score >= b.min) ?? SVI_BANDS[SVI_BANDS.length - 1];
}

export interface DimensionMeta {
  key: SviDimension;
  /** Plain-language name shown to leadership. */
  label: string;
  /** Technical / management-theory label. */
  technical: string;
  /** Composite weight (the four sum to 1). */
  weight: number;
}

export const DIMENSIONS: Record<SviDimension, DimensionMeta> = {
  decisionSpeed: { key: "decisionSpeed", label: "Decision Speed", technical: "Alignment Velocity", weight: 0.25 },
  repeatProblems: { key: "repeatProblems", label: "Repeat Problems", technical: "Chronic Inflammation Index", weight: 0.3 },
  infoFreshness: { key: "infoFreshness", label: "Info Freshness", technical: "Information Half-Life", weight: 0.2 },
  earlyWarning: { key: "earlyWarning", label: "Early Warning", technical: "Psychological Transparency", weight: 0.25 },
};

export const DIMENSION_ORDER: SviDimension[] = [
  "decisionSpeed",
  "repeatProblems",
  "infoFreshness",
  "earlyWarning",
];

// --- Result shapes ----------------------------------------------------------

export interface SviSubScore {
  key: SviDimension;
  /** 0–100, one decimal. */
  score: number;
  confidence: Confidence;
  /** How many observations fed the score (drives confidence + transparency). */
  observations: number;
  /** The largest contributor to the score being low, if any. */
  topDriver?: string;
}

export interface SviTrend {
  available: boolean;
  /** Current vs ~4 weeks prior, with a ±3-pt deadband. */
  direction: "improving" | "flat" | "deteriorating";
  /** Composite points changed over the compared window (signed). */
  deltaPoints: number;
  /** Consecutive trailing weeks the composite has fallen. */
  consecutiveDown: number;
}

export interface ProjectSVI {
  composite: number;
  band: BandMeta;
  confidence: Confidence;
  subs: Record<SviDimension, SviSubScore>;
  weakest: SviDimension;
  trend: SviTrend;
  /** Deterministic plain-language read on what's degrading. */
  concern: string;
  /** Deterministic recommended leadership action. */
  action: string;
}

// --- Input shapes (produced by the loader) ----------------------------------

export interface DecisionInput {
  createdAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
  impact: "low" | "medium" | "high";
  blocking: boolean;
  /** Was this decision/action reopened after being resolved? (from AuditLog) */
  reopened: boolean;
}

export interface ProblemEvent {
  at: Date;
  /** Cause/category bucket (replan reason, quality slip reason, or "rework"). */
  category: string;
  /** Net days a committed date was pushed (0 for non-date events). */
  deltaDays: number;
  /** Grouping id for churn (milestone id); null when not date-bound. */
  groupId: string | null;
  kind: "replan" | "rework" | "quality";
}

export interface InfoItem {
  /** When this coordination input was last meaningfully updated. */
  updatedAt: Date;
  /** Staleness half-life in days — item scores 50 at one threshold, 25 at two. */
  thresholdDays: number;
  /** Relative importance (decision-critical inputs weigh more). */
  weight: number;
}

export interface AdverseEvent {
  at: Date;
  /** Magnitude proxy (days slipped, min 1) so trivia can't dominate. */
  severity: number;
  /** Was the project flagged at_risk/blocked BEFORE this event surfaced? */
  preFlagged: boolean;
}

export interface SviSnapshotPoint {
  weekStart: Date;
  composite: number;
}

// --- Small helpers ----------------------------------------------------------

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);
const round1 = (x: number) => Math.round(x * 10) / 10;

const RECENT_WINDOW_DAYS = 28;

/** Confidence from how much evidence we have; `cap` keeps beta dims modest. */
export function confidenceFor(observations: number, cap?: Confidence): Confidence {
  let level: Confidence = observations >= 12 ? "high" : observations >= 4 ? "moderate" : "low";
  if (cap === "moderate" && level === "high") level = "moderate";
  return level;
}

/**
 * Compose a sub-score from weighted penalty ratios plus chronicity and
 * recent-deterioration adjustments. `penalties` weights should sum to 1.
 */
function compose(
  weightedPenalty: number,
  chronicRatio: number,
  deterioration: number
): number {
  let s = 100 * (1 - clamp01(weightedPenalty));
  s -= clamp(15 * clamp01(chronicRatio), 0, 15);
  s -= clamp(10 * clamp01(deterioration), 0, 10);
  return round1(clamp(s, 0, 100));
}

/** Bad-rate among recent vs prior items; positive = getting worse. */
function deteriorationOf(
  items: { at: Date; bad: boolean }[],
  now: Date
): number {
  const recent = items.filter((i) => dayDelta(now, i.at) <= RECENT_WINDOW_DAYS);
  const prior = items.filter((i) => dayDelta(now, i.at) > RECENT_WINDOW_DAYS);
  if (recent.length === 0 || prior.length === 0) return 0;
  const rate = (xs: { bad: boolean }[]) => xs.filter((x) => x.bad).length / xs.length;
  return clamp01(rate(recent) - rate(prior));
}

// --- Dimension scorers ------------------------------------------------------

const TARGET_CYCLE_DAYS = 14;
const IMPACT_WEIGHT: Record<DecisionInput["impact"], number> = { low: 1, medium: 2, high: 3 };

/** Decision Speed — how fast decisions/actions clear, weighted by impact. */
export function scoreDecisionSpeed(items: DecisionInput[], now: Date = todayUTC()): SviSubScore {
  const observations = items.length;
  if (observations === 0) {
    return { key: "decisionSpeed", score: 90, confidence: "low", observations: 0 };
  }

  let wSum = 0;
  let latSum = 0;
  for (const it of items) {
    const w = IMPACT_WEIGHT[it.impact];
    wSum += w;
    let frac = 0;
    if (it.completedAt) {
      const cycle = dayDelta(it.completedAt, it.createdAt);
      frac = clamp01((cycle - TARGET_CYCLE_DAYS) / (TARGET_CYCLE_DAYS * 2));
    } else if (it.dueDate && dayDelta(now, it.dueDate) > 0) {
      frac = clamp01(dayDelta(now, it.dueDate) / (TARGET_CYCLE_DAYS * 2));
    }
    latSum += w * frac;
  }
  const pLatency = wSum ? latSum / wSum : 0;

  const open = items.filter((i) => !i.completedAt);
  const isOverdue = (i: DecisionInput) => !!i.dueDate && dayDelta(now, i.dueDate) > 0;
  const pOverdue = open.length ? open.filter(isOverdue).length / open.length : 0;

  const blocking = open.filter((i) => i.blocking);
  const pBlocking = blocking.length ? blocking.filter(isOverdue).length / blocking.length : 0;

  const pReopen = items.filter((i) => i.reopened).length / observations;

  const weightedPenalty = 0.45 * pLatency + 0.25 * pOverdue + 0.2 * pBlocking + 0.1 * pReopen;

  // Chronic: completed decisions that took far longer than target.
  const completed = items.filter((i) => i.completedAt);
  const chronicRatio = completed.length
    ? completed.filter((i) => dayDelta(i.completedAt as Date, i.createdAt) > TARGET_CYCLE_DAYS * 2).length /
      completed.length
    : 0;

  const deterioration = deteriorationOf(
    completed.map((i) => ({
      at: i.completedAt as Date,
      bad: dayDelta(i.completedAt as Date, i.createdAt) > TARGET_CYCLE_DAYS,
    })),
    now
  );

  const drivers: [number, string][] = [
    [pLatency, "slow decision cycle times"],
    [pOverdue, "open decisions past due"],
    [pBlocking, "blocking decisions unresolved"],
    [pReopen, "decisions reopened after closing"],
  ];
  const topDriver = drivers.sort((a, b) => b[0] - a[0])[0];

  return {
    key: "decisionSpeed",
    score: compose(weightedPenalty, chronicRatio, deterioration),
    confidence: confidenceFor(observations),
    observations,
    topDriver: topDriver[0] > 0.05 ? topDriver[1] : undefined,
  };
}

/** Repeat Problems — recurrence/concentration of failures (common-cause). */
export function scoreRepeatProblems(events: ProblemEvent[], now: Date = todayUTC()): SviSubScore {
  const observations = events.length;
  if (observations === 0) {
    return { key: "repeatProblems", score: 88, confidence: "low", observations: 0 };
  }

  // Category recurrence: share of events in categories that appear ≥2×.
  const byCat = new Map<string, number>();
  for (const e of events) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1);
  const recurringCount = events.filter((e) => (byCat.get(e.category) ?? 0) >= 2).length;
  const pRepeat = recurringCount / observations;

  // Churn: among milestones that slipped, share that slipped ≥2×.
  const replanGroups = new Map<string, number>();
  for (const e of events) {
    if (e.kind === "replan" && e.groupId) {
      replanGroups.set(e.groupId, (replanGroups.get(e.groupId) ?? 0) + 1);
    }
  }
  const groups = [...replanGroups.values()];
  const pChurn = groups.length ? groups.filter((n) => n >= 2).length / groups.length : 0;

  // Concentration: how dominant the single biggest category is.
  const topCat = Math.max(...byCat.values());
  const pConcentration = topCat / observations;

  // Rework: explicit reopen/rework events.
  const pRework = events.filter((e) => e.kind === "rework").length / observations;

  const weightedPenalty = 0.35 * pRepeat + 0.3 * pChurn + 0.2 * pConcentration + 0.15 * pRework;

  // Chronic: a single category accounting for the bulk of all problems.
  const chronicRatio = clamp01((pConcentration - 0.5) * 2);

  const deterioration = deteriorationOf(
    events.map((e) => ({ at: e.at, bad: (byCat.get(e.category) ?? 0) >= 2 })),
    now
  );

  const topCategory = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    key: "repeatProblems",
    score: compose(weightedPenalty, chronicRatio, deterioration),
    confidence: confidenceFor(observations),
    observations,
    topDriver: topCategory && topCategory[1] >= 2 ? `recurring "${topCategory[0]}" failures` : undefined,
  };
}

/** Info Freshness — half-life decay of decision-critical coordination inputs. */
export function scoreInfoFreshness(items: InfoItem[], now: Date = todayUTC()): SviSubScore {
  const observations = items.length;
  if (observations === 0) {
    return { key: "infoFreshness", score: 85, confidence: "low", observations: 0 };
  }

  let wSum = 0;
  let sSum = 0;
  let stale = 0;
  for (const it of items) {
    const age = Math.max(0, dayDelta(now, it.updatedAt));
    const itemScore = 100 * Math.pow(0.5, age / it.thresholdDays);
    sSum += it.weight * itemScore;
    wSum += it.weight;
    if (age > it.thresholdDays * 2) stale += 1;
  }
  const base = wSum ? sSum / wSum : 100;
  const chronicRatio = stale / observations;
  const score = round1(clamp(base - 15 * clamp01(chronicRatio), 0, 100));

  return {
    key: "infoFreshness",
    score,
    confidence: confidenceFor(observations),
    observations,
    topDriver: chronicRatio > 0 ? "stale coordination inputs" : undefined,
  };
}

/** Early Warning — were adverse events surfaced before they bit? (beta) */
export function scoreEarlyWarning(events: AdverseEvent[], now: Date = todayUTC()): SviSubScore {
  const observations = events.length;
  if (observations === 0) {
    // Capped confidence: this dimension is a proxy until structured surfacing lands.
    return { key: "earlyWarning", score: 80, confidence: "low", observations: 0 };
  }

  let sevSum = 0;
  let earlySum = 0;
  for (const e of events) {
    const sev = Math.max(1, e.severity);
    sevSum += sev;
    if (e.preFlagged) earlySum += sev;
  }
  const earlyRatio = sevSum ? earlySum / sevSum : 1;
  const base = 100 * earlyRatio;

  const deterioration = deteriorationOf(
    events.map((e) => ({ at: e.at, bad: !e.preFlagged })),
    now
  );

  const score = round1(clamp(base - 10 * clamp01(deterioration), 0, 100));
  const lateSurprises = events.filter((e) => !e.preFlagged).length;

  return {
    key: "earlyWarning",
    score,
    confidence: confidenceFor(observations, "moderate"),
    observations,
    topDriver: lateSurprises > 0 ? "slips that surfaced as late surprises" : undefined,
  };
}

// --- Trend ------------------------------------------------------------------

export function trendOf(snapshots: SviSnapshotPoint[]): SviTrend {
  const pts = [...snapshots].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  if (pts.length < 2) {
    return { available: false, direction: "flat", deltaPoints: 0, consecutiveDown: 0 };
  }
  const current = pts[pts.length - 1];
  // Compare against the point ~4 weeks back (or the earliest we have).
  const prior = pts[Math.max(0, pts.length - 5)];
  const delta = round1(current.composite - prior.composite);
  const direction = delta > 3 ? "improving" : delta < -3 ? "deteriorating" : "flat";

  let consecutiveDown = 0;
  for (let i = pts.length - 1; i > 0; i--) {
    if (pts[i].composite < pts[i - 1].composite) consecutiveDown += 1;
    else break;
  }

  return { available: true, direction, deltaPoints: delta, consecutiveDown };
}

// --- Composite + narrative --------------------------------------------------

/** Most conservative confidence across the four dimensions. */
function overallConfidence(subs: Record<SviDimension, SviSubScore>): Confidence {
  const rank: Record<Confidence, number> = { low: 0, moderate: 1, high: 2 };
  let worst: Confidence = "high";
  for (const k of DIMENSION_ORDER) {
    if (rank[subs[k].confidence] < rank[worst]) worst = subs[k].confidence;
  }
  return worst;
}

/** Deterministic concern + action keyed on the weakest dimension and band. */
function narrative(
  weakest: SviDimension,
  weakestScore: number,
  band: BandMeta,
  topDriver: string | undefined
): { concern: string; action: string } {
  const meta = DIMENSIONS[weakest];
  const driver = topDriver ? ` — driven by ${topDriver}` : "";
  const CONCERN: Record<SviDimension, string> = {
    decisionSpeed: `Decisions are clearing too slowly${driver}; alignment velocity is the binding constraint.`,
    repeatProblems: `The same failures keep recurring${driver}; this looks structural (common-cause), not one-off.`,
    infoFreshness: `Coordination inputs are going stale${driver}; the team may be steering on old information.`,
    earlyWarning: `Problems are surfacing late${driver}; risks aren't being raised before they bite.`,
  };
  const ACTION: Record<SviDimension, string> = {
    decisionSpeed: "Unblock the slowest open decisions and set a decision SLA with a clear owner.",
    repeatProblems: "Run a root-cause review on the recurring category and fix the process, not the symptom.",
    infoFreshness: "Refresh the stale critical artifacts and tighten the update cadence.",
    earlyWarning: "Make it safe to raise risks early; review why recent slips weren't flagged in advance.",
  };
  const concern =
    weakestScore >= 70
      ? `Healthy overall; ${meta.label.toLowerCase()} is the dimension to keep an eye on.`
      : CONCERN[weakest];
  const action = weakestScore >= 70 ? band.action : ACTION[weakest];
  return { concern, action };
}

export function composeSVI(
  subs: Record<SviDimension, SviSubScore>,
  snapshots: SviSnapshotPoint[] = []
): ProjectSVI {
  let composite = 0;
  for (const k of DIMENSION_ORDER) composite += DIMENSIONS[k].weight * subs[k].score;

  // The single MVP interaction penalty: slow decisions + late warnings compound.
  const ds = subs.decisionSpeed.score;
  const ew = subs.earlyWarning.score;
  if (ds < 50 && ew < 50) {
    composite -= 8 * ((50 - ds) / 50) * ((50 - ew) / 50);
  }
  composite = round1(clamp(composite, 0, 100));

  const weakest = DIMENSION_ORDER.reduce((a, b) => (subs[b].score < subs[a].score ? b : a));
  const band = bandFor(composite);
  const { concern, action } = narrative(weakest, subs[weakest].score, band, subs[weakest].topDriver);

  return {
    composite,
    band,
    confidence: overallConfidence(subs),
    subs,
    weakest,
    trend: trendOf(snapshots),
    concern,
    action,
  };
}

/*
 * Pure-engine tests for the SVI scoring math. No test framework — run with
 * `npm run test:svi` (tsx). Uses node:assert; throws on first failure.
 */
import assert from "node:assert/strict";
import {
  scoreDecisionSpeed,
  scoreRepeatProblems,
  scoreInfoFreshness,
  scoreEarlyWarning,
  composeSVI,
  bandFor,
  confidenceFor,
  trendOf,
  DIMENSION_ORDER,
  type DecisionInput,
  type ProblemEvent,
  type InfoItem,
  type AdverseEvent,
  type SviSubScore,
  type SviDimension,
} from "./svi";

const DAY = 86_400_000;
const NOW = new Date(Date.UTC(2026, 0, 1));
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// --- Empty data: benign score + low confidence, never NaN -------------------
check("empty inputs → benign score, low confidence, no NaN", () => {
  const subs = {
    decisionSpeed: scoreDecisionSpeed([], NOW),
    repeatProblems: scoreRepeatProblems([], NOW),
    infoFreshness: scoreInfoFreshness([], NOW),
    earlyWarning: scoreEarlyWarning([], NOW),
  };
  for (const k of DIMENSION_ORDER) {
    assert.ok(!Number.isNaN(subs[k].score), `${k} not NaN`);
    assert.ok(subs[k].score >= 75, `${k} benign default`);
    assert.equal(subs[k].confidence, "low");
    assert.equal(subs[k].observations, 0);
  }
  const svi = composeSVI(subs);
  assert.ok(svi.composite >= 75 && svi.composite <= 100);
  assert.equal(svi.confidence, "low");
});

// --- Decision Speed --------------------------------------------------------
check("decision speed: fast closes score high, chronic slow scores low", () => {
  const fast: DecisionInput[] = Array.from({ length: 12 }, (_, i) => ({
    createdAt: daysAgo(20 + i),
    dueDate: daysAgo(15 + i),
    completedAt: daysAgo(18 + i), // ~2-day cycle
    impact: "medium",
    blocking: false,
    reopened: false,
  }));
  const slow: DecisionInput[] = Array.from({ length: 12 }, (_, i) => ({
    createdAt: daysAgo(60 + i),
    dueDate: daysAgo(50 + i),
    completedAt: daysAgo(10 + i), // ~50-day cycle, far past target
    impact: "high",
    blocking: true,
    reopened: true,
  }));
  const fastScore = scoreDecisionSpeed(fast, NOW);
  const slowScore = scoreDecisionSpeed(slow, NOW);
  assert.ok(fastScore.score > 80, `fast ${fastScore.score}`);
  assert.ok(slowScore.score < 40, `slow ${slowScore.score}`);
  assert.equal(fastScore.confidence, "high");
  assert.ok(slowScore.topDriver, "slow has a driver");
});

check("decision speed: open overdue blocking item penalized", () => {
  const items: DecisionInput[] = [
    { createdAt: daysAgo(30), dueDate: daysAgo(20), completedAt: null, impact: "high", blocking: true, reopened: false },
  ];
  const s = scoreDecisionSpeed(items, NOW);
  assert.ok(s.score < 70, `overdue blocking ${s.score}`);
});

// --- Repeat Problems -------------------------------------------------------
check("repeat problems: recurring category drags score down", () => {
  const recurring: ProblemEvent[] = Array.from({ length: 8 }, (_, i) => ({
    at: daysAgo(10 + i * 5),
    category: "estimate",
    deltaDays: 5,
    groupId: `m${i % 2}`, // two milestones, each slips repeatedly
    kind: "replan",
  }));
  const varied: ProblemEvent[] = [
    { at: daysAgo(10), category: "scope", deltaDays: 3, groupId: "a", kind: "replan" },
    { at: daysAgo(40), category: "external", deltaDays: 2, groupId: "b", kind: "replan" },
  ];
  const r = scoreRepeatProblems(recurring, NOW);
  const v = scoreRepeatProblems(varied, NOW);
  assert.ok(r.score < v.score, `recurring ${r.score} < varied ${v.score}`);
  assert.ok(r.topDriver?.includes("estimate"));
});

// --- Info Freshness (half-life) --------------------------------------------
check("info freshness: fresh→~100, one-half-life→~50, chronic stale→low", () => {
  const fresh: InfoItem[] = [{ updatedAt: NOW, thresholdDays: 7, weight: 1 }];
  const half: InfoItem[] = [{ updatedAt: daysAgo(7), thresholdDays: 7, weight: 1 }];
  assert.ok(scoreInfoFreshness(fresh, NOW).score > 95);
  assert.ok(Math.abs(scoreInfoFreshness(half, NOW).score - 50) < 1);
  const stale: InfoItem[] = Array.from({ length: 4 }, () => ({ updatedAt: daysAgo(40), thresholdDays: 7, weight: 1 }));
  assert.ok(scoreInfoFreshness(stale, NOW).score < 20);
});

// --- Early Warning ---------------------------------------------------------
check("early warning: pre-flagged slips score high, surprises score low", () => {
  const flagged: AdverseEvent[] = Array.from({ length: 6 }, () => ({ at: daysAgo(20), severity: 5, preFlagged: true }));
  const surprises: AdverseEvent[] = Array.from({ length: 6 }, () => ({ at: daysAgo(20), severity: 5, preFlagged: false }));
  assert.ok(scoreEarlyWarning(flagged, NOW).score > 90);
  assert.ok(scoreEarlyWarning(surprises, NOW).score < 20);
  // Beta: confidence capped at moderate even with plenty of observations.
  const many: AdverseEvent[] = Array.from({ length: 20 }, () => ({ at: daysAgo(20), severity: 3, preFlagged: true }));
  assert.equal(scoreEarlyWarning(many, NOW).confidence, "moderate");
});

check("early warning: severity weighting — big slip surprise hurts more than trivia", () => {
  const bigSurprise: AdverseEvent[] = [
    { at: daysAgo(10), severity: 30, preFlagged: false },
    { at: daysAgo(10), severity: 1, preFlagged: true },
  ];
  const trivialSurprise: AdverseEvent[] = [
    { at: daysAgo(10), severity: 1, preFlagged: false },
    { at: daysAgo(10), severity: 30, preFlagged: true },
  ];
  assert.ok(scoreEarlyWarning(bigSurprise, NOW).score < scoreEarlyWarning(trivialSurprise, NOW).score);
});

// --- Composite, bands, interaction -----------------------------------------
const sub = (key: SviDimension, score: number): SviSubScore => ({
  key,
  score,
  confidence: "high",
  observations: 20,
});

check("composite: weighted average of sub-scores", () => {
  const svi = composeSVI({
    decisionSpeed: sub("decisionSpeed", 80),
    repeatProblems: sub("repeatProblems", 80),
    infoFreshness: sub("infoFreshness", 80),
    earlyWarning: sub("earlyWarning", 80),
  });
  assert.equal(svi.composite, 80);
});

check("interaction penalty fires only when DS<50 AND EW<50", () => {
  const withPenalty = composeSVI({
    decisionSpeed: sub("decisionSpeed", 30),
    repeatProblems: sub("repeatProblems", 90),
    infoFreshness: sub("infoFreshness", 90),
    earlyWarning: sub("earlyWarning", 30),
  });
  const noPenalty = composeSVI({
    decisionSpeed: sub("decisionSpeed", 30),
    repeatProblems: sub("repeatProblems", 90),
    infoFreshness: sub("infoFreshness", 90),
    earlyWarning: sub("earlyWarning", 60), // EW not below 50
  });
  // Base before penalty for the first: .25*30+.3*90+.2*90+.25*30 = 60
  assert.ok(withPenalty.composite < 60, `penalized ${withPenalty.composite}`);
  // Second has no penalty; its raw weighted avg should be intact.
  assert.equal(noPenalty.composite, round1(0.25 * 30 + 0.3 * 90 + 0.2 * 90 + 0.25 * 60));
});

check("bands map to the right labels", () => {
  assert.equal(bandFor(92).label, "Strong Vitality");
  assert.equal(bandFor(75).label, "Stable but Watch");
  assert.equal(bandFor(60).label, "Fragile");
  assert.equal(bandFor(45).label, "At Risk");
  assert.equal(bandFor(20).label, "Critical");
});

check("weakest dimension + narrative are identified", () => {
  const svi = composeSVI({
    decisionSpeed: sub("decisionSpeed", 90),
    repeatProblems: { ...sub("repeatProblems", 25), topDriver: 'recurring "estimate" failures' },
    infoFreshness: sub("infoFreshness", 90),
    earlyWarning: sub("earlyWarning", 90),
  });
  assert.equal(svi.weakest, "repeatProblems");
  assert.ok(svi.concern.length > 0 && svi.action.length > 0);
});

// --- Confidence + trend ----------------------------------------------------
check("confidence thresholds", () => {
  assert.equal(confidenceFor(20), "high");
  assert.equal(confidenceFor(5), "moderate");
  assert.equal(confidenceFor(1), "low");
  assert.equal(confidenceFor(20, "moderate"), "moderate");
});

check("trend: deadband, direction, consecutive-down", () => {
  assert.equal(trendOf([]).available, false);
  const down = trendOf([
    { weekStart: daysAgo(28), composite: 80 },
    { weekStart: daysAgo(21), composite: 76 },
    { weekStart: daysAgo(14), composite: 70 },
    { weekStart: daysAgo(7), composite: 64 },
    { weekStart: NOW, composite: 60 },
  ]);
  assert.equal(down.direction, "deteriorating");
  assert.equal(down.consecutiveDown, 4);
  const flat = trendOf([
    { weekStart: daysAgo(7), composite: 70 },
    { weekStart: NOW, composite: 71 },
  ]);
  assert.equal(flat.direction, "flat");
});

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

console.log(`\n${passed} SVI checks passed.`);

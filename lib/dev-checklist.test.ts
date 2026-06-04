/*
 * Pure-logic tests for the manufacturing-development checklist summary.
 * Run with `npm run test:checklist` (tsx). Uses node:assert.
 */
import assert from "node:assert/strict";
import { summarizeChecklist, DEV_CHECKLIST_TEMPLATE, type DevSummaryInput } from "./dev-checklist";

const TODAY = "2026-06-04";
let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check("empty checklist → zeroed summary, no current phase", () => {
  const s = summarizeChecklist([], TODAY);
  assert.equal(s.total, 0);
  assert.equal(s.completed, 0);
  assert.equal(s.pct, 0);
  assert.equal(s.currentPhase, null);
  assert.equal(s.overdue, 0);
  assert.deepEqual(s.byPhase, []);
});

check("overall + per-phase percentages", () => {
  const tasks: DevSummaryInput[] = [
    { phase: 1, complete: true, targetIso: null },
    { phase: 1, complete: true, targetIso: null },
    { phase: 2, complete: false, targetIso: null },
    { phase: 2, complete: false, targetIso: null },
  ];
  const s = summarizeChecklist(tasks, TODAY);
  assert.equal(s.total, 4);
  assert.equal(s.completed, 2);
  assert.equal(s.pct, 50);
  assert.equal(s.byPhase.find((p) => p.phase === 1)?.pct, 100);
  assert.equal(s.byPhase.find((p) => p.phase === 2)?.pct, 0);
});

check("current phase = lowest phase with an incomplete task", () => {
  const tasks: DevSummaryInput[] = [
    { phase: 1, complete: true, targetIso: null },
    { phase: 2, complete: false, targetIso: null },
    { phase: 3, complete: false, targetIso: null },
  ];
  assert.equal(summarizeChecklist(tasks, TODAY).currentPhase, 2);
});

check("all complete → current phase null", () => {
  const tasks: DevSummaryInput[] = [
    { phase: 1, complete: true, targetIso: null },
    { phase: 2, complete: true, targetIso: null },
  ];
  const s = summarizeChecklist(tasks, TODAY);
  assert.equal(s.currentPhase, null);
  assert.equal(s.pct, 100);
});

check("overdue = incomplete with a past target; complete/no-date excluded", () => {
  const tasks: DevSummaryInput[] = [
    { phase: 1, complete: false, targetIso: "2026-06-01" }, // overdue
    { phase: 1, complete: false, targetIso: "2026-06-04" }, // due today, not overdue
    { phase: 1, complete: false, targetIso: "2026-12-01" }, // future
    { phase: 2, complete: true, targetIso: "2026-01-01" }, // complete, not overdue
    { phase: 2, complete: false, targetIso: null }, // no date
  ];
  assert.equal(summarizeChecklist(tasks, TODAY).overdue, 1);
});

check("template is well-formed: unique keys, 5 phases, departments valid", () => {
  const keys = DEV_CHECKLIST_TEMPLATE.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "keys are unique");
  const phases = new Set(DEV_CHECKLIST_TEMPLATE.map((t) => t.phase));
  assert.deepEqual([...phases].sort(), [1, 2, 3, 4, 5]);
  for (const t of DEV_CHECKLIST_TEMPLATE) {
    assert.ok(t.label && t.description, `${t.key} has label + description`);
    assert.ok(t.departments.length > 0, `${t.key} has a department`);
  }
});

console.log(`\n${passed} dev-checklist checks passed.`);

/*
 * Tests for the Issue Tracker import parser. Run via `npm run test:issues`.
 */
import assert from "node:assert/strict";
import { parseIssueImport } from "./issues-import";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check("invalid JSON → error", () => {
  const r = parseIssueImport("not json");
  assert.ok("error" in r);
});

check("empty payload → error", () => {
  const r = parseIssueImport(JSON.stringify({ parts: [] }));
  assert.ok("error" in r);
});

check("valid payload → parts, issues, nested challenges/actions", () => {
  const r = parseIssueImport(
    JSON.stringify({
      parts: [
        {
          name: "Housing",
          drawingNumber: "12345",
          cavities: 2,
          issues: [
            {
              title: "Char 14 position",
              status: "Awaiting Customer",
              challenges: [{ title: "Datum form", body: "Datum carries form error." }],
              actions: [{ body: "Measure steel", owner: "Brad", done: false }],
            },
          ],
        },
      ],
      crossCutting: [{ title: "Material cert missing", status: "open" }],
    })
  );
  assert.ok(!("error" in r));
  if ("error" in r) return;
  assert.equal(r.partCount, 1);
  assert.equal(r.issueCount, 2);
  const part = r.payload.parts[0];
  assert.equal(part.cavities, 2);
  assert.equal(part.issues[0].status, "awaiting_customer");
  assert.equal(part.issues[0].challenges.length, 1);
  assert.equal(part.issues[0].actions[0].owner, "Brad");
  assert.equal(r.payload.crossCutting[0].status, "open");
});

check("lenient: issues without a title are dropped; status defaults to open", () => {
  const r = parseIssueImport(
    JSON.stringify({ parts: [{ name: "P", issues: [{ synopsis: "no title" }, { title: "Real" }] }] })
  );
  assert.ok(!("error" in r));
  if ("error" in r) return;
  assert.equal(r.payload.parts[0].issues.length, 1);
  assert.equal(r.payload.parts[0].issues[0].status, "open");
});

check("part name falls back to drawing number", () => {
  const r = parseIssueImport(JSON.stringify({ parts: [{ drawingNumber: "99-1", issues: [{ title: "x" }] }] }));
  assert.ok(!("error" in r));
  if ("error" in r) return;
  assert.equal(r.payload.parts[0].name, "99-1");
});

console.log(`\n${passed} issues-import checks passed.`);

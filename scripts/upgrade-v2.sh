#!/usr/bin/env bash
set -euo pipefail

# Noble PM Command Center — one-shot v1 → v2 production upgrade.
#
# Run from a clean checkout with DATABASE_URL pointing at the production
# Postgres (locally with your .env values, or in a Railway shell):
#
#   DATABASE_URL="postgresql://..." bash scripts/upgrade-v2.sh
#
# What it does (see docs/v2-plan.md):
#   1. From the v2-transition commit: apply the ADDITIVE v2 schema, then
#      copy every JSON-blob's data into the typed v2 rows (idempotent,
#      previewed with a dry run + confirmation prompt).
#   2. From the branch you started on (main): apply the final schema,
#      which drops the now-empty legacy blob tables.
#
# Take a DB backup first if you want a belt with these suspenders —
# Railway: Database → Backups → Create backup.

TRANSITION=334c63327898517a5e8dd024ed26b07367539dac

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree has uncommitted changes — commit or stash first." >&2
  exit 1
fi

echo "Checking database connectivity (password never printed)…"
node -e '
const u = new URL(process.env.DATABASE_URL);
console.log(`  host=${u.hostname} port=${u.port || 5432} db=${u.pathname.slice(1)}`);
const s = require("net").connect({ host: u.hostname, port: Number(u.port || 5432), timeout: 8000 });
s.on("connect", () => { console.log("  reachable — proceeding."); s.end(); });
s.on("timeout", () => { console.error("  ERROR: connection timed out — is this the PUBLIC url (proxy.rlwy.net)?"); process.exit(1); });
s.on("error", (e) => { console.error("  ERROR:", e.message); process.exit(1); });
' || exit 1

ORIG_REF=$(git rev-parse --abbrev-ref HEAD)
if [ "$ORIG_REF" = "HEAD" ]; then
  ORIG_REF=$(git rev-parse HEAD)
fi

echo
echo "== Step 1/2 — additive schema + data migration (v2-transition) =="
git checkout -q "$TRANSITION"
npm install --no-audit --no-fund --loglevel=error
npx prisma db push
echo
npm run db:migrate-v2 -- --dry-run
echo
read -r -p "Proceed with the migration shown above? [y/N] " yn
if [ "${yn}" != "y" ] && [ "${yn}" != "Y" ]; then
  git checkout -q "$ORIG_REF"
  echo "Aborted — nothing was migrated; schema changes so far were additive only."
  exit 1
fi
npm run db:migrate-v2

echo
echo "== Step 2/2 — final schema (drops the legacy blob tables) =="
git checkout -q "$ORIG_REF"
npm install --no-audit --no-fund --loglevel=error
npx prisma db push --accept-data-loss

echo
echo "Done — production database is on the v2 schema ($ORIG_REF)."
echo "Spot-check: open /portfolio and a project page; risks, decisions,"
echo "notes and status narratives should all be present."

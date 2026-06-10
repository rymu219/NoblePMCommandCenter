# Noble PM Command Center

Lightweight project management for Noble Plastics. One place for project
templates, engineering time tracking, and an executive rollup — so plans
stop getting buried in folders.

## Status

**v0 — Template scaffold.** Next.js + Tailwind v4. Brand tokens, fonts,
and a static reproduction of the E-Delta Canister project template prove
the look matches the source HTML. Prisma schema is in place but not yet
migrated.

See `/root/.claude/plans/i-need-to-make-dynamic-mango.md` for the full
plan, phases, and the deferred-from-v1 list.

**v2 — current.** Simpler, more visual, one screen per persona: Portfolio
(executives), Department (dept heads), My Work (engineers), and an
inline-editable project page (PM). All rollup views are derived — nothing
hand-maintained. Roadmap and the **production upgrade runbook (required
before deploying over a v1 database)** live in
[`docs/v2-plan.md`](docs/v2-plan.md).

## Running locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Pages wired in v0:

- `/` — Dashboard rollup across sample projects.
- `/projects` — All projects list.
- `/projects/501-001` — E-Delta Canister — Part Requalification template
  (the visual reference).
- `/programs` and `/programs/:prefix` — Program rollups.
- `/my-week` — Daily time-tracking grid mirroring the spreadsheet
  (pre-filled with the Jan 5 week from the screenshot).
- `/meetings`, `/admin` — placeholders for v2/v3.

## Brand

Tokens are locked in `app/globals.css`:

- Primary: `#cf202f` (red), `#ffcf01` (gold), `#111921` (near-black).
- Supplementary neutrals + brick.
- Marketing fonts: Montserrat (Museo Sans fallback), Zilla Slab (Yorkten
  Slab fallback). Wordmark fonts (Forza Black, Museo Sans 900) are
  reserved for the logo per the brand guidelines and are NOT used in the
  UI.

Replace `components/noble-logo.tsx` with the official approved SVG from
the Noble Plastics Logo Package before any external use.

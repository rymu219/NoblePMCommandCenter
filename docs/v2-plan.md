# V2 — Simpler, more visual rebuild

Why: the v1 app grew to ~31 models, 8 nav destinations, 40+ write paths and
12 hand-built modal editors. Updating one project means touching five
separate surfaces (admin meta, dashboard meta/phases/budget, section blobs,
board milestones, status editor) that don't sync. V2 collapses it around
four personas and one editing surface.

## Personas → screens

| Persona | Screen | Content |
|---|---|---|
| Executive | **Portfolio** | Health-colored project cards, portfolio timeline (all milestones), budget burn bars. Read-only, fully derived. |
| Department head | **Department** | Their projects, their people's hours, their open action items. Scoped by `User.department`. Read-only, fully derived. |
| Engineer | **My Work** | Time grid (my-week) + their subtasks, merged on one page. |
| PM (admin) | **Project detail** | The single editing surface: timeline, milestones, health, budget, risks, decisions, notes — all inline click-to-edit. |

Nav shrinks to: Portfolio · Projects · My Work · Admin.

## Data-model principles

- One schedule entity: **Milestone** (with `phase` group label + `dept`
  color) plus coarse **Phase** rows drive every timeline visual. The
  hand-drawn gantt blobs and the dead `GanttTask` model go away.
- One health signal: **`ProjectRow.health`** (`on_track | at_risk |
  off_track`). Everything that shows a health pill reads this.
- Typed rows instead of JSON blobs: **Risk**, **Decision**,
  **ProductionRun**, `ProjectRow.notes`, `StatusUpdate.narrative`.
- Derived, never hand-entered: summary cards (from budget/milestones),
  hours-by-role (from TimeEntry), every rollup view.
- Keep what earns its keep: MilestoneReplan slip reasons, TimeEntry/
  PeriodClose, DevTask checklist, Issue tracker, QualityInspection.

## Phases

- [x] **Phase 1 — schema + migration** (this commit)
  - Additive v2 models/fields: `Risk`, `Decision`, `ProductionRun`;
    `ProjectRow.health`, `ProjectRow.notes`; `Milestone.phase`,
    `Milestone.dept`; `StatusUpdate.narrative`.
  - Deprecation markers on: `ProjectSection`, `GanttTask`, `Meeting`,
    `TranscriptProposal`, `SviSnapshot`, `ProjectRow.dashboardHealth`,
    `StatusUpdate.blocks`.
  - `prisma/migrate-v2.ts` — idempotent blob → row migration, `--dry-run`
    supported. Old models/UI keep working through the transition.
- [ ] **Phase 2 — unified project detail page**
  - One page per project: health, narrative, milestone timeline (renders
    Milestone + Phase), budget bar, risks, decisions, runs, notes.
  - Inline click-to-edit everywhere; no edit-mode modals. Writes go to the
    typed v2 rows only.
- [ ] **Phase 3 — derived persona views**
  - Portfolio (exec), Department (dept heads), My Work (engineers, merges
    my-week + board subtasks). All read-only projections; nav collapses.
- [ ] **Phase 4 — deletion**
  - Drop deprecated models/fields from the schema; delete old pages
    (daily report editors, section editors, execution/SVI, meetings),
    loaders and actions they used. Re-point reports/archive at v2 data or
    retire it.

## Migration runbook (production)

```bash
npm run db:push                    # apply v2 schema (additive — safe)
npm run db:migrate-v2 -- --dry-run # preview what will be copied
npm run db:migrate-v2              # copy blob data into v2 rows
```

Caveat during the transition: the old section editors still write to the
JSON blobs, not the v2 rows. After running the migration, treat the old
risks/decisions/parts/notes editors as read-only (re-running the migration
will NOT re-copy projects that already have v2 rows).

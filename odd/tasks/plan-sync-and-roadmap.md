# Feature: Plan Sync & Roadmap

> Goal: reconcile `khipu-codex-plan.md` with the code as it actually is, mark what is
> already implemented, and give the project a real forward roadmap if none exists.

## Why

`khipu-codex-plan.md` is frozen at v0.4.0 (2026-08-25). The repo has moved well past it:
Fases 1A–6 are archived in `openspec/changes/archive/`, plus security B/C/D and
`worker-race-recovery` are active. The plan still lists Fase 4 (AnnotationLayer) and
Fase 3 (modules) as pending work that already shipped, so it actively misleads planning.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Verify every plan claim against the code (delegated scouts) | done | — |
| 2 | Rewrite `khipu-codex-plan.md`: mark verified-done phases, correct stale debt table, record post-v0.4.0 work | done | uncommitted — awaiting user |
| 3 | Create `ROADMAP.md` if no forward roadmap exists, sourced from active openspec changes + verified debt | done | uncommitted — awaiting user |
| 4 | Report to user: state reconciled, open items, next recommended step | done | — |

## Deliverables

- `khipu-codex-plan.md` — Fases 1A–6 marked with verified evidence (path:line), stale debt table
  corrected, v0.4.1 post-plan work recorded, unplanned-but-shipped work listed.
- `ROADMAP.md` (new) — big picture: P1 close-open-work, P2 known debt, P3 uncommitted backlog,
  plus the two rules it must obey from `AGENTS.md:10` / `AGENTS.md:91`.

## Open decisions for the user

**Resolved 2026-09-02 (user chose option B on both):**

1. **Spec de-merge** — `openspec/specs/worker-message-protocol/spec.md` was moved to
   `openspec/changes/worker-race-recovery/specs/worker-message-protocol/delta.md` and marked
   DRAFT / NO CANÓNICA. `openspec/specs/` now holds only `app-core` and `maintenance`.
   Git recorded it as a rename (`R`), not a delete+add.
2. **Task system** — `AGENTS.md:70` updated to point ai-todo at `odd/tasks/<feature-name>.md`.
   No `TODO.md` created.

**Still open:**

3. No commit was made (docs + rules change, `master` branch). Branch + Conventional Commit?
4. `openspec/config.yaml` is itself stale (describes the monolithic `app.js`, the portable
   `KhipuCodex.html` build, and a "Known debt" list that is entirely resolved). Same class of
   problem as the spec de-merge. Not touched — flagged only.

## Out of scope

- No source code changes.
- No implementation of pending roadmap items.

## Evidence log

- Repo: `S:/- maudev/Docx`, branch `master`, HEAD `cd8280c`
- `src/` = 18 modules; `app.js` deleted (commit `b5079ee`)
- `lib/marked.min.js` present
- `openspec/changes/archive/` = 13 archived changes incl. all of Fases 1A–6
- Active openspec changes: `security-b-tauri-capabilities`, `security-c-csp`,
  `security-d-svg-viewer`, `worker-race-recovery`

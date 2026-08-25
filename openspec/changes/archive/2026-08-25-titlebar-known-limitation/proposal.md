# Proposal: Titlebar — Known Limitation (wontfix)

## Intent
Document that a comprehensive custom titlebar redesign was evaluated and intentionally discarded for v0.4.0. Retain the current frameless/transparent titlebar with surgical drag-region fixes already shipped.

## Scope
### In Scope
- Record decision as `wontfix` / known limitation
- Keep existing `-webkit-app-region` surgical rules

### Out of Scope
- Any new titlebar component or rewrite

## Decision Rationale
- Current `transparent: true` + `decorations: false` + per-zone `-webkit-app-region: drag` with `data-no-drag` exclusions is stable and minimal.
- Full redesign would risk window controls and drag regressions before v0.4.0 without measurable UX gain.
- Future revisit possible if user requests specific titlebar features; no code deletion needed.

## Success Criteria
- [x] Titlebar remains as-is, documented as known limitation

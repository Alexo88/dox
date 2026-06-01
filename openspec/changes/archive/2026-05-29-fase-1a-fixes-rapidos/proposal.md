# Proposal: Fase 1A — Fixes rápidos

## Intent

Clean up technical debt and align project identity (naming, security, documentation) before proceeding with feature development.

## Scope

### In Scope
- `dx.bat`: Update error message from "DocxLite" to "Khipu Codex".
- `tauri.conf.json`: Remove `process: { all: true }` to reduce attack surface.
- `README.md`: Complete rewrite to reflect current name, features, and tech stack.
- `CHANGELOG.md`: Append v0.3.0 entry documenting audit fixes.
- `app.js`: Extract `saveMarkdownVersion()` to a separate module.

### Out of Scope
- Major architectural refactors.
- New feature implementation.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `app-core`: Improving internal maintainability by modularizing persistence logic.

## Approach

Direct file modification for configurations and documentation. For `app.js`, isolate `saveMarkdownVersion()` into a clean module file and import/export accordingly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `dx.bat` | Modified | Update UI string |
| `tauri.conf.json` | Modified | Security hardening |
| `README.md` | Modified | Project identity update |
| `CHANGELOG.md` | Modified | Record v0.3.0 |
| `app.js` | Modified | Extract persistence function |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Modularization breaks scope/imports | Low | Verify imports after extraction |
| Documentation inaccuracies | Low | Double-check against FEATURES.md |

## Rollback Plan

Perform `git checkout` to return to the current HEAD, discarding changes in the affected files.

## Dependencies

- None.

## Success Criteria

- [ ] Project builds and runs without error.
- [ ] Documentation correctly identifies project as "Khipu Codex".
- [ ] `saveMarkdownVersion` correctly persists files from the new module.

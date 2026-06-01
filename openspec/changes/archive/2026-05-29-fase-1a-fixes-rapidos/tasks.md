# Tasks: Fase 1A — Fixes rápidos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 5 fixes in one shot | PR 1 | Independent low-risk changes |

## Phase 1: Identity & Config Fixes

- [x] 1.1 **dx.bat** — Replace `DocxLite Launcher` → `Khipu Codex Launcher` (line 2) and `DocxLite.exe` → `Khipu Codex.exe` (line 23)
- [x] 1.2 **tauri.conf.json** — Remove `"process": { "all": true }` block (lines 11-13) from allowlist
- [x] 1.3 **README.md** — Full rewrite: title "Khipu Codex", updated features, stack (Tauri v1 + Rust), dual-mode (portable HTML + native), build instructions
- [x] 1.4 **CHANGELOG.md** — Prepend v0.3.0 entry before v0.2.0: security (process allowlist), UI (naming), icon, open-with, CSS fixes

## Phase 2: Code Reorganization

- [x] 2.1 **app.js** — Cut `saveMarkdownVersion()` function (lines 1397-1430) and insert after `inlineMarkdown` / `markdownToHtml` helpers (~new line 94), before `FileHandler` class

## Phase 3: Verification

- [ ] 3.1 **Manual** — Run `dx.bat`, verify Khipu Codex window opens (Tauri native)
- [ ] 3.2 **Manual** — Open `index.html` in browser (portable HTML mode)
- [ ] 3.3 **Manual** — Edit .md file, toggle edit/view, confirm localStorage `khipu-md:*` keys are created
- [ ] 3.4 **Manual** — Verify no `__TAURI__.process` in console; `get_open_args` works via `invoke`
- [ ] 3.5 **Visual** — Confirm README renders correctly, CHANGELOG shows v0.3.0 at top
- [ ] 3.6 **Bump** — Consider bumping `APP_VERSION` in `app.js` line 52 from `'0.2.0'` to `'0.3.0'` (open question per design)

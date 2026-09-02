# Tasks: Security C — CSP Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~10 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Template CSP — marker en `index.html`

- [x] 1.1 Insert `<!-- DOCXLITE:CSP_START -->` block in `<head>` (after viewport meta) with the shared CSP meta tag
- [x] 1.2 Verify no duplicate `<meta http-equiv="Content-Security-Policy">` exists anywhere

## Phase 2: Tauri config — `tauri.conf.json`

- [x] 2.1 Replace `security.csp` string: remove `'unsafe-eval'`, remove `blob:` from `img-src`, add `connect-src`, `font-src`, `frame-src`, `frame-ancestors`, `base-uri`, `form-action`, `object-src`
- [x] 2.2 Verify `'unsafe-eval'` is absent from the new policy

## Phase 3: Build & validate

- [x] 3.1 Run `node build.js` — confirm zero errors, zero warnings
- [x] 3.2 Verify `index.html` has the CSP marker block ✔
- [x] 3.3 Verify `public/index.html` (Tauri) has the CSP marker block ✔
- [x] 3.4 Verify `KhipuCodex.html` (portable) has the CSP marker block ✔
- [x] 3.5 Verify `build.js` unchanged (passive preservation) ✔

## Phase 4: Verify hardening

- [x] 4.8 Confirm `'unsafe-eval'` is absent from all 3 outputs + tauri.conf.json

## Phase 5: Final git hygiene

- [ ] 5.1 Commit contains ONLY `index.html`, `src-tauri/tauri.conf.json`, `KhipuCodex.html`, `public/index.html`
- [ ] 5.2 No build.js, no unrelated files in the diff
# Verify Report: Titlebar — Known Limitation / wontfix (2026-08-25)

## Summary
- **Status**: ⏭️ wontfix — documented as known limitation, no code change beyond surgical drag fixes already in v0.4.0
- **Reason**: Full titlebar redesign discarded intentionally to preserve stability; no deletion of existing functionality

## Verification
| Item | Evidence | Status |
|------|----------|--------|
| `index.html` titlebar retains `data-tauri-drag-region` + `data-no-drag` on interactive elements | `index.html:17,21,30-40,61-76,97-100` | ✅ |
| `style.css` drag-region rules: `#tabs-zone/#tabs-container/#search-zone/.topbar-actions/#window-controls { -webkit-app-region: drag }` with surgical `no-drag` for `button/input/tab/*[data-no-drag]` | `style.css:98-123` diff | ✅ |
| `src/window.js` dragging via `appWindow.startDragging()` on `titlebar.mousedown` excluding `button/input/tab/[data-no-drag]` | `src/window.js:42-51` | ✅ |
| No full rewrite committed | git status shows only surgical drag fixes, not a rewrite | ✅ |

## Decision
- Recorded as `wontfix` for v0.4.0. Revisit only on explicit user request.

## Related Archives
- Surgical drag fixes are verified as part of `2026-08-25-split-view` and icon/titlebar CSS changes, not as a separate titlebar feature.

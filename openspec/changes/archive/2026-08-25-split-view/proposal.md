# Proposal: Split View / Book Mode

## Intent
Compare two documents side-by-side (book mode) with independent virtual scrolling per panel, synchronized scroll, swap/close controls, keyboard shortcut, and drag-to-split.

## Scope
### In Scope
- `VirtualScrollerInstance` class instanciable (container param) with global `VirtualScroller` singleton
- `SplitManager` (isSplit, leftTabId/rightTabId, leftScroller/rightScroller, sync/swap/close)
- DOM split layout (`#split-viewer`, `#split-panel-left/right`, `#viewer-left/right`, `.split-divider`, `#split-drop-zone`)
- Toolbar (`#split-toolbar` with Sync/Swap/Close) + `Progress` feedback
- Shortcut `Ctrl+\` and drag-to-split (tab drag + file drop + right-edge hover + divider resize)
- Auto-maximize on split

### Out of Scope
- Annotation sync across panels
- Search across both panels simultaneously

## Capabilities
- Modified: `app-core` (split view, virtualScroller)

## Approach
- Refactor `scroller.js` to `class VirtualScrollerInstance` with `_getViewer()` / `_isContainerWindow()` container-aware, keep `const VirtualScroller = new VirtualScrollerInstance()` for single view
- `tabs.js` hosts `SplitManager` with sync listeners, divider mousemove, drop zone handlers, `openSplit/closeSplit/swap/toggleSplit`
- `index.html`/`style.css` add split DOM/CSS; `dom-refs.js` exposes refs; `keyboard.js` adds `Ctrl+\` handler; `build.js` unchanged (webview-only already)

## Risks
| Risk | Mitigation |
|------|------------|
| IntersectionObserver root incorrect for panels | Set `root: container` when not window |
| Recursive sync scroll | `_suppressScroll` guard + rAF |

## Success Criteria
- [x] VirtualScroller is class instanciable
- [x] SplitManager + DOM split verified
- [x] Ctrl+\, drag-to-split, sync/swap/close work

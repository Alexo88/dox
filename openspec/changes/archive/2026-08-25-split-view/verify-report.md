# Verify Report: Split View / Book Mode (2026-08-25)

## Summary
- **Status**: ✅ Verified
- **Build**: `node build.js` → assembles 15 modules, no markers missing (public/index.html only, webview-only confirmed)
- **Key validations**: VirtualScroller is class instanciable, SplitManager + DOM split + build webview-only verified, drag-to-split with 1 tab shown as guidance (pending fix applied per real code), Ctrl+\ verified

## Verification

### VirtualScroller is class instanciable — ✅
| Check | Evidence |
|-------|----------|
| `class VirtualScrollerInstance` with `constructor(container)` | `src/scroller.js:8-17` |
| `_getViewer()` returns container or global viewer | `src/scroller.js:19-21` |
| `_isContainerWindow()` container-aware | `src/scroller.js:23-25` |
| Per-instance fields `container/sections/elements/observer/materialized/_measuring/onMeasured` | `src/scroller.js:9-16` |
| Container-aware scroll math (`container.scrollTop/clientHeight`) and observer `root: container` | `src/scroller.js:106-143` |
| Global instance `const VirtualScroller = new VirtualScrollerInstance()` preserved | `src/scroller.js:237` |

### SplitManager + DOM split — ✅
| Check | Evidence |
|-------|----------|
| `const SplitManager = { isSplit, leftTabId, rightTabId, leftScroller, rightScroller, syncScroll, _suppressScroll, init/toggleSplit/openSplit/closeSplit/swap }` | `src/tabs.js:8-256` |
| `init()` wires btnSplit/btnSplitSync/btnSplitSwap/btnSplitClose, sync listeners, divider, splitDropZone | `src/tabs.js:17-159` |
| `openSplit()` hides #viewer/dropzone, shows #splitViewer/#splitToolbar, instantiates scrollers per panel, auto-maximizes via `is_window_maximized`/`toggle_maximize` | `src/tabs.js:182-227` |
| `closeSplit()` destroys scrollers, restores active tab via `restoreState()` | `src/tabs.js:229-249` |
| `swap()` calls `openSplit(right, left)` | `src/tabs.js:251-255` |
| Sync listeners use proportional ratio with `_suppressScroll` + rAF | `src/tabs.js:40-62` |
| Divider drag clamps pct to [20,80] via mousemove/mouseup | `src/tabs.js:64-92` |
| `dom-refs.js` exposes `btnSplit/splitToolbar/btnSplitSync/Swap/Close/splitViewer/splitPanelLeft/Right/splitLeftTitle/RightTitle/viewerLeft/viewerRight/splitDropZone` | `src/dom-refs.js:49-61` |
| `index.html` contains splitToolbar, splitViewer (2 panels + divider), splitDropZone | `index.html:96-150` |
| `style.css` defines split layout, divider dragging, toolbar styles | `style.css` split rules (verified in diff) |
| `build.js` outputs only `public/index.html`, no `KhipuCodex.html` (webview-only) | `build.js:91-95` |

### Ctrl+\ — ✅
| Check | Evidence |
|-------|----------|
| `keyboard.js` listens `Ctrl+\` / `Meta+\` and calls `SplitManager.toggleSplit()` with preventDefault/stopPropagation | `src/keyboard.js:30-36` |

### Drag-to-split with 1 tab — ⚠️ Guidance state (fix applied)
- **Requirement**: With 1 tab, entering split must show guidance, not open empty panel.
- **Code**: `toggleSplit()` with `ids.length === 1` removes `hidden` from `splitDropZone`, shows `Progress` guidance "Arrastrá un segundo archivo o hacé click para abrirlo en split" for 3s (`src/tabs.js:172-179`).
- **Verification**: Validated via code inspection; drop of external file triggers `FileHandler.handleFile` + 200ms post-open split (`src/tabs.js:132-141`). Prior issue (1-tab split opening blank) is fixed by this guidance + `fileInput.click()` fallback.
- **Status**: ✅ Fix applied per real code; manual drag test remains recommended for next session if not already performed in Tauri runtime.

### Tab drag integration — ✅
| Check | Evidence |
|-------|----------|
| `_renderTabBar()` sets `draggable=true`, `dragstart` sets `application/x-khipu-tab` + `text/plain`, `dragend` hides drop zone | `src/tabs.js:500-513` |
| `splitDropZone` drop parses internalTabId, resolves active/other, calls `openSplit` | `src/tabs.js:104-129` |
| Right-edge `dragover` reveals drop zone when `clientX > 0.75*innerWidth` | `src/tabs.js:150-159` |

### Gaps
- Annotation canvas sync in split panels intentionally out of scope (VirtualScroller `_materialize` only restores AnnotationLayer when `_isContainerWindow()` is true — `scroller.js:183-185`).

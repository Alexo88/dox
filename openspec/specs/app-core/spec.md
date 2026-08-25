# App-Core Specification

## Purpose

Core application capabilities for Khipu Codex: document viewing, tab management, split view, virtual scrolling, and single-instance window reuse. This spec is the authoritative merge for v0.4.0 (2026-08-25) and supersedes prior deltas for single-instance, split view, and icon updates. Distribution is 100% Tauri (EXE-only, `public/index.html` via `build.js`); no portable `KhipuCodex.html` is generated.

## Requirements

### Requirement: Modularize saveMarkdownVersion
The system MUST relocate `saveMarkdownVersion()` to a dedicated module or as a module-level function before init.

#### Scenario: Verify modularization
- GIVEN `app.js` source code (now `src/*.js` modules)
- WHEN the file is loaded
- THEN `saveMarkdownVersion()` MUST be defined before the `DOMContentLoaded` init section, and the app functionality MUST remain unchanged

### Requirement: Single-instance window reuse (tauri-plugin-single-instance)
When the app is already running, opening a file via OS ("Abrir con..." / double-click) MUST reuse the existing window instead of spawning a second instance. The Rust backend MUST register `tauri-plugin-single-instance` only when `open_mode` is `reuse`.

#### Scenario: Second launch reuses window and opens document
- GIVEN Khipu Codex is already running with `open_mode` = `reuse`
- WHEN the user opens a second file via Windows Explorer ("Abrir con...")
- THEN the existing window MUST be unminimized, shown, and focused
- AND the app MUST emit `single-instance-open` with `{ args, cwd }`
- AND the frontend MUST invoke `open_document_from_path` for the first non-flag arg and open it as a new tab

#### Scenario: Single-instance disabled when new_window mode
- GIVEN `settings.json` contains `{ "open_mode": "new_window" }` at startup
- WHEN the Tauri backend initializes
- THEN the `tauri-plugin-single-instance` plugin MUST NOT be registered

### Requirement: Open-mode toggle persisted in settings.json and localStorage
The system MUST provide a toggle between `reuse` (single instance, tabs) and `new_window` modes. The preference MUST be persisted to `settings.json` via `get_open_mode`/`set_open_mode` Rust commands and mirrored to `localStorage` (`khipu-open-mode`) as fallback.

#### Scenario: Toggle persists and survives restart
- GIVEN the titlebar button `btn-open-mode` is visible
- WHEN the user clicks it
- THEN the mode MUST flip between `reuse` and `new_window`
- AND `localStorage["khipu-open-mode"]` MUST be updated
- AND if Tauri is available `set_open_mode` MUST be invoked with the new mode
- AND on next launch `get_open_mode` (or `localStorage` fallback) MUST restore the same mode

#### Scenario: Settings file location
- GIVEN `APPDATA` is defined on Windows
- WHEN `get_settings_path()` is called
- THEN it MUST resolve to `%APPDATA%/com.maudev.khipucodex/settings.json`
- AND the directory MUST be created if it does not exist

### Requirement: VirtualScroller multi-instance support
The system MUST expose an instanciable `VirtualScrollerInstance` class that can be bound to any scroll container. A singleton `VirtualScroller` instance MUST remain bound to the primary `#viewer` (window). Split panels MUST use independent `VirtualScrollerInstance` instances.

#### Scenario: Class is instanciable with per-panel containers
- GIVEN `src/scroller.js` is loaded
- WHEN `new VirtualScrollerInstance(viewerLeft)` is called
- THEN the created instance MUST track its own `container`, `sections`, `elements`, `materialized` set, and `IntersectionObserver`
- AND `VirtualScroller` singleton MUST still exist and be a `VirtualScrollerInstance` bound to `#viewer`

#### Scenario: Container-aware virtualization
- GIVEN a `VirtualScrollerInstance` with `container = viewerLeft`
- WHEN `_isContainerWindow()` is evaluated
- THEN it MUST return `false` and `_getViewer()` MUST return that container
- AND scroll calculations (`scrollTop`, `clientHeight`) MUST use the container, not `window`

### Requirement: Split View / Book Mode (two-panel comparison)
The system MUST provide a split view that displays two documents side-by-side using `SplitManager` with two independent `VirtualScrollerInstance` panels (`viewerLeft` / `viewerRight`). Book mode refers to the two-panel comparison layout; each panel renders its own document sections and scrolls independently unless sync is enabled.

#### Scenario: Open split with two tabs
- GIVEN at least two tabs exist and `TabManager.activeTabId` is set
- WHEN `SplitManager.openSplit(leftId, rightId)` is called (via button or `toggleSplit`)
- THEN `SplitManager.isSplit` MUST become `true`
- AND `#viewer` and `#dropzone` MUST be hidden
- AND `#split-viewer` and `#split-toolbar` MUST be visible
- AND `leftScroller` and `rightScroller` MUST each be a `VirtualScrollerInstance` bound to `viewerLeft` / `viewerRight`
- AND each scroller MUST be initialized with the respective tab's `sections`
- AND `splitLeftTitle` / `splitRightTitle` MUST show the tab names
- AND if the window is not maximized, `is_window_maximized` + `toggle_maximize` MUST be invoked to maximize it

#### Scenario: Close split restores single viewer
- GIVEN split view is active
- WHEN `SplitManager.closeSplit()` is invoked (toolbar close or toggle)
- THEN both scrollers MUST be destroyed
- AND `#split-viewer` and `#split-toolbar` MUST be hidden
- AND the active tab MUST be restored via `TabManager.restoreState()`
- AND `VirtualScroller` singleton MUST be re-initialized with the active tab's sections

#### Scenario: Swap panels
- GIVEN split view is active with `leftTabId = A` and `rightTabId = B`
- WHEN `SplitManager.swap()` is invoked
- THEN the panels MUST re-open as `openSplit(B, A)`

#### Scenario: Sync scroll toggle
- GIVEN split view is active with `syncScroll = true`
- WHEN the user scrolls `viewerLeft`
- THEN `viewerRight.scrollTop` MUST be set proportionally (`ratio = leftTop / maxLeft`) without recursive feedback (`_suppressScroll`)
- AND toggling `btnSplitSync` MUST flip `syncScroll` and toggle its `active` class

### Requirement: Split View keyboard shortcut Ctrl+\
The system MUST toggle split view when the user presses `Ctrl+\` (or `Meta+\`).

#### Scenario: Keyboard shortcut toggles split
- GIVEN the document has focus
- WHEN `Ctrl+\` is pressed
- THEN `SplitManager.toggleSplit()` MUST be invoked
- AND `e.preventDefault()` and `e.stopPropagation()` MUST be called

### Requirement: Drag-to-split interaction
The system MUST allow opening split view by dragging a tab or a file to the lateral drop zone, and by hovering near the right edge to reveal the zone. With only one tab, the button MUST reveal the drop zone with guidance instead of opening split.

#### Scenario: Drag tab to lateral zone opens split
- GIVEN at least two tabs exist and `splitDropZone` is present
- WHEN a tab element is dragged (`dragstart` with `application/x-khipu-tab`) and dropped on `splitDropZone`
- THEN `SplitManager.openSplit(activeId, draggedTabId)` MUST be called (or the logical active/other resolution)

#### Scenario: Single tab shows guidance
- GIVEN only one tab exists
- WHEN the user invokes split (button or `Ctrl+\`)
- THEN `splitDropZone` MUST become visible
- AND `Progress.show()` MUST display guidance to drag a second file or click to open it

#### Scenario: External file dropped on split zone
- GIVEN split view is not active
- WHEN a file is dropped on `splitDropZone` (from Windows Explorer)
- THEN `FileHandler.handleFile(file)` MUST be invoked
- AND if a second tab appears within 200ms, `openSplit(firstId, lastId)` MUST be called

#### Scenario: Auto-reveal on right-edge dragover
- GIVEN at least one tab exists and split is not active
- WHEN a `dragover` event occurs with `clientX > 0.75 * innerWidth`
- THEN `splitDropZone` MUST be revealed (`classList.remove('hidden')`)

### Requirement: Split divider resizing
The system MUST provide a draggable divider (`.split-divider`) to resize the two panels between 20% and 80%.

#### Scenario: Divider drag resizes panels
- GIVEN split view is active
- WHEN the user drags `.split-divider` horizontally
- THEN `splitPanelLeft.style.flex` MUST be set to `0 0 {pct}%` where `pct` is clamped to [20, 80]
- AND `splitPanelRight` MUST fill the remainder

### Requirement: Icon multi-resolution update
The system MUST ship updated multi-resolution icon assets for Tauri bundling.

#### Scenario: Icon assets updated
- GIVEN the Tauri bundle configuration in `src-tauri/tauri.conf.json`
- WHEN the bundle is built
- THEN icons at `icons/32x32.png`, `icons/128x128.png`, `icons/128x128@2x.png`, and `icons/icon.*` MUST be present and updated to the v0.4.0 set

### Requirement: Build is webview-only (no portable HTML)
The system MUST generate only `public/index.html` via `node build.js` for the Tauri webview. No `KhipuCodex.html` portable file SHALL be produced.

#### Scenario: Build output is webview-only
- GIVEN the project root contains `build.js`
- WHEN `node build.js` is executed
- THEN `public/index.html` MUST be written
- AND no `KhipuCodex.html` file SHALL be created in the project root

### Requirement: Titlebar drag known limitation (wontfix)
A comprehensive custom-titlebar redesign was evaluated and intentionally discarded for v0.4.0. The current titlebar (frameless with `transparent: true`, `-webkit-app-region: drag` on zones, `data-no-drag` on interactive elements) is retained as-is.

#### Scenario: Titlebar remains stable without redesign
- GIVEN the current `#custom-titlebar` implementation with `-webkit-app-region` rules
- WHEN the app is evaluated for a full titlebar rewrite in v0.4.0
- THEN the rewrite MUST be recorded as `wontfix` / known limitation
- AND no code change to the titlebar structure beyond the drag-region surgical fixes already in `style.css`/`index.html` SHALL be required for this release

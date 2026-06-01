# Tasks: Fase 3 — Módulos ES

## Review Workload Forecast
- **Estimated changed lines**: ~200 (creación de archivos) + ~50 (build.js refactor)
- **400-line budget risk**: Low
- **Delivery**: single session

## Phase 1: Creación de módulos

- [x] 3.1 **Crear** `src/constants.js` — APP_VERSION, platform detection helpers
- [x] 3.2 **Crear** `src/dom-refs.js` — $(), $$(), cached DOM element refs
- [x] 3.3 **Crear** `src/sanitize.js` — _sanitizeHtml(), XSS defense
- [x] 3.4 **Crear** `src/markdown.js` — marked.parse wrapper, saveMarkdownVersion, getMarkdownVersions
- [x] 3.5 **Crear** `src/theme.js` — ThemeManager (init, toggle, persist)
- [x] 3.6 **Crear** `src/progress.js` — Progress (show, update, hide)
- [x] 3.7 **Crear** `src/sectionizer.js` — Sectionizer (splitIntoChunks, etc.)
- [x] 3.8 **Crear** `src/scroller.js` — VirtualScroller (_materialize, _dematerialize, scroll, resize)
- [x] 3.9 **Crear** `src/search.js` — SearchEngine (find, highlight, navigate)
- [x] 3.10 **Crear** `src/tabs.js` — TabManager (open, close, switch, lazy DOM)
- [x] 3.11 **Crear** `src/file-handler.js` — FileHandler (open, render DOCX/MD, toggle edit)
- [x] 3.12 **Crear** `src/annotation.js` — AnnotationLayer (canvas overlay, stub para Fase 4)
- [x] 3.13 **Crear** `src/svg-viewer.js` — SvgViewer (stub para Fase 5)
- [x] 3.14 **Crear** `src/window.js` — WindowControls (minimize, maximize, close, titlebar drag)
- [x] 3.15 **Crear** `src/main.js` — Init (DOMContentLoaded), keyboard shortcuts wiring

## Phase 2: Build update

- [x] 3.16 **Modificar** `build.js` — Leer `src/*.js` en orden de dependencias en vez de un solo `app.js`

## Phase 3: Verification

- [x] 3.17 **Verificar** `node build.js` → exitoso, bundle ~760 KB
- [x] 3.18 **Verificar** 17/17 símbolos globales accesibles
- [x] 3.19 **Verificar** app funciona en browser (apertura DOCX, MD, tabs, búsqueda, tema)

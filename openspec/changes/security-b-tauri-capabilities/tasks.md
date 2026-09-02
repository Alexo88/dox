# Tasks: Security B — Reducir allowlist Tauri con autorización Rust

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Rust — Cargo + new commands

- [x] 1.1 Agregar `uuid` con `v4` + `serde` a `src-tauri/Cargo.toml`
- [x] 1.2 Implementar `AppState` con `HashMap<String, String>` (token → path) + 5 comandos Rust en `src-tauri/src/lib.rs`: `open_document_from_argv`, `save_markdown`, `save_markdown_as`, `close_document`, `is_window_maximized`
- [x] 1.3 Eliminar `reset_window_size` del handler y del `generate_handler![]`
- [x] 1.4 Remover features no usadas de Cargo.toml: `dialog-all`, `window-all`, `shell-open`, `fs-all`

## Phase 2: Tauri config — reducir allowlist

- [x] 2.1 Reducir `tauri.conf.json` allowlist: `fs: { all: false, scope: [] }`, `dialog: { all: false }`, `shell: { open: false }`, `window: { all: false, startDragging: true }`

## Phase 3: Frontend — reemplazar IPC calls

- [x] 3.1 `src/file-handler.js`: Reemplazar `__TAURI__.fs.readTextFile/writeTextFile/readBinaryFile` por invokes; reemplazar `dialog.save` por `save_markdown_as`; agregar `documentToken` al estado; eliminar `currentFilePath`
- [x] 3.2 `src/tabs.js`: Agregar `documentToken` a `TabState`; llamar `invoke('close_document')` en `closeTab()`
- [x] 3.3 `src/window.js`: Reemplazar `appWindow.isMaximized()` por `invoke('is_window_maximized')`

## Phase 4: Verification

- [x] 4.1 Verificar build: `node build.js` sin errores
- [x] 4.2 Verificar regresiones: revisar que todos los flujos (abrir por argv, guardar, guardar como, cerrar tab, maximizar) sigan funcionando con los comandos Rust
# Proposal: Single-instance with settings.json toggle

## Intent
Reuse the existing Khipu Codex window when the user opens a file via OS ("Abrir con..." / double-click) instead of spawning a second instance. Allow the user to opt out via a toggle that persists in `settings.json` and `localStorage`.

## Scope
### In Scope
- `tauri-plugin-single-instance` registration conditioned on `open_mode != new_window`
- Rust helpers `get_settings_path()` / `read_open_mode()` / `get_open_mode` / `set_open_mode` (settings at `%APPDATA%/com.maudev.khipucodex/settings.json`)
- JS listener `single-instance-open` → `open_document_from_path` and `open_document_from_argv` reuse
- Titlebar toggle `btn-open-mode` (🗂️ Reusar / 🪟 Nueva ventana) with `localStorage` fallback

### Out of Scope
- Multi-window management
- macOS/Linux single-instance behavior

## Capabilities
- Modified: `app-core` (single-instance)

## Approach
- At `lib.rs::run()` read `open_mode` before builder; only register `tauri_plugin_single_instance` when mode is `reuse`
- Plugin callback: `window.unminimize()/show()/set_focus()` + `emit_all("single-instance-open", {args, cwd})`
- Frontend `FileHandler.init()` listens to `single-instance-open`, picks first non-flag arg, invokes `open_document_from_path`

## Affected Areas
| Area | Impact |
|------|--------|
| `src-tauri/Cargo.toml` | Added `tauri-plugin-single-instance` (git v1 branch) |
| `src-tauri/src/lib.rs` | Added settings helpers, commands, plugin registration |
| `src/file-handler.js` | Added single-instance listener + `_initOpenModeToggle()` |
| `src/dom-refs.js` / `index.html` | Added `btn-open-mode` ref and button |

## Risks
| Risk | Mitigation |
|------|------------|
| Settings file missing | Fallback to `reuse` default |
| APPDATA not set | Fallback to `settings.json` in cwd |

## Rollback Plan
`git revert` lib.rs + Cargo.toml + file-handler.js; remove plugin dependency

## Success Criteria
- [x] Second OS open reuses window and opens file as new tab
- [x] Toggle persists via Rust settings and localStorage fallback

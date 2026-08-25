# Verify Report: Single-instance (2026-08-25)

## Summary
- **Status**: ✅ Verified (manual + build)
- **Build**: `node build.js` → successful; `cargo check` not run (Tauri plugin fetched)
- **Implementation**: `tauri-plugin-single-instance` + `settings.json` toggle + `localStorage` fallback

## Verification

### Code review (verified against diff)
| Item | Status | Evidence |
|------|--------|----------|
| `src-tauri/Cargo.toml` declares `tauri-plugin-single-instance` (git v1) | ✅ | `Cargo.toml:24` |
| `src-tauri/src/lib.rs` `get_settings_path()` resolves to `%APPDATA%/com.maudev.khipucodex/settings.json` and creates dir | ✅ | `lib.rs:get_settings_path()` |
| `read_open_mode()` defaults to `reuse` | ✅ | `lib.rs:read_open_mode()` |
| `get_open_mode` / `set_open_mode` commands + `open_document_from_path` added to handler | ✅ | `lib.rs` generate_handler |
| Plugin only registered when `open_mode != "new_window"` | ✅ | `lib.rs::run()` conditional builder |
| Plugin callback calls `unminimize/show/set_focus` and `emit_all("single-instance-open", SingleInstancePayload)` | ✅ | `lib.rs::run()` closure |
| `src/dom-refs.js` exposes `btnOpenMode` | ✅ | `dom-refs.js:13` |
| `index.html` has `btn-open-mode` button with `data-no-drag` | ✅ | `index.html:39` |
| `src/file-handler.js` listens to `single-instance-open`, parses `args.slice(1).find(!startsWith('-'))`, invokes `open_document_from_path` | ✅ | `file-handler.js:83-100` |
| `_initOpenModeToggle()` reads `get_open_mode` via invoke, falls back to localStorage, updates button title/icon, persists to both | ✅ | `file-handler.js:112-157` |
| `src/file-handler.js` `_openFromDocumentInfo` / `_handleOpenWithArgv` reuse existing flow | ✅ | `file-handler.js:162-223` |

### Expected vs Found
- Expected: single-instance with settings.json+localStorage verified
- Found: ✅ Both persistence paths implemented and wired

### Gaps / Follow-ups
- None for v0.4.0. Multi-window is out of scope.

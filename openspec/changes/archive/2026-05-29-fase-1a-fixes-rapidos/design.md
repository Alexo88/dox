# Design: Fase 1A — Fixes rápidos

## Technical Approach

Five independent, low-risk changes applied directly to config, documentation, and code files. No architectural shifts — each item is a surgical edit. Items 1-4 are string/config changes; item 5 is a pure code-reorganization (move function, no behavioral change).

## Architecture Decisions

### Decision: saveMarkdownVersion — move within file, not extract to module

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extract to separate JS module + import | Cleaner separation, but requires build pipeline change (app.js is loaded raw, no bundler) | Rejected |
| Move function above Section 10 (Init) in same file | Zero build impact, same hoisting behavior (function declaration), preserves call-site compatibility | **Chosen** |

**Rationale**: The project has no module bundler — `app.js` is loaded via `<script>` and `build.js` inlines everything. Extracting to a separate file would require modifying `build.js` and `index.html`, increasing scope for a reorganization-only change. A function declaration is hoisted in JS, so its physical position doesn't affect call-sites — but we still move it for readability, placing it near the other module-level helpers (lines 58-93: `escapeHtml`, `inlineMarkdown`, `markdownToHtml`).

### Decision: process allowlist — full removal, not restriction

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `process: { all: false }` | Keeps key in config, still registers the Tauri process plugin | Rejected |
| Remove `process` object entirely | Plugin never registers; zero attack surface | **Chosen** |

**Rationale**: `lib.rs` already provides `get_open_args` via a custom Tauri command (`std::env::args().skip(1).collect()`), which is the only reason process access was needed. The JS-side `process` API from Tauri is unused — removing the object prevents the plugin from loading at all.

## Data Flow

No data-flow changes. All five items are either:
- **String replacements** (items 1, 4) — output text only
- **Config pruning** (item 2) — removes a capability, no new flow
- **Static content** (item 3) — documentation, no runtime effect
- **Code reorder** (item 5) — same function, same call graph

```
app.js (lines 58-93)          ← Module-level helpers (escapeHtml, inlineMarkdown, markdownToHtml)
    ↓
app.js (NEW: ~line 94)        ← saveMarkdownVersion() moved HERE
    ↓
app.js (lines ~180-1347)      ← FileHandler, Sectionizer, etc. (call-sites unchanged)
    ↓
app.js (lines 1350-1389)      ← Section 10: Init (DOMContentLoaded)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `dx.bat` | Modify | Line 2: `DocxLite Launcher` → `Khipu Codex Launcher`. Line 23: `DocxLite.exe` → `Khipu Codex.exe` |
| `src-tauri/tauri.conf.json` | Modify | Remove lines 11-13 (`"process": { "all": true }`) from allowlist |
| `README.md` | Modify | Full rewrite: title "Khipu Codex", updated description, features, stack (Tauri v1 + Rust), dual mode (portable HTML + native), build instructions |
| `CHANGELOG.md` | Modify | Prepend v0.3.0 entry before existing v0.2.0, documenting audit fixes |
| `app.js` | Modify | Cut `saveMarkdownVersion()` (lines 1397-1430) and insert after `markdownToHtml()` block (after line 93), before FileHandler class |

## Interfaces / Contracts

No new interfaces. After item 5, `saveMarkdownVersion` remains a module-level function declaration:

```javascript
// Called from FileHandler.toggleMarkdownEdit()   (line 1226)
// Called from FileHandler._renderMarkdown()       (line 1257)
function saveMarkdownVersion(name, text) { /* unchanged */ }
```

Both call-sites are inside `FileHandler` which is defined after the moved function position — no reference break.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | App launches (Tauri native) | Run `dx.bat`, verify Khipu Codex window opens |
| Manual | App launches (portable HTML) | Open `index.html` in browser |
| Manual | Markdown versioning still works | Open .md file, edit, toggle edit/view, check localStorage for `khipu-md:*` keys |
| Manual | Process API removed | Verify no `__TAURI__.process` in console; `get_open_args` still works via `invoke` |
| Visual | README renders correctly | Review on GitHub |
| Visual | CHANGELOG entry present | Confirm v0.3.0 is at top |

## Migration / Rollout

No migration required. All changes are backward-compatible:
- `process` removal: no JS code references `__TAURI__.process`
- `saveMarkdownVersion` move: function declarations are hoisted; call-sites unaffected

**Rollback**: `git checkout HEAD -- <file>` per affected file.

## Open Questions

- [ ] Should `APP_VERSION` in `app.js` line 52 be bumped from `'0.2.0'` to `'0.3.0'` to match the CHANGELOG? (Not in scope per proposal, but worth noting)

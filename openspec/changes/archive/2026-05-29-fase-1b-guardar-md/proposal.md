# Proposal: Fase 1B — Guardar MD a disco

## Intent

Currently, Khipu Codex lacks a persistent saving mechanism for edited Markdown files. Users need to save their work efficiently to local disk (when using Tauri) or via download (in browser) to prevent data loss and improve workflow.

## Scope

### In Scope
- Add "Guardar" button to markdown editor mode.
- Implement Ctrl+S shortcut for saving.
- Implement file saving using `window.__TAURI__.fs.writeTextFile()` in Tauri.
- Implement `localStorage` backup (`khipu-md:nombre:backup`) before overwriting.
- Implement fallback via `<a download>` link in browser when no file path is available.

### Out of Scope
- Code modularization (will be addressed in Fase 3).
- Full TDD implementation.

## Capabilities

### New Capabilities
- `markdown-persistence`: Manages file saving, backup logic, and platform-specific persistence strategies (Tauri FS vs browser download).

### Modified Capabilities
- None.

## Approach

1.  **UI**: Update `index.html` to add the "Guardar" button in the editor toolbar.
2.  **Logic**: Update `app.js` to:
    - Handle "Guardar" click and Ctrl+S key event.
    - Check for `window.__TAURI__` to determine runtime environment.
    - If Tauri: call `fs.writeTextFile()` after backing up to `localStorage`.
    - If Browser: generate a Blob URL and trigger download.
3.  **Path Management**: Extend `FileHandler` or relevant state to track the original file path if available.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app.js` | Modified | Add logic for save, backup, and platform detection |
| `index.html` | Modified | Add "Guardar" button |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss on overwrite | Low | Backup to `localStorage` before every save |
| Lack of file system access in browser | High | Use `<a download>` fallback |

## Rollback Plan

Revert changes in `app.js` and `index.html` to the state prior to applying this change.

## Dependencies

- None.

## Success Criteria

- [ ] "Guardar" button successfully saves changes to the source file in Tauri.
- [ ] Ctrl+S shortcut triggers the save function.
- [ ] `localStorage` contains a backup of the previous content after saving.
- [ ] Browser environment prompts a file download when clicking save.

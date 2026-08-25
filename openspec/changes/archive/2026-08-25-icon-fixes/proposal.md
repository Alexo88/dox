# Proposal: Icon fixes (multi-resolution)

## Intent
Ship updated multi-resolution icons for the Tauri bundle so the EXE displays crisp icons at all Windows sizes.

## Scope
- Update `src-tauri/icons/32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico`, `icon.png`, and Square/Store logos
- No code changes; only assets

## Affected Areas
| Area | Impact |
|------|--------|
| `src-tauri/icons/*` | Modified (binary) |

## Success Criteria
- [x] `src-tauri/tauri.conf.json` bundle icons still resolve
- [x] Assets present at updated sizes

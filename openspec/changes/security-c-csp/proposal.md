# Proposal: Security C - CSP Hardening

## Intent

Harden the Content Security Policy (CSP) for Khipu Codex to follow security best practices. The current implementation relies on insecure defaults ('unsafe-eval') and lacks CSP protection for the portable HTML version.

## Scope

### In Scope
- Update `tauri.conf.json` CSP directives to remove insecure defaults and add missing required directives.
- Implement CSP meta tag injection in `build.js` for the portable `KhipuCodex.html` file.

### Out of Scope
- Any changes to core application logic or functionality.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. **`tauri.conf.json`**:
   - Remove `'unsafe-eval'`.
   - Remove `blob:` from `img-src`.
   - Add `connect-src 'self'`, `font-src 'self'`, `frame-src 'none'`, `base-uri 'self'`, `form-action 'none'`.
2. **`build.js`**:
   - Inject `<meta http-equiv="Content-Security-Policy" ...>` tag into the generated `KhipuCodex.html`.
   - Define a policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src blob:`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tauri.conf.json` | Modified | Update securityPolicy directives |
| `build.js` | Modified | Inject CSP meta tag in build output |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSP prevents legitimate app functionality | Medium | Test all app features after config changes |

## Rollback Plan

Revert `tauri.conf.json` and `build.js` using git:
`git checkout tauri.conf.json build.js`

## Dependencies

- None

## Success Criteria

- [ ] CSP correctly restricts sources.
- [ ] Application features remain functional.
- [ ] No `'unsafe-eval'` in production.

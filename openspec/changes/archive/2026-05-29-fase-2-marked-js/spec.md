# Spec: Fase 2 — marked.js Integration

## Requirements

### Requirement: Replace custom parser with marked.js
The system MUST replace the custom `markdownToHtml()` function with `marked.parse()` using the marked.js library at version 15.0.12.

#### Scenario: Markdown renders correctly
- GIVEN a Markdown document with tables, nested lists, and images
- WHEN `marked.parse()` is called on the document content
- THEN the output MUST be valid HTML with correct table structures, nested list hierarchy, and image tags

### Requirement: Remove legacy parser functions
The system MUST remove these functions after migration: `markdownToHtml()`, `inlineMarkdown()`, `escapeHtml()`.

#### Scenario: Verify removal
- GIVEN the source code of `app.js`
- WHEN searched for `function markdownToHtml`, `function inlineMarkdown`, `function escapeHtml`
- THEN none of these function definitions SHALL exist

### Requirement: Maintain XSS sanitization
The system MUST continue applying `_sanitizeHtml()` after `marked.parse()` to ensure XSS defense.

#### Scenario: XSS defense remains intact
- GIVEN `marked.parse()` has been integrated
- WHEN HTML output is generated
- THEN it MUST pass through `_sanitizeHtml()` before being inserted into the DOM

### Requirement: Inline marked.min.js in build
The system MUST inline `lib/marked.min.js` into the portable HTML via `build.js` using the same mechanism as `lib/mammoth.browser.min.js`.

#### Scenario: Build produces valid output
- GIVEN `build.js` has been updated
- WHEN `node build.js` is executed
- THEN the output `KhipuCodex.html` MUST contain the inlined `marked.min.js` content and the bundle size MUST be approximately 760 KB

### Affected Files
| File | Action |
|------|--------|
| `lib/marked.min.js` | Add |
| `build.js` | Modify (inline marked) |
| `app.js` | Modify (replace parser, remove ~120 lines) |

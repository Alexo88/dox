# Proposal: Fase 2 — Reemplazar parser MD custom con marked.js

## Intent

El parser Markdown actual en `app.js` (líneas 94–177) es custom y frágil: no soporta tablas, listas anidadas, imágenes, HTML embebido en MD, ni front matter. Cualquier documento `.md` medianamente complejo se renderiza incorrectamente.

Reemplazarlo por `marked.js` v15.0.12 — una biblioteca madura, mantenida y ampliamente adoptada.

## Scope

### In Scope
- Descargar `marked.min.js` a `lib/marked.min.js`
- Inline del archivo en `build.js` junto a mammoth.js (mismo mecanismo existente)
- Reemplazar `markdownToHtml()` en `app.js` por `marked.parse()`
- Configurar `marked` con opciones seguras (sanitización post-parse via `_sanitizeHtml()`)
- Eliminar funciones del parser custom: `markdownToHtml()`, `inlineMarkdown()`, `escapeHtml()`

### Out of Scope
- No se migran otras funciones de `app.js`
- No se agregan plugins de marked (como soporte de tablas, que ya viene incluido)

## Approach
1. Descargar `marked.min.js` (~50 KB) a `lib/`
2. Modificar `build.js` para inlinear `lib/marked.min.js` en el bundle (misma lógica que `lib/mammoth.browser.min.js`)
3. Reemplazar `markdownToHtml()` → `marked.parse()` con opción `{ breaks: true, gfm: true }`
4. Mantener `_sanitizeHtml()` como post-procesador (XSS defense en dos capas)
5. Eliminar ~120 líneas de parser custom

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| marked.parse() produce HTML distinto | Medium | Revisar visualmente documentos existentes |
| Regresión de rendering | Low | marked es estable y bien testeado |

## Rollback Plan
Revertir cambios en `app.js` y `build.js`; restaurar `lib/` a estado anterior.

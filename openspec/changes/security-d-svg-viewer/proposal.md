# Proposal: Security D — SVG Viewer Hardening

## Intent

Corregir un bug de seguridad en `src/svg-viewer.js` donde una condición duplicada en la restricción de href permite que atributos peligrosos pasen el filtro. Aprovechar para revisar la allowlist de tags y atributos SVG contra vectores XSS conocidos.

## Scope

### In Scope
- Corregir condicional duplicado en `svg-viewer.js:53` (`!val.startsWith('#')` repetido)
- Revisar que `use`, `image`, `animate`, etc. no puedan referenciar recursos externos
- Verificar que el sanitizador cubre vectores SVG conocidos (event handlers, namespace hopping, data URIs maliciosas)
- Validar interacción entre `SvgViewer.sanitize()` y `_sanitizeHtml()` en `file-handler.js`

### Out of Scope
- No cambiar la lógica de wrapping ni VirtualScroller
- No refactorizar `svg-viewer.js` más allá del sanitizador
- No tocar Security C (CSP), worker Blob, ni reorientación EXE

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. Corregir línea 53: eliminar el duplicado `&& !val.startsWith('#')`
2. Verificar que `data:` URIs en `<image>` no son necesarias para SVGs cargados como archivo independiente
3. Revisar que namespace hopping (SVG anidado dentro de HTML) no evade el sanitizador
4. Confirmar que `_sanitizeHtml()` en file-handler.js remueve `<svg>` del contenido HTML, y `SvgViewer` solo se usa para archivos .svg directos

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/svg-viewer.js:53` | Modified | Corregir condicional duplicado |
| `src/file-handler.js` | Read-only | Verificar interacción sanitizadores |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El bug actual permite hrefs externos en etiquetas SVG como `use` o `image` | Medium | La corrección cierra el vector |
| data: URIs en `<image>` podrían usarse para XSS | Low | Revisar si el caso de uso existe |

## Rollback Plan

Revertir con git: `git checkout src/svg-viewer.js`

## Dependencies

- Ninguna

## Success Criteria

- [ ] Condicional duplicado corregido
- [ ] Solo fragmentos `#` permitidos en href de `use`, `image`, `animate`, `animateTransform`, `set`, `cursor`
- [ ] Vectores SVG conocidos cubiertos (on*, script, foreignObject, javascript:)
- [ ] Sanitizadores no dejan pasar XSS entre ambos
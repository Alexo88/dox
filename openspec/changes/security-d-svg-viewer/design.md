# Design: Security D — SVG Viewer Hardening

## Problem

Condicional duplicado en `svg-viewer.js:53`:
```js
// Bug: mismo check repetido
if (val && !val.startsWith('#') && !val.startsWith('#')) {
```
El código intenta restringir href/xlink:href a fragmentos internos `#` en elementos SVG como `use`, `image`, `animate`, etc. El duplicado es un copy-paste error — la intención original (y correcta) es un solo `!val.startsWith('#')`.

## Sanitizer Interaction

Dos sanitizadores separados, sin solapamiento:

| Sanitizer | Entrada | Uso | ¿Remueve SVG? |
|---|---|---|---|
| `_sanitizeHtml()` (file-handler.js:460) | HTML de DOCX/Markdown | Contenido renderizado en viewer | ✅ Sí, `'svg'` en BLOCKED_TAGS |
| `SvgViewer.sanitize()` (svg-viewer.js:16) | SVG crudo como archivo independiente | Archivos .svg abiertos directamente | N/A — sanitiza SVG, no lo remueve |

No hay ruta donde un SVG malicioso pase por ambos sin ser sanitizado o removido.

## Fix

**Archivo**: `src/svg-viewer.js`
**Línea**: 53
**Cambio**: Eliminar el duplicado `&& !val.startsWith('#')`

## Verify

- [ ] Solo fragmentos `#` pasan el filtro de href en `use`, `image`, `animate`, `animateTransform`, `set`, `cursor`
- [ ] `javascript:` en `<a>` sigue bloqueado por step 6
- [ ] `on*` event handlers removidos por step 4
- [ ] `<script>` y `<foreignObject>` removidos por steps 1-2
- [ ] Archivos .docx/.md no dejan pasar SVG (removido por `_sanitizeHtml`)
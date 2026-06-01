# Tasks: Fase 2 — marked.js Integration

- [x] 2.1 **Descargar** `marked.min.js` v15.0.12 a `lib/marked.min.js`
- [x] 2.2 **Inlinear** `lib/marked.min.js` en `build.js` (misma lógica que mammoth)
- [x] 2.3 **Reemplazar** `markdownToHtml()` por `marked.parse()` con opciones GFM
- [x] 2.4 **Eliminar** `escapeHtml()`, `inlineMarkdown()`, `markdownToHtml()` del parser custom

### Verification
- [x] Build exitoso: `node build.js` produce `KhipuCodex.html` (~760 KB)
- [x] Símbolos verificados: `marked` global accesible, `marked.parse` funciona
- [x] Documentos MD existentes se renderizan correctamente

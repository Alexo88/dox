# Tasks: Fase 4 — AnnotationLayer

- [x] 4.1 **Crear** `src/annotation.js` — Módulo AnnotationLayer con canvas overlay completo
- [x] 4.2 **Agregar hooks** en `src/scroller.js` — `_materialize()` y `_dematerialize()` llaman a AnnotationLayer
- [x] 4.3 **Toolbar flotante** — Botones de color, grosor, borrador, limpiar todo, toggle en titlebar
- [x] 4.4 **Persistencia localStorage** — `save(filename)` serializa strokes, `load(filename)` los restaura
- [x] 4.5 **Bug fix: `_measuring` guard** — Race condition en resize cuando multiple sections miden simultáneamente
- [x] 4.6 **Bug fix: `AnnotationLayer.load` en `restoreState`** — Al restaurar un tab, las anotaciones no se cargaban automáticamente

## Verification
- [x] Build exitoso: `node build.js` → 774 KB
- [x] Símbolos: 12/12 (AnnotationLayer + hooks integrados)
- [x] Toolbar visible solo en modo visor
- [x] Anotaciones persisten al cambiar de tab
- [x] Anotaciones persisten al recargar el documento
- [x] Resize no causa race conditions

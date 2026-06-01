# Tasks: Fase 5 — Visor SVG

- [x] 5.1 **Crear** `src/svg-viewer.js` — Módulo SvgViewer con sanitizer de 6 pasos
- [x] 5.2 **Modificar** `src/file-handler.js` — Agregar `_openSvg()` y `_renderSvg()`, detectar extensión `.svg` en `_openFile()`
- [x] 5.3 **Modificar** `index.html` — Agregar `.svg` al `accept` del file-input
- [x] 5.4 **Agregar estilos** CSS para `.svg-container` — max-width, centrado, padding

## Verification
- [x] Build exitoso: `node build.js` → 781 KB
- [x] 5/5 símbolos verificados
- [x] 0 warnings en build
- [x] SVG renderiza correctamente (path independiente, sin pasar por VirtualScroller)
- [x] SVG malicioso con `<script>` es sanitizado
- [x] SVG con `onload` es sanitizado
- [x] File picker acepta `.svg`

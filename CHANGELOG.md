# Changelog

## 0.3.0 - 2026-05-29
- **Seguridad:** Se elimina `process: { all: true }` del allowlist de Tauri. Ya no se registra el plugin process. Se reemplaza por comando Rust `get_open_args`.
- **XSS:** Se agrega `_sanitizeHtml` y lista blanca `SAFE_PROTOCOLS` en `inlineMarkdown` para prevenir enlaces maliciosos.
- **UI/UX:** Se corrigen estilos de scroll, zona de pestañas (`tabs-zone`), márgenes de viewer/editor y región de drag. Se excluyen pestañas del titlebar drag.
- **Icono:** Se actualiza a multi-resolución ICO con 8 resoluciones (16×16 a 256×256).
- **Open-with:** Se agrega comando Rust `get_open_args` para soportar "Abrir con..." desde el explorador de Windows.
- **localStorage:** Se migran claves `docxlite-*` → `khipu-*`.
- **Pestañas:** Se corrige activación de pestaña adyacente al cerrar y se evita duplicado al guardar desde el editor.
- **Naming:** Se renombran referencias de "DocxLite" a "Khipu Codex" en `dx.bat`, `README.md` y configuración.
- **Guardado a disco (Ctrl+S):** Botón Guardar + `writeTextFile` (Tauri) y Blob download (browser) con backup automático.
- **Parser Markdown:** Se reemplaza parser custom (~120 líneas) por `marked.js` v15.0.12 con soporte GFM (tablas, listas anidadas, strikethrough).
- **Arquitectura modular:** `app.js` (~1380 líneas) se divide en 15 módulos ES independientes bajo `src/`.
- **Anotaciones canvas:** Sistema de dibujo overlay sincronizado con VirtualScroller, toolbar flotante (color/grosor/borrador), persistencia en localStorage.
- **Visor SVG:** Nuevo path de renderizado con sanitizador custom (6 pasos: scripts, foreignObject, style, on*, href, javascript:).
- **Build:** 15 módulos, 781 KB output, 0 warnings.

## 0.2.0 - 2026-03-12
- Se agrega soporte para abrir archivos `.md` y `.markdown` y renderizarlos interpretados.
- Se incorpora un modo de edicion simple para Markdown (toggle "Editar/Ver").
- Se inicia el guardado de versiones de Markdown en `localStorage` (hasta 10 por archivo).
- Se robustecen puntos de arquitectura previos: worker factory reemplazable y desacople de `Progress`.
- Se agregan marcadores en `index.html` para un build mas estable.

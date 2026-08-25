# Changelog

## v0.4.0 - 2026-08-25
- **Single-instance (reusar ventana):** `tauri-plugin-single-instance` (git v1). Segunda apertura vía "Abrir con..." reutiliza la ventana existente (`unminimize/show/set_focus`) y abre el archivo como nueva pestaña vía `single-instance-open` → `open_document_from_path`. Modo configurable `reuse` / `new_window` persistido en `settings.json` (`%APPDATA%/com.maudev.khipucodex/settings.json`) + fallback `localStorage` (`khipu-open-mode`) con toggle `btn-open-mode` (🗂️/🪟) en titlebar. Plugin no registrado cuando `open_mode=new_window`. Derivado de `archive/2026-08-25-single-instance`.
- **Split View / Book Mode:** `SplitManager` con dos `VirtualScrollerInstance` independientes (`viewerLeft`/`viewerRight`), DOM `#split-viewer` + `#split-panel-*` + `.split-divider` + `#split-drop-zone`, toolbar `#split-toolbar` con Sync/Swap/Close, auto-maximizado al entrar en split. `VirtualScroller` refactorizado a clase instanciable (`VirtualScrollerInstance(container)`) con instancia global `VirtualScroller` para `#viewer`; lógica container-aware (`_getViewer`, `_isContainerWindow`, `root: container`). Shortcuts `Ctrl+\` y drag-to-split (tab `application/x-khipu-tab` + drop de archivo externo + hover borde 75% + divider 20–80%). Con 1 tab muestra guía en vez de panel vacío. Derivado de `archive/2026-08-25-split-view`.
- **Iconos:** Assets multi-resolución actualizados (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico/.png`, Square/Store logos). Derivado de `archive/2026-08-25-icon-fixes`.
- **Titlebar:** Rediseño completo descartado intencionalmente para v0.4.0 — registrado como known limitation / **wontfix**. Se conservan fixes quirúrgicos de `-webkit-app-region` ya existentes. Derivado de `archive/2026-08-25-titlebar-known-limitation`.
- **Build webview-only:** `build.js` → solo `public/index.html` (100% Tauri, sin `KhipuCodex.html` portable) verificado.

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

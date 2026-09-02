# Tasks: Audit Fixes & Module Split

## Phase 1: Audit Fixes
- [x] 1.1 `save_markdown`: Corregir tipo de retorno `Result<String, String>` en Rust y validación segura en `file-handler.js`.
- [x] 1.2 `SAFE_PROTOCOLS`: Whitelist explícita de Data URIs para imágenes (`png`, `jpeg`, `jpg`, `gif`, `webp`) en `file-handler.js`.
- [x] 1.3 Web Worker: Protocolo con `requestId` incremental en `file-handler.js` y `docx.worker.js`.
- [x] 1.4 `atomic_write`: Preservar `temp_path` en fallos de renombrado en Windows en `src-tauri/src/lib.rs`.
- [x] 1.5 Guardar Como: Actualización inmediata de `documentToken` y `name` en el tab activo en `TabManager`.
- [x] 1.6 `VirtualScroller`: Cleanup y cancelación de `requestIdleCallback` / `requestAnimationFrame` en `destroy()`.
- [x] 1.7 `AnnotationLayer`: Escalado de canvas por `window.devicePixelRatio` para pantallas HiDPI.
- [x] 1.8 `WindowControls`: Soporte para maximizar/restaurar con doble clic en la barra de título.

## Phase 2: Refactor Modular
- [x] 2.1 Extraer `SplitManager` a `src/split.js` (225 líneas).
- [x] 2.2 Extraer `HtmlSanitizer` a `src/sanitizer.js` (71 líneas).
- [x] 2.3 Reducir `src/tabs.js` a 248 líneas.
- [x] 2.4 Actualizar `build.js` con los 17 módulos en orden estricto de dependencias.
- [x] 2.5 Agregar script `dxv.bat` para iniciar Tauri Dev desde la raíz.

# Khipu Codex — Plan de Trabajo

> Estado al: 2026-09-02 (verificado contra el código) | Base: v0.4.1 | HEAD `cd8280c`

> **Nota desync (2026-09-02):** este documento estaba congelado en v0.4.0 y listaba las Fases
> 3, 4 y 5 como pendientes cuando ya estaban implementadas y archivadas en
> `openspec/changes/archive/`. Las fases 1A–6 están **todas completas**. Este documento se
> reescribió para reflejar el estado real, verificado línea por línea contra el código.

---

## Estado actual — Qué está funcionando

- ✅ Visor DOCX y MD con virtual scrolling
- ✅ Multi-tab con lazy DOM
- ✅ Editor MD con preview y versiones en localStorage
- ✅ Guardado a disco (Tauri) con `atomic_write` y versiones previas
- ✅ Parser MD con `marked.js` + sanitizador post-parse
- ✅ Split View / Book Mode con dos scrollers independientes
- ✅ Single-instance: "Abrir con..." reutiliza ventana
- ✅ Visor SVG con sanitizador de 6 pasos
- ✅ AnnotationLayer: dibujo libre sobre el visor
- ✅ Búsqueda Ctrl+F con highlight
- ✅ Tema oscuro/claro persistido
- ✅ Ventana frameless (Tauri v1), maximize con doble clic
- ✅ Web Worker DOCX con protocolo `requestId` (anti race conditions)
- ✅ Sanitización XSS en ambos paths + CSP endurecida
- ✅ Build EXE-only (100% Tauri, `public/index.html` vía `build.js`, sin `KhipuCodex.html`)

---

## Fases — Estado verificado

Leyenda: ✅ completa · 🟡 parcial (ver nota) · ⏭️ wontfix

### Fase 1A — Fixes rápidos ✅ COMPLETA
*Verificada 2026-09-02*
- `dx.bat:2,23` — mensaje "Khipu Codex.exe", sin "DocxLite"
- `src-tauri/tauri.conf.json` — sin `process: { all: true }` (0 hits)
- `README.md` — reescrito, 0 hits de "DocxLite"
- `CHANGELOG.md` — actualizado (v0.4.1 en `:3`, v0.4.0 en `:20`)
- `saveMarkdownVersion()` ya no está huérfano: vive en `src/markdown.js:5-38`

### Fase 1B — Guardar MD a disco 🟡 PARCIAL
*Verificada 2026-09-02*
- ✅ Botón `btn-save` (`index.html:36`) + `Ctrl+S` (`keyboard.js:11-15`) → `FileHandler.saveCurrentMarkdown`
- ✅ Escritura al archivo original vía comando Rust `save_markdown` (`file-handler.js:250`, `src-tauri/src/lib.rs:161`) con `atomic_write` (`lib.rs:87`)
- ✅ `save_markdown_as` para Guardar Como (`file-handler.js:294`, `lib.rs:182`)
- 🟡 **Backup**: antes de guardar se invoca `saveMarkdownVersion` (`file-handler.js:242`), pero guarda bajo `khipu-md:${name}` — el historial de versiones, no la key `khipu-md:nombre:backup` que decía el plan. No hay copia `.bak`.
- ❌ **Fallback browser**: no implementado, y descartado explícitamente en el código (`file-handler.js:288-289`: "Solo funciona en Tauri (EXE-only). Sin fallback browser"). Coherente con la decisión EXE-only de v0.3.0, pero el plan nunca se actualizó.

### Fase 2 — Parser MD (marked.js) ✅ COMPLETA
*Verificada 2026-09-02*
- `lib/marked.min.js` presente, inlined por `build.js:39,87`
- `marked.parse` en uso (`file-handler.js:480`)
- Parser custom eliminado: 0 hits de `markdownToHtml` / `inlineMarkdown` / `escapeHtml` en `src/`
- Sanitizado post-parse conservado (`src/sanitizer.js:32`, `file-handler.js:535-540`) + whitelist de Data URIs para imágenes embebidas

### Fase 3 — Separación en módulos ES ✅ COMPLETA
*Verificada 2026-09-02 — commit `b5079ee` eliminó `app.js`*
- `build.js:42-46` concatena 17 módulos en orden de dependencias
- Los 10 módulos propuestos por el plan existen: `main.js`, `theme.js`, `progress.js`, `sectionizer.js`, `scroller.js`, `search.js`, `tabs.js`, `file-handler.js`, `window.js`, `markdown.js`
- 7 módulos adicionales no previstos en el plan original: `constants.js`, `dom-refs.js`, `sanitizer.js`, `keyboard.js`, `split.js`, `annotation.js`, `svg-viewer.js`

### Fase 4 — AnnotationLayer / Dibujo libre ✅ COMPLETA
*Verificada 2026-09-02 — Change archivado: `2026-05-29-fase-4-annotation-layer`*
- Toggle enable/disable (`src/annotation.js:35-38`)
- Toolbar flotante con color, grosor, borrador y limpiar todo (`:47-93`)
- Canvas por sección: `_attachCanvas` (`:100`)
- Hooks en el scroller: `_materialize` → restore (`:187-188`), `_dematerialize` → detach (`:208-209`)
- Persistencia `khipu-ann:${name}` (`:270-273`), load (`:288-291`), clear (`:309-314`)
- Escalado por `devicePixelRatio` para HiDPI (v0.4.1)
- Oculto en modo editor (`file-handler.js:436-438`)
- 🟡 **Deuda conocida (del plan, verificada exacta)**: solo el panel principal restaura canvas — los paneles de split no (`scroller.js:25-27` gate `_isContainerWindow()`, `:187,:208`); `split.js` no referencia AnnotationLayer en absoluto

### Fase 5 — Visor SVG ✅ COMPLETA
*Verificada 2026-09-02 — v0.3.0*
- `src/svg-viewer.js:20-82` — sanitizador de 6 pasos (tags, `on*`, ref attrs, `javascript:` href, …)
- Path separado, sin VirtualScroller (`file-handler.js:496-497`)

### Fase 6 — Split View / Single-instance ✅ COMPLETA
*Verificada 2026-09-02 — v0.4.0*
- `SplitManager` (`split.js:8`) con `_suppressScroll` (`:15`), divider 20–80% (`:65-87`), swap (`:251`)
- DOM `#split-viewer` + paneles + toolbar + drop zone (`index.html:96-147`)
- `Ctrl+\` (`keyboard.js:29-30`)
- Single-instance: `tauri-plugin-single-instance` (`Cargo.toml:24`), registro condicional (`lib.rs:316-324`)
- Toggle `reuse` / `new_window` en `settings.json` de `%APPDATA%` (`lib.rs:55-79`, `:146-158`) con fallback `localStorage` (`file-handler.js:117-143`)
- ⏭️ Titlebar full rewrite — **wontfix** (change archivado `2026-08-25-titlebar-known-limitation`)

---

## Trabajo post-v0.4.0 (v0.4.1, 2026-09-02)

HEAD `cd8280c` — 9 commits después de la base del plan.

**Bugfixes de auditoría** (`CHANGELOG.md:3-24`):
- `save_markdown`: `Result<String, String>` corregido + validación en JS (arregla `TypeError` con `Ctrl+S`)
- Sanitizador: whitelist de Data URIs (`png`, `jpeg`, `jpg`, `gif`, `webp`) para imágenes embebidas
- Web Worker: protocolo `requestId` incremental → anti race conditions al abrir múltiples archivos
- `atomic_write`: preserva el temp en fallos de renombrado en Windows
- `VirtualScroller`: cleanup de `requestIdleCallback`/`requestAnimationFrame` en `destroy()`
- `WindowControls`: maximize/restore con doble clic en titlebar

**Refactor modular:**
- `SplitManager` extraído de `tabs.js` → `src/split.js`
- `HtmlSanitizer` extraído de `file-handler.js` → `src/sanitizer.js`
- `build.js` actualizado a 17 módulos

**Herramientas:** `dxv.bat` para arrancar dev desde la raíz.

---

## Deuda técnica (verificada 2026-09-02)

| Item | Impacto | Ubicación |
|------|---------|-----------|
| Anotaciones no se restauran en paneles de split | Las marcas del panel derecho no aparecen al volver a materializar | `scroller.js:25-27`, `split.js` |
| Backup MD no es el especificado | El plan pedía `khipu-md:nombre:backup`; hay historial de versiones bajo `khipu-md:${name}` | `file-handler.js:242` |
| Sin fallback de guardado en browser | Correcto bajo EXE-only, pero rompería cualquier build web | `file-handler.js:288-289` |
| `worker-race-recovery` sin implementar | 24 tareas sin empezar. La spec `worker-message-protocol` fue **de-mergeada** de `openspec/specs/` el 2026-09-02 y vive como draft en el change | `openspec/changes/worker-race-recovery/` |
| `security-c-csp` sin cerrar | Fases 5.1/5.2 (scope de commit) pendientes | `openspec/changes/security-c-csp/tasks.md:42-43` |
| `security-d-svg-viewer` sin verificar | Verificación manual pendiente (3.3–3.5) | `openspec/changes/security-d-svg-viewer/tasks.md:28-30` |
| Sin `TODO.md` | ✅ Resuelto 2026-09-02 — `AGENTS.md:70` ahora apunta a `odd/tasks/<feature>.md` | `AGENTS.md:70` |
| Sin tests | SDD config declara TDD deshabilitado; verificación = `node build.js` | `openspec/config.yaml` |

**Resuelto desde el plan anterior:**

| Item | Estado |
|------|--------|
| `app.js` monolítico | ✅ Resuelto — 17 módulos (`b5079ee`) |
| Parser MD frágil | ✅ Resuelto — `marked.js` |
| `KhipuCodex.html` portable | ✅ Eliminado (EXE-only) |
| `process: { all: true }` | ✅ Eliminado |
| README con "DocxLite" | ✅ Resuelto |
| `saveMarkdownVersion()` huérfano | ✅ Resuelto — `src/markdown.js` |
| Titlebar full rewrite | ⏭️ wontfix |

---

## Trabajo no planificado (implementado sin estar en el plan)

- `Ctrl+W` para cerrar pestaña (`keyboard.js:20-21`)
- Comando Rust `expand_window_for_document` — auto-resize de ventana al abrir documento (`lib.rs:240`)
- Web Worker DOCX con mammoth inlined (`docx.worker.js` + `build.js:58-66`) — decisión arquitectónica mayor que nunca entró al plan

---

## Dónde vive cada cosa

El detalle de fases vive ahora en `ROADMAP.md` (big picture) y en `openspec/changes/`
(propuesta → diseño → tareas → verificación por change).

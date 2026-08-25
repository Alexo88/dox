# Khipu Codex — Plan de Trabajo
> Estado al: 2026-08-25 | Base: v0.4.0 — Split View + Single-instance

---

## Estado actual — Qué está funcionando

- ✅ Visor DOCX y MD con virtual scrolling
- ✅ Multi-tab con lazy DOM
- ✅ Editor MD con preview y versiones en localStorage
- ✅ Búsqueda Ctrl+F con highlight
- ✅ Tema oscuro/claro persistido
- ✅ Ventana frameless (Tauri v1)
- ✅ Sanitización XSS en ambos paths
- ✅ Build EXE-only (100% Tauri, `public/index.html` vía `build.js`, sin `KhipuCodex.html`)
- ✅ Single-instance: "Abrir con..." reutiliza ventana (toggle `reuse`/`new_window` en `settings.json` + `localStorage`)
- ✅ Split View / Book Mode: comparación lado a lado con `VirtualScrollerInstance` por panel, toolbar Sync/Swap/Close, `Ctrl+\`, drag-to-split y divisor 20–80%

---

## Deuda técnica conocida

| Item | Impacto | Archivo |
|------|---------|---------|
| Parser MD custom frágil | Bugs en edge cases (tablas, listas anidadas, HTML en MD) | `app.js` líneas 94–177 |
| `app.js` monolítico (1390 líneas) | Difícil de mantener y extender | `app.js` |
| `saveMarkdownVersion()` fuera de lugar | Está al final del archivo, fuera de cualquier módulo | `app.js` línea 1397 |
| Comentarios de sección desordenados | Sección "10. Init" antes que "9. Titlebar Drag" | `app.js` líneas 1350–1355 |
| `README.md` desactualizado | Dice "DocxLite" en todo el contenido, repo viejo | `README.md` |
| `dx.bat` dice "DocxLite" en el error message | Rename incompleto | `dx.bat` línea 13 |
| `CHANGELOG.md` en v0.2.0 | No refleja los cambios del audit ni los fixes CSS/tabs | `CHANGELOG.md` |
| `tauri.conf.json` tiene `process: { all: true }` | No necesario, superficie de ataque innecesaria | `tauri.conf.json` |
| Guardar MD a disco no implementado | El editor solo guarda en localStorage, no al archivo original | `app.js` |

---

## Plan por fases

### Fase 1 — Pulido y cierre de deuda (esta semana)
*Objetivo: dejar la base limpia antes de agregar features*

**1A — Fixes rápidos (1 sesión)**
- `dx.bat`: corregir mensaje de error "DocxLite" → "Khipu Codex"
- `tauri.conf.json`: eliminar `process: { all: true }`
- `README.md`: reescribir completo con nombre, features y stack actuales
- `CHANGELOG.md`: agregar entrada v0.3.0 con todo lo hecho en el audit
- `app.js`: mover `saveMarkdownVersion()` dentro de un módulo (o al menos antes del init)

**1B — Guardar MD a disco (1 sesión)**
- Agregar botón "Guardar" (o `Ctrl+S`) en modo editor
- Usar `window.__TAURI__.fs.writeFile()` para sobreescribir el archivo original
- Backup automático: antes de guardar, copiar versión anterior a `khipu-md:nombre:backup`
- En modo browser (sin Tauri): ofrecer descarga via `<a download>`

---

### Fase 2 — Parser MD (1–2 sesiones)
*Objetivo: reemplazar el parser custom por `marked.js`*

**Por qué:** el parser actual no soporta tablas, listas anidadas, imágenes, HTML en MD, ni front matter. Cualquier MD medianamente complejo se ve mal.

**Cómo:**
- Descargar `marked.min.js` (~50KB) y agregarlo a `lib/`
- En `build.js`: inline junto a mammoth (mismo mecanismo)
- Reemplazar `markdownToHtml()` en `app.js` por `marked.parse()`
- Configurar `marked` con sanitización integrada o mantener `_sanitizeHtml()` post-parse
- Eliminar `markdownToHtml()`, `inlineMarkdown()`, `escapeHtml()` (excepto si se usan en otro lado)

**Estimado:** ~30 líneas modificadas, ~80 eliminadas

---

### Fase 3 — Separación en módulos ES (2 sesiones)
*Objetivo: dividir `app.js` en archivos separados*

**Estructura propuesta:**
```
src/
├── main.js           — Init + refs DOM + constantes
├── theme.js          — ThemeManager
├── progress.js       — Progress
├── sectionizer.js    — Sectionizer
├── scroller.js       — VirtualScroller
├── search.js         — SearchEngine
├── tabs.js           — TabManager
├── file-handler.js   — FileHandler
├── window.js         — WindowControls + initTitlebarDrag
└── markdown.js       — saveMarkdownVersion + helpers MD
```

**`build.js` actualizado:** concatenar módulos en orden en vez de leer un solo `app.js`

**Beneficio:** cada módulo nuevo (como AnnotationLayer) va en su propio archivo sin tocar nada más

---

### Fase 4 — AnnotationLayer / Dibujo libre (2–3 sesiones)
*Depende de Fase 3 — requiere módulo separado*

**Approach recomendado:** canvas overlay por sección, sincronizado con VirtualScroller

**Arquitectura:**
```
AnnotationLayer = {
    annotations: Map<sectionIdx, [strokes]>,  // en memoria
    activeCanvas: null,
    
    enable()   — muestra toolbar + activa modo dibujo
    disable()  — oculta toolbar
    
    _attachCanvas(sectionEl, idx)   — crea canvas sobre sección
    _detachCanvas(sectionEl, idx)   — serializa strokes antes de desmaterializar
    _restoreCanvas(sectionEl, idx)  — redibuja strokes al materializar
    
    save()     — localStorage: `khipu-ann:nombrearchivo`
    load()     — cargar al abrir documento
    clear()    — borrar todas las marcas del doc activo
}
```

**Integración con VirtualScroller:**
- Hook en `_materialize()`: llamar `AnnotationLayer._restoreCanvas(el, idx)`
- Hook en `_dematerialize()`: llamar `AnnotationLayer._detachCanvas(el, idx)`

**UI:**
- Botón en titlebar (junto a Editar/Ver): ✏️ toggle anotaciones
- Toolbar flotante: color, grosor, borrador, limpiar todo
- Solo visible en modo visor, desaparece en modo editor MD

---

### Fase 5 — Visor SVG (1 sesión) ✅ COMPLETA (v0.3.0)
*Feature nueva — tab para archivos `.svg`* — implementada y verificada en v0.3.0 (sanitizador 6 pasos, path separado sin VirtualScroller).

---

### Fase 6 — Split View / Single-instance (v0.4.0) ✅ COMPLETA (2026-08-25)
*Objetivo: comparación lado a lado y reutilización de ventana*

**Entregado:**
- `VirtualScroller` refactorizado a clase `VirtualScrollerInstance(container)` + singleton global para `#viewer`
- `SplitManager` (isSplit, leftTabId/rightTabId, scrollers independientes, sync con `_suppressScroll`, swap, close, auto-maximizar)
- DOM `#split-viewer` + `#split-panel-left/right` + `#viewer-left/right` + `#splitToolbar` + `#splitDropZone` + `.split-divider` 20–80%
- Atajo `Ctrl+\` (`keyboard.js`), drag-to-split (tab `application/x-khipu-tab`, drop externo, hover 75%, divider), guía con 1 tab
- Single-instance: `tauri-plugin-single-instance` condicional (`settings.json` `%APPDATA%/com.maudev.khipucodex/settings.json` + `localStorage` fallback), `single-instance-open` → `open_document_from_path`, toggle `btn-open-mode` (🗂️/🪟)
- Iconos multi-resolución actualizados
- Titlebar redesign descartado → registrado como known limitation / **wontfix** (se mantienen fixes quirúrgicos `-webkit-app-region`)
- Build 100% Tauri (solo `public/index.html`, sin `KhipuCodex.html` portable)

**Deuda técnica actualizada (post-v0.4.0):**
| Item | Estado |
|------|--------|
| `app.js` monolítico | ✅ Resuelto en v0.3.0 (15 módulos) |
| Parser MD frágil | ✅ Resuelto (marked.js) |
| `KhipuCodex.html` portable | ✅ Eliminado (EXE-only, `archive/2026-07-28-reorient-exe-only`) |
| Titlebar full rewrite | ⏭️ wontfix / known limitation (`archive/2026-08-25-titlebar-known-limitation`) |
| Annotation sync en split | Pendiente menor — solo panel principal restaura canvas (por diseño) |

---

## Prioridad recomendada

```
1A (fixes rápidos)  →  1B (guardar a disco)  →  2 (marked.js)  →  3 (módulos)  →  4 (anotaciones)  →  5 (SVG)
```

No arranques con 4 o 5 antes de tener 3 — agregar módulos a `app.js` monolítico va a generar conflictos cuando lo dividas.

---

## Estimación total

| Fase | Sesiones | Complejidad |
|------|----------|-------------|
| 1A — Fixes rápidos | 1 | Baja |
| 1B — Guardar a disco | 1 | Media |
| 2 — marked.js | 1–2 | Baja |
| 3 — Módulos ES | 2 | Media |
| 4 — Anotaciones | 2–3 | Alta |
| 5 — SVG | 1 | Media |
| **Total** | **8–10** | |

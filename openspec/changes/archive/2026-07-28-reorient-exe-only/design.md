# Design: Reorient EXE-only

## Problem

Khipu Codex genera y distribuye artefactos que ya no tienen sentido para un producto EXE-only:
- `KhipuCodex.html` es un duplicado exacto de `public/index.html`
- Los fallbacks Blob en `file-handler.js` existen solo para el browser directo
- `README.md` promociona "modo portable (HTML)" como primera opción

El riesgo no es eliminar lo que sobra, sino **confundir "EXE-only" con eliminar infraestructura que Tauri todavía necesita**. Este diseño separa lo que se retira de lo que se conserva.

## Decisiones

### R1: `README.md` se queda en la raíz

GitHub lo usa como portada del repositorio. Documentación técnica más detallada puede ir en `docs/`.

### R2: `KhipuCodex.html` deja de generarse

`build.js` hoy hace:
```js
fs.writeFileSync(OUT, output, 'utf-8');              // → KhipuCodex.html
fs.writeFileSync(TAURI_OUT, output, 'utf-8');          // → public/index.html
```

La primera línea se elimina. `TAURI_OUT` se conserva porque Tauri apunta `distDir: "../public"` en `tauri.conf.json`.

**Impacto**: `dx.bat` no usa `KhipuCodex.html` (ejecuta el EXE directamente). Ningún otro flujo lo referencia.

### R3: `public/index.html` se conserva exactamente como está

Tauri lo necesita. El contenido (CSS/JS/worker inlined + CSP meta) no cambia.

### R4: `index.html` (dev template) se conserva

Permite desarrollo sin rebuild: abrir en browser, los `<script src="src/*.js">` cargan los módulos directo. Build.js los inlinea para producción.

### R5: Solo se eliminan los branches Blob de Save/Save As

En `file-handler.js`:

```
saveCurrentMarkdown():
  if (__TAURI__) { invoke('save_markdown', ...) }  → CONSERVAR
  else { Blob download + a.click() }                 → ELIMINAR (líneas 195-209)

_saveMarkdownAs():
  if (__TAURI__) { invoke('save_markdown_as', ...) } → CONSERVAR
  else { Blob download + a.click() }                 → ELIMINAR (líneas 247-257)
```

Los guards `__TAURI__` en `_handleOpenWithArgv`, `window.js`, `main.js`, `tabs.js` se conservan — son condicionales inofensivos que ya funcionan como early return cuando no hay Tauri.

### R6: `_test_xss.md` se mueve a fixtures

De `_test_xss.md` (raíz) a `tests/fixtures/xss-security/attack-vectors.md`. Coexiste con los 7 SVGs adversariales ya en `tests/fixtures/svg-security/`.

## Flujo post-cambio

### Desarrollo local
```
index.html (abrir en browser)
  → src/*.js (carga directa, sin build)
  → Sin Blob download (no aplica en dev)
  → Sin Tauri commands (guards early-return)
```

### Build para Tauri
```
node build.js
  → public/index.html (todo inlineado + CSP)
  → NO genera KhipuCodex.html

cargo tauri build
  → src-tauri/target/release/app.exe
```

### Usuario final
```
app.exe (descargado o compilado)
  → Abre, arrastra DOCX, guarda, cierra
  → Sin dependencias del repo
```

## Validación EXE fuera del repositorio

1. Carpeta vacía → copiar solo `app.exe` + `public/`
2. Ejecutar `app.exe` → probar: abrir DOCX, guardar MD, SVG, worker
3. Verificar que NO necesita `KhipuCodex.html`, `index.html`, `build.js`, `src/`, `lib/`
4. Verificar que WebView2 runtime está instalado (Tauri lo requiere)

## Archivos resultantes

| Antes | Después | Estado |
|---|---|---|
| `KhipuCodex.html` | — | ❌ Eliminado |
| `public/index.html` | `public/index.html` | ✅ Idéntico |
| `index.html` | `index.html` | ✅ Conservado (dev) |
| `build.js` | `build.js` | ✅ Modificado (-2 líneas) |
| `file-handler.js` | `file-handler.js` | ✅ Modificado (-~20 líneas) |
| `README.md` | `README.md` | ✅ Reescribir |
| `_test_xss.md` | `tests/fixtures/xss-security/attack-vectors.md` | ✅ Movido |
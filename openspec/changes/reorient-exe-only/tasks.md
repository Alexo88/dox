# Tasks: Reorient EXE-only

## Review Workload Forecast
- Estimated changed lines: ~50
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Build — dejar de generar KhipuCodex.html
- [x] 1.1 Eliminar `fs.writeFileSync(OUT, output)` en build.js (línea que escribe KhipuCodex.html)
- [x] 1.2 Eliminar `const OUT = path.join(ROOT, 'KhipuCodex.html')` si ya no se usa
- [x] 1.3 Eliminar tamaño de KhipuCodex.html del log de build
- [x] 1.4 Verificar: `node build.js` produce solo `public/index.html`, no más `KhipuCodex.html`

## Phase 2: Frontend — eliminar Blob fallbacks
- [x] 2.1 En `file-handler.js` `saveCurrentMarkdown()`: eliminar bloque `else { Blob download }` (líneas 195-209)
- [x] 2.2 En `file-handler.js` `_saveMarkdownAs()`: eliminar bloque `else { Blob download }` (líneas 247-257)
- [x] 2.3 NO tocar los branches `__TAURI__` de ninguno
- [x] 2.4 Verificar que `FileReader`, `Blob`, `URL.createObjectURL`, `document.createElement('a')` ya no aparecen en contextos de guardado

## Phase 3: README — reescribir para EXE-only
- [x] 3.1 Reescribir introducción: "Visor portable de documentos para Windows — un solo EXE"
- [x] 3.2 Eliminar sección "Modo portable (HTML)"
- [x] 3.3 Convertir "Modo nativo (EXE)" en el único flujo principal
- [x] 3.4 Actualizar stack: eliminar mención a "build.js (781 KB output)" como producto
- [x] 3.5 Agregar: requisito de WebView2 runtime
- [x] 3.6 Agregar: instrucciones de descarga del EXE release

## Phase 4: Fixtures — mover _test_xss.md
- [x] 4.1 Crear `tests/fixtures/xss-security/`
- [x] 4.2 Mover `_test_xss.md` → `tests/fixtures/xss-security/attack-vectors.md`
- [x] 4.3 Verificar que el archivo movido tiene el contenido completo

## Phase 5: Validación
- [x] 5.1 `node build.js` → exitoso, sin errores
- [x] 5.2 `cargo check` → compilación Rust correcta
- [x] 5.3 `git diff --check` → sin errores de whitespace
- [x] 5.4 Solo archivos esperados en el diff (build.js, file-handler.js, README.md, fixtures)
- [x] 5.5 Probar EXE fuera del repositorio (acceptance criteria final)

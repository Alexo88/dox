# Proposal: Reorient EXE-only

## Intent

Khipu Codex se distribuye exclusivamente como EXE portable para Windows. Eliminar salidas y fallbacks de navegador que ya no forman parte del producto, sin rediseñar el pipeline del worker ni la infraestructura web que Tauri necesita.

## Scope

### In Scope
1. Dejar de generar `KhipuCodex.html` en `build.js` (output duplicado de `public/index.html`)
2. Eliminar fallbacks Blob de guardado en navegador (`file-handler.js` Save / Save As)
3. Reescribir `README.md` para presentar únicamente el EXE portable
4. Ajustar `dx.bat` e instrucciones de build
5. Mover `_test_xss.md` a `tests/fixtures/xss-security/` (fixture permanente)
6. Documentar que `KhipuCodex.html` y los Blob fallbacks se eliminaron

### Out of Scope
- NO cambiar worker Blob a archivo externo
- NO simplificar agresivamente `build.js`
- NO eliminar `index.html` como template de desarrollo
- NO eliminar `public/index.html` (Tauri lo necesita)
- NO eliminar guards `__TAURI__` útiles
- NO tocar la CSP actual
- NO rediseñar el pipeline del worker

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. **`build.js`**: Eliminar la escritura de `KhipuCodex.html`. Solo generar `public/index.html`.
2. **`file-handler.js`**: Eliminar los branches `else` de Blob download en `saveCurrentMarkdown()` (líneas 195-209) y `_saveMarkdownAs()` (líneas 247-257). Los branches Tauri se conservan intactos.
3. **`README.md`**: Reescribir: eliminar "Modo portable (HTML)", unificar en "Modo nativo (EXE)", actualizar stack y comandos de build.
4. **`dx.bat`**: Mantener funcional, ajustar comentarios si es necesario.
5. **`_test_xss.md`**: Mover a `tests/fixtures/xss-security/`.
6. **Validación**: Construir EXE release y probar fuera del repositorio.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `build.js` | Modified | Eliminar escritura de KhipuCodex.html (~2 líneas) |
| `src/file-handler.js` | Modified | Eliminar 2 bloques Blob download (~20 líneas) |
| `README.md` | Rewrite | Enfocar en EXE portable |
| `dx.bat` | Minor | Ajustar comentarios si aplica |
| `_test_xss.md` | Moved | A tests/fixtures/xss-security/ |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Eliminar `KhipuCodex.html` rompe algún flujo que dependa de él | Muy baja | Es copia exacta de `public/index.html`. Solo Tauri usa `public/` |
| Eliminar Blob fallbacks deja código huérfano en ramas Tauri | Baja | Las ramas Tauri son independientes (if/else), no hay código compartido |
| README con errores después del rewrite | Media | Revisión manual antes del commit |
| EXE no funciona fuera del repositorio | Media | Incluir como acceptance criteria: probar en carpeta vacía |

## Rollback Plan

```bash
git revert HEAD
# Reconstruir:
node build.js
```

## Dependencies

- Tauri CLI (`cargo tauri build`) para generar el EXE release
- WebView2 runtime instalado en Windows (requisito de Tauri)

## Success Criteria

- [ ] `node build.js` genera solo `public/index.html`, no `KhipuCodex.html`
- [ ] `file-handler.js` no contiene descargas Blob
- [ ] README solo menciona EXE portable; no hay "modo navegador"
- [ ] `_test_xss.md` está en `tests/fixtures/xss-security/`
- [ ] `cargo tauri build` produce EXE funcional
- [ ] EXE funciona fuera del repositorio (carpeta vacía, otra PC)
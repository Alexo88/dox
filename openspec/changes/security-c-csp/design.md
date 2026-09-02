# Design: Security C — CSP Hardening

## Problem

La propuesta original planteaba inyectar CSP únicamente en `build.js`. Eso deja fuera `index.html` (el template fuente), que se abre directamente en dev sin protección CSP. Con tres outputs que deben mantener coherencia:

| Output | Generado por | CSP actual |
|---|---|---|
| `index.html` (dev) | Template fuente — NO pasa por build.js | ❌ Ninguna |
| `KhipuCodex.html` | build.js → inlinea todo | ❌ Ninguna |
| `public/index.html` | build.js → mismo contenido que portable | ✅ Solo Tauri la aplica |

Si cada output tuviera su propia CSP, divergirían. La solución es una **fuente única gobernada por markers** en el template, igual que ya existe para CSS y scripts.

## CSP Architecture

### Source of Truth

El CSP vive en `index.html` dentro de un marker `DOCXLITE:CSP_START/END`, exactamente como ya existen `STYLE_START/END` y `SCRIPTS_START/END`. `build.js` lo preserva pasivamente porque su estrategia de reemplazo solo toca bloques entre markers conocidos — cualquier contenido fuera de esos markers pasa inalterado al output.

### Output Matrix

| Output | CSP source | `frame-ancestors` | `worker-src` | Notas |
|---|---|---|---|---|
| `index.html` (dev) | Marker en template | N/A (no soportado en `<meta>`) | `blob:` | Abierto directo en browser |
| `KhipuCodex.html` | Preservado por build.js desde el marker | N/A | `blob:` | Portable standalone |
| `public/index.html` | Preservado por build.js desde el marker | N/A | `blob:` | Cargado por webview de Tauri |
| Tauri enforcement | `tauri.conf.json` (securityPolicy) | `'none'` | `'self' blob:` | Aplicado por Tauri, se intersecta con el meta |

**Nota sobre la intersección**: Cuando Tauri aplica su CSP vía webview Y el HTML tiene un `<meta>` CSP, el browser **intersecta** ambas políticas (la más restrictiva gana). Esto significa que el meta CSP en `public/index.html` es redundante pero **no conflictivo** — si el meta permite algo que Tauri bloquea, Tauri gana. Si Tauri permite algo que el meta bloquea, el meta gana. En la práctica son compatibles porque la política del meta es un subconjunto de la de Tauri.

### CSP Policy Strings

**Template / Build (compartido)** — dentro del marker en `index.html`:
```
default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

**Tauri** — en `tauri.conf.json` (`security.csp`):
```
default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

### Diff entre ambas

| Directiva | Template/Build | Tauri | Razón |
|---|---|---|---|
| `worker-src` | `blob:` | `'self' blob:` | Tauri podría cargar worker desde `tauri://localhost` teóricamente; `'self'` es redundante pero segura |
| `frame-ancestors` | ❌ No incluida | `'none'` | No soportado en `<meta>` CSP. Solo funciona como header (Tauri) |

## Implementation Plan

### Phase 1: Template — agregar marker CSP en `index.html`

**Archivo**: `index.html`

Agregar en `<head>`, después del viewport meta:

```html
<!-- DOCXLITE:CSP_START -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
<!-- DOCXLITE:CSP_END -->
```

**Verificación**: `build.js` NO necesita cambios. Su algoritmo de `replaceBlock()` solo modifica contenido entre markers que conoce (`STYLE`, `MARKED`, `SCRIPTS`). El marker `CSP` no está en su lista de replacements, por lo que pasa inalterado a ambos outputs.

### Phase 2: Tauri config — actualizar `securityPolicy`

**Archivo**: `src-tauri/tauri.conf.json`

Reemplazar:
```
"csp": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
```

Por:
```
"csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"
```

### Phase 3: Validación

1. **Abrir `index.html` en browser** → abrir DevTools > Console. Verificar:
   - Sin errores CSP (bloqueos inesperados)
   - Drop DOCX funciona, viewer renderiza, tabs funcionan
   - Búsqueda, theme toggle, anotaciones funcionan
2. **Ejecutar `node build.js`** → abrir `KhipuCodex.html` en browser → misma validación
3. **Ejecutar `dx` (Tauri)** → DevTools > Console → misma validación + verificar que `frame-ancestors` no causa issues (no debería, no hay iframes)

### Rollback Plan

```bash
git checkout index.html src-tauri/tauri.conf.json
node build.js
```

Reconstruye ambos outputs con la CSP anterior (la que tenía `'unsafe-eval'` y `blob:` en img-src).

## Known Debt

| Deuda | Impacto | Mitigación |
|---|---|---|
| `'unsafe-inline'` en `script-src` y `style-src` | Estructural: el build inlinea todo en un solo HTML. Sin nonces/hashes, es necesario | Aceptado. Documentado como limitación de la arquitectura monolítica |
| `base-uri 'none'` | Si en el futuro se necesita `<base>`, rompe | Cambiar a `'self'` si surge necesidad |
| Meta CSP vs Tauri CSP se intersectan | El meta es redundante en Tauri, pero no conflictivo | Documentado. Si causa confusión, se puede quitar el meta de `public/index.html` con un marker condicional |

## Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| CSP bloquea funcionalidad legítima | Baja | Medio | Cada directiva fue verificada contra código fuente. `unsafe-inline` confirmado necesario |
| `data:` en `img-src` permite XSS limitado en imágenes SVG | Baja | Medio | El sanitizador de `file-handler.js` ya remueve scripts/style/foreignObject de SVGs. Es defensa en profundidad |
| Worker Blob no funciona con CSP más restrictiva | Muy baja | Alto | `worker-src blob:` está explícitamente incluida. Testear en los 3 outputs |

## Dependencies

- Ninguna externa. Solo cambios en `index.html` y `tauri.conf.json`.
- Build: `node build.js` (sin cambios en build.js mismo)
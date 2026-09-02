# Tasks: Security D — SVG Viewer Hardening

## Review Workload Forecast
- Estimated changed lines: ~40 (+ test fixtures)
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Static SVG sanitizer
- [x] 1.1 Agregar `set`, `animate`, `animateTransform`, `animateMotion`, `mpath` a REMOVED_TAGS
- [x] 1.2 Remover atributo `style` inline
- [x] 1.3 Restringir REF_TAGS a solo `use`, `a`, `image`, `cursor` (sacar animaciones)
- [x] 1.4 Corregir condicional duplicado `startsWith('#')`
- [x] 1.5 Mantener bloqueo existente: `script`, `foreignObject`, `style`, `on*`, `javascript:`

## Phase 2: Adversarial fixtures
- [x] 2.1 `set` mutando href → javascript:
- [x] 2.2 `animate` mutando href → data:image/svg+xml
- [x] 2.3 `animateMotion` con `mpath`
- [x] 2.4 `javascript:` directo en `<a>`
- [x] 2.5 `data:` en `<image>` href
- [x] 2.6 `style` attribute con `url(...)`
- [x] 2.7 SVG válido (path, rect, circle, text, gradient, use) — debe seguir funcionando

## Phase 3: Verify
- [x] 3.1 Build exitoso: `node build.js`
- [x] 3.2 Built outputs contienen el sanitizador actualizado
- [ ] 3.3 Probar SVGs adversariales en la app — verificar que se renderizan como estáticos sin errores
- [ ] 3.4 Probar SVG válido — verificar que se renderiza correctamente
- [ ] 3.5 Confirmar worker, DOCX, Markdown no afectados
# Design: Fase 3 — Modularización de app.js

## Technical Approach

Extraer cada módulo interno de `app.js` a su propio archivo en `src/`. `build.js` concatena los archivos en orden de dependencias, produciendo el mismo bundle que antes. No se usan ES modules reales (import/export) porque el build output es un solo HTML portable sin bundler — la concatenación lineal es suficiente.

## Architecture Decisions

### Decision: Concatenación ordenada vs. ES modules nativos

| Option | Tradeoff | Decision |
|--------|----------|----------|
| ES modules (`<script type="module">`) | Requiere servidor HTTP, no portable en HTML único | Rejected |
| Concatenación en build.js | Mismo output, cero cambios runtime, portable | **Chosen** |

### Decision: Orden de dependencias

Cada módulo se asigna a una posición numérica en un array de orden dentro de `build.js`:

```
constants(0) → dom-refs(1) → sanitize(2) → markdown(3) → theme(4) → progress(5) → sectionizer(6) → scroller(7) → search(8) → tabs(9) → file-handler(10) → annotation(11) → svg-viewer(12) → window(13) → main(14)
```

El orden garantiza que cualquier dependencia entre módulos (ej: FileHandler usa VirtualScroller) esté definida antes de usarse.

## Module Dependency Graph

```
constants       (no deps)
dom-refs        (constants)
sanitize        (constants)
markdown        (constants, sanitize)
theme           (constants, dom-refs)
progress        (constants, dom-refs)
sectionizer     (constants)
scroller        (constants, dom-refs, sectionizer)
search          (constants, dom-refs, scroller)
tabs            (constants, dom-refs, scroller)
file-handler    (constants, dom-refs, sanitize, scroller, tabs, markdown)
annotation      (constants, dom-refs, scroller)
svg-viewer      (constants, dom-refs, sanitize)
window          (constants, dom-refs)
main            (todos los anteriores)
```

## Build Process Change

```
Antes:  build.js → lee app.js → inline → KhipuCodex.html
Después: build.js → lee src/*.js en orden → concatena → inline → KhipuCodex.html
```

El pipeline de inline (CSS, mammoth, marked) se mantiene exactamente igual. Solo cambia la fuente del JavaScript.

## Testing Strategy

| Test | Method |
|------|--------|
| Build succeeds | `node build.js` exit code 0 |
| Bundle size | ~760 KB (sin cambios significativos) |
| Symbol check | 17 símbolos accesibles en `window.*` |
| Runtime | Abrir `KhipuCodex.html` en browser, probar funcionalidad core |

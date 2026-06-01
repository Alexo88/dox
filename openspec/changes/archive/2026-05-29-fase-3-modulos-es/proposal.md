# Proposal: Fase 3 — Dividir app.js monolítico en módulos ES separados

## Intent

`app.js` ha crecido a ~1390 líneas monolíticas con 9 módulos internos (ThemeManager, Progress, Sectionizer, VirtualScroller, etc.). Cada nueva feature requiere modificar este archivo gigante, aumentando el riesgo de conflictos y bugs. El objetivo es dividirlo en archivos separados bajo `src/`, manteniendo el mismo comportamiento y el mismo build output.

## Scope

### In Scope
- Crear 15 módulos individuales bajo `src/` extrayendo cada módulo interno de `app.js`
- Actualizar `build.js` para concatenar módulos en orden de dependencias
- Preservar el patrón object-literal module (sin clases ES6 ni exports/imports)
- Mantener el mismo bundle output (`KhipuCodex.html` ~760 KB)
- Los 17 símbolos públicos (módulos globales) deben ser accesibles post-build

### Out of Scope
- No se cambia la arquitectura interna de los módulos
- No se agregan imports/export ES module syntax (el bundle final es un solo script)
- No se modifica lógica de negocio

## Architecture
```
src/
├── constants.js        — APP_VERSION, platform detection
├── dom-refs.js         — $(), $$(), refs a elementos DOM fijos
├── sanitize.js         — _sanitizeHtml(), DOMPurify-like helpers
├── markdown.js         — marked.parse wrapper, saveMarkdownVersion
├── theme.js            — ThemeManager
├── progress.js         — Progress bar
├── sectionizer.js      — Sectionizer
├── scroller.js         — VirtualScroller
├── search.js           — SearchEngine
├── tabs.js             — TabManager
├── file-handler.js     — FileHandler
├── annotation.js       — AnnotationLayer (Fase 4 prep)
├── svg-viewer.js       — SVG viewer (Fase 5 prep)
├── window.js           — WindowControls
└── main.js             — Init (DOMContentLoaded), keyboard shortcuts
```

`build.js` concatena en orden de dependencias: constants primero, main al final.

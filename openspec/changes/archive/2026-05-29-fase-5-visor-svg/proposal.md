# Proposal: Fase 5 — Visor SVG

## Intent

Agregar soporte para visualizar archivos SVG en Khipu Codex. Los SVG son archivos de imagen vectorial que pueden contener scripts maliciosos, por lo que se requiere sanitización rigurosa. El visor opera como un path independiente — no pasa por VirtualScroller ni por el pipeline de render DOCX/MD.

## Scope

### In Scope
- Agregar `.svg` al `accept` del file-input en `index.html`
- Detectar extensión `.svg` en `FileHandler._openFile()` → derivar a `_openSvg()`
- Sanitizador custom de 6 pasos: remover `<script>`, `on*` event handlers, `javascript:` URLs, foreignObject, data: URIs, y tags no-SVG
- Insertar SVG sanitizado via `innerHTML` en un contenedor dedicado
- Estilos CSS para `.svg-container` (centrado, max-width, fondo)
- Path completamente independiente — no pasa por VirtualScroller ni `_renderHtml()`

### Out of Scope
- Edición de SVG
- Exportar SVG a otros formatos
- Miniaturas en el file picker

## Architecture
```
FileHandler._openFile()
    ↓ (detecta .svg)
FileHandler._openSvg(file)
    ↓ (lee como texto)
    → SvgViewer.render(svgText)
        ↓ (sanitiza 6 pasos)
        → innerHTML en .svg-container
```

### Sanitización (6 pasos)
1. Remover `<script>` tags y su contenido
2. Remover atributos `on*` (onclick, onload, onerror, etc.)
3. Remover `javascript:` y `data:` en href/xlink:href
4. Remover `<foreignObject>` (puede contener HTML arbitrario)
5. Validar namespace SVG (rechazar DOCTYPE, processing instructions)
6. Verificar que el output sea XML bien formado

### UI
- Visor ocupa el área del documento (como DOCX y MD)
- No tiene paginación ni scroll virtual — SVG se muestra completo con scroll natural
- Botón "Abrir" en file-input acepta `.svg`

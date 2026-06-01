# Proposal: Fase 4 — AnnotationLayer (Dibujo libre sobre documento)

## Intent

Agregar capacidad de anotar/dibujar sobre el documento visualizado (DOCX o MD renderizado) usando un canvas overlay sincronizado con VirtualScroller. Permite al usuario hacer marcas, destacar texto, dibujar formas y persistirlas entre sesiones.

## Scope

### In Scope
- Canvas overlay por sección, sincronizado con VirtualScroller (_materialize / _dematerialize hooks)
- Toolbar flotante: color, grosor, borrador, limpiar todo
- Persistencia en localStorage (`khipu-ann:nombrearchivo`)
- Botón toggle en titlebar (✏️ activar/desactivar modo anotación)
- Bug fix: guard `_measuring` para evitar race conditions en resize
- Bug fix: `AnnotationLayer.load()` en `restoreState()` para restaurar anotaciones al cambiar de tab

### Out of Scope
- Herramientas avanzadas (formas geométricas, texto, imágenes)
- Exportar anotaciones como imagen
- Soporte multi-usuario

## Architecture
```
AnnotationLayer = {
    annotations: Map<sectionIdx, [strokes]>,
    activeCanvas: null,
    enabled: false,

    enable()            → muestra toolbar + activa modo dibujo
    disable()           → oculta toolbar + desactiva
    toggle()            → enable/disable

    _attachCanvas(el, idx)     → crea canvas overlay sobre sección
    _detachCanvas(el, idx)     → serializa strokes antes de dematerializar
    _restoreCanvas(el, idx)    → redibuja strokes al materializar

    save(filename)             → localStorage: `khipu-ann:{filename}`
    load(filename)             → restaurar al abrir documento
    clear()                    → borrar todas las marcas del doc activo
}
```

### Integración VirtualScroller
- `_materialize()` hook: llamar `AnnotationLayer._restoreCanvas(el, idx)`
- `_dematerialize()` hook: llamar `AnnotationLayer._detachCanvas(el, idx)`
- Solo visible en modo visor (no en editor MD)

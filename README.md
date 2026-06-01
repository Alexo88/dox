# Khipu Codex

**Visor ultraligero de documentos DOCX, Markdown y SVG — Multi-pestaña, 100% Offline.**

Khipu Codex es una herramienta minimalista para leer, revisar y anotar documentos sin suites pesadas. Basado en Tauri v1 + Rust, maneja múltiples archivos de cientos de páginas con fluidez total y consumo mínimo de recursos.

---

## Características

- **Sistema de Pestañas:** Abrí múltiples documentos en una sola ventana. Navegación fluida y eficiente.
- **Interfaz Moderna:** Ventana *frameless* con título personalizado, estilo macOS/VS Code.
- **Formatos:** `.docx`, `.md`, `.markdown`, `.svg` — todos nativos, sin plugins.
- **Virtual Scrolling:** Renderizado inteligente que solo dibuja lo que ves en pantalla. Documentos de 500+ páginas sin que el navegador se cuelgue.
- **Anotaciones en Canvas:** Dibujá a mano alzada sobre las secciones del documento. Toolbar flotante con colores, grosores y borrador. Persistencia por documento en localStorage.
- **Editor de Markdown:** Editá y previsualizá archivos `.md`. Guardado a disco (Tauri `writeTextFile`) o descarga (Blob). Backup automático de versiones.
- **Búsqueda Inteligente (Ctrl+F):** Buscá texto en todas las secciones, con resaltado en tiempo real y navegación entre resultados.
- **Modo Oscuro/Claro:** Interfaz que se adapta a tu preferencia visual y se persiste entre sesiones.
- **100% Privacidad & Offline:** Tus documentos nunca salen de tu computadora. No requiere internet ni servidores externos.
- **Open-with:** Soporte para "Abrir con..." desde el explorador de Windows (Tauri).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla (15 módulos ES) |
| Backend nativo | Rust (Tauri v1) — 6 comandos |
| Procesamiento DOCX | Mammoth.js en Web Worker |
| Parser Markdown | marked.js v15.0.12 (GFM) |
| Anotaciones | Canvas API nativa + localStorage |
| Empaquetado | Tauri CLI + build.js (781 KB output) |

---

## Arquitectura

```
src/
├── constants.js      — Constantes globales
├── dom-refs.js       — Refs DOM
├── theme.js          — Modo oscuro/claro
├── progress.js       — Barra de progreso
├── markdown.js       — Backup de versiones MD
├── sectionizer.js    — Parseo HTML a secciones
├── scroller.js       — VirtualScroller
├── search.js         — Búsqueda (Ctrl+F)
├── tabs.js           — Gestión de pestañas
├── annotation.js     — Canvas overlay + dibujo
├── svg-viewer.js     — Sanitizador SVG custom
├── window.js         — Controles de ventana
├── keyboard.js       — Atajos de teclado
├── file-handler.js   — Orquestador DOCX/MD/SVG
└── main.js           — Init + titlebar drag
```

---

## Cómo Usarlo

### Modo portable (HTML)
Abrí `index.html` en cualquier navegador moderno. Sin instalación. Función completa excepto open-with y guardado a disco nativo.

### Modo nativo (EXE)
Ejecutá `dx.bat` o el binario compilado en `src-tauri/target/release/app.exe` para ventana nativa con arrastrar archivos, guardado a disco y open-with.

---

## Build

```bash
# HTML portable
node build.js

# Nativo Windows (dentro de src-tauri)
cd src-tauri
cargo tauri build
```

Requiere: Rust (Cargo), Node.js, Tauri CLI (`cargo install tauri-cli --version "^1"`).

---

**v0.3.0** — Hecho por **Maudev** — Pensado para la velocidad.

# Khipu Codex

**Visor portable de documentos para Windows — un solo EXE, 100% offline.**

Khipu Codex es una herramienta minimalista para leer, revisar y anotar documentos DOCX, Markdown y SVG sin suites pesadas. Basado en Tauri v1 + Rust, maneja múltiples archivos de cientos de páginas con fluidez total y consumo mínimo de recursos.

---

## Características

- **Sistema de Pestañas:** Abrí múltiples documentos en una sola ventana. Navegación fluida y eficiente.
- **Split View / Book Mode:** Compará dos documentos lado a lado con scroll sincronizado (Sync), intercambio de paneles (Swap), divisor redimensionable y atajo `Ctrl+\`. Drag & drop de pestañas o archivos al lateral para abrir en comparación.
- **Single-instance (reusar ventana):** "Abrir con..." reutiliza la ventana existente y abre el archivo en una nueva pestaña. Toggle en la titlebar (🗂️ Reusar / 🪟 Nueva ventana) persistido en `settings.json` + `localStorage`.
- **Interfaz Moderna:** Ventana *frameless* con título personalizado, estilo macOS/VS Code.
- **Formatos:** `.docx`, `.md`, `.markdown`, `.svg` — todos nativos, sin plugins.
- **Virtual Scrolling:** Renderizado inteligente que solo dibuja lo que ves en pantalla. Documentos de 500+ páginas sin que el navegador se cuelgue.
- **Anotaciones en Canvas:** Dibujá a mano alzada sobre las secciones del documento. Toolbar flotante con colores, grosores y borrador. Persistencia por documento en localStorage.
- **Editor de Markdown:** Editá y previsualizá archivos `.md`. Guardado a disco nativo. Backup automático de versiones.
- **Búsqueda Inteligente (Ctrl+F):** Buscá texto en todas las secciones, con resaltado en tiempo real y navegación entre resultados.
- **Modo Oscuro/Claro:** Interfaz que se adapta a tu preferencia visual y se persiste entre sesiones.
- **100% Privacidad & Offline:** Tus documentos nunca salen de tu computadora. No requiere internet ni servidores externos.
- **Open-with + Single-instance:** Soporte para "Abrir con..." desde el explorador de Windows con reutilización de ventana.
- **100% Tauri (EXE-only):** Sin `KhipuCodex.html` portable — la app se distribuye exclusivamente como EXE (`public/index.html` vía `build.js`).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla (15 módulos ES) |
| Backend nativo | Rust (Tauri v1) — 6 comandos |
| Procesamiento DOCX | Mammoth.js en Web Worker |
| Parser Markdown | marked.js v15.0.12 (GFM) |
| Anotaciones | Canvas API nativa + localStorage |
| Empaquetado | Tauri CLI para EXE nativo |

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

Ejecutá `dx.bat` o el binario compilado en `src-tauri/target/release/app.exe` para la ventana nativa con arrastrar archivos, guardado a disco y open-with.

### Requisito de sistema

- **Windows 10 o superior** con **WebView2 Runtime** instalado (viene incluido en Windows 11 y en updates recientes de Windows 10).
- Si no lo tenés, descargalo gratis de [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Descargar EXE release

Descargá la última versión desde la sección [Releases](https://github.com/Alexo88/dox/releases) de GitHub. Es un solo archivo `.exe` portable — no requiere instalación.

---

## Build

```bash
# Empaquetar frontend (genera public/index.html)
node build.js

# Compilar EXE nativo
cd src-tauri
cargo tauri build
```

Requiere: Rust (Cargo), Node.js, Tauri CLI (`cargo install tauri-cli --version "^1"`).

---

## Licencia

**v0.4.0** — Hecho por **Maudev** — Pensado para la velocidad.

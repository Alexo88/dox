# 🚀 DocxLite

**El visor de documentos DOCX definitivo: Ultra-ligero, Multi-pestaña y 100% Offline.**

DocxLite es una herramienta minimalista diseñada para reemplazar suites pesadas (como Microsoft Office) cuando solo necesitás **leer**, **revisar** o **comparar** documentos rápidamente. Basado en una arquitectura de alto rendimiento, DocxLite maneja múltiples archivos de cientos de páginas con fluidez total y consumo mínimo de recursos.

---

## ✨ Características Principales

*   **🗂️ Sistema de Pestañas:** Abrí múltiples documentos en una sola ventana. Navegación fluida y eficiente.
*   **🎨 Interfaz Moderna:** Ventana *frameless* con diseño estilo macOS/VS Code para máxima área de lectura.
*   **⚡️ Carga Instantánea:** Olvidate de esperar a que Word cargue. DocxLite abre archivos `.docx` y `.md` en milisegundos.
*   **🏎️ Virtual Scrolling:** Renderizado inteligente que solo dibuja lo que ves en pantalla. Leé documentos de 500 páginas sin que el navegador se cuelgue.
*   **🔒 100% Privacidad & Offline:** Tus documentos nunca salen de tu computadora. No requiere internet ni servidores externos.
*   **📝 Editor de Markdown:** Editá y previsualizá archivos `.md` directamente con un flujo de trabajo ágil.
*   **🔍 Búsqueda Inteligente (Ctrl+F):** Buscá texto en segundos, con resaltado en tiempo real.
*   **🌙 Modo Oscuro/Claro:** Interfaz elegante que se adapta a tu preferencia visual.

---

## 🛠️ Cómo Usarlo (Atajos Rápidos)

DocxLite está diseñado para la terminal y el uso fluido con teclado:

*   **Comando `dx`:** Escribí `dx` en tu terminal y la aplicación se abrirá al instante (desde cualquier carpeta).
*   **`Ctrl + O`**: Abrir un nuevo archivo en una pestaña nueva.
*   **`Ctrl + F`**: Foco en la barra de búsqueda superior.
*   **`Ctrl + W`**: Cerrar la pestaña actual.
*   **`Esc`**: Salir de la búsqueda o limpiar el filtro.
*   **`Drag & Drop`**: Arrastrá archivos directamente a la ventana para abrirlos.

---

## 🏗️ Arquitectura Técnica

DocxLite es un híbrido nativo optimizado:

1.  **Núcleo Rust (Tauri v1):** Empaquetado como una aplicación Windows nativa de ~5MB.
2.  **Web Worker & Mammoth.js:** El procesamiento de los documentos Word ocurre en un hilo separado para no congelar la interfaz.
3.  **Lazy DOM Management:** Las pestañas inactivas no consumen memoria DOM; se recrean instantáneamente al activarlas.
4.  **Zero-Dependencies (Runtime):** Todo el código está inyectado para máxima portabilidad.

---

## 🚀 Instalación para Desarrolladores

Si querés modificar DocxLite, necesitás **Rust** (Cargo) y **Node.js**:

1.  **Clonar el repo:** `git clone https://github.com/Alexo88/dox.git`
2.  **Instalar Tauri CLI:** `cargo install tauri-cli --version "^1"` (si no lo tenés).
3.  **Lanzar en modo dev:** `cargo tauri dev` (dentro de `src-tauri`).
4.  **Generar versión final:** `cargo tauri build`.
5.  **Build del HTML portable:** `node build.js`.

---

## ⚖️ Licencia

Hecho por **Maudev** — Pensado para la velocidad. 🏎️💨

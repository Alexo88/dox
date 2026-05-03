# 🚀 DocxLite

**El visor de documentos DOCX definitivo: Ultra-ligero, Instantáneo y 100% Offline.**

DocxLite es una herramienta minimalista diseñada para reemplazar suites pesadas (como Microsoft Office) cuando solo necesitás **leer** o **revisar** un documento rápidamente. Basado en una arquitectura de alto rendimiento, DocxLite maneja archivos de cientos de páginas con fluidez total y consumo mínimo de recursos.

---

## ✨ Características Principales

*   **⚡️ Carga Instantánea:** Olvidate de esperar a que Word cargue. DocxLite abre archivos `.docx` y `.md` en milisegundos.
*   **🏎️ Virtual Scrolling:** Renderizado inteligente que solo dibuja lo que ves en pantalla. Podés leer documentos de 500 páginas sin que el navegador se cuelgue ni consuma gigas de RAM.
*   **🔒 100% Privacidad & Offline:** Tus documentos nunca salen de tu computadora. No requiere internet ni servidores externos.
*   **📝 Editor de Markdown:** Editá y previsualizá archivos `.md` directamente con un flujo de trabajo ágil.
*   **🔍 Búsqueda Inteligente (Ctrl+F):** Buscá texto en segundos, incluso en las partes del documento que aún no están renderizadas en pantalla.
*   **🌙 Modo Oscuro/Claro:** Interfaz elegante que se adapta a tu preferencia visual para reducir la fatiga ocular.
*   **🖱️ Drag & Drop:** Arrastrá cualquier archivo y empezá a leer al instante.

---

## 🛠️ Cómo Usarlo (Atajos Rápidos)

DocxLite está diseñado para la terminal y el uso fluido con teclado:

*   **Comando `dx` o `docx`:** Escribí `dx` en tu terminal y la aplicación se abrirá al instante.
*   **`Ctrl + O`**: Abrir un nuevo archivo.
*   **`Ctrl + F`**: Abrir la barra de búsqueda.
*   **`Esc`**: Cerrar menús o la barra de búsqueda.
*   **Botón 'Editar' (en MD)**: Cambia a modo edición. Dale a **'Ver'** para guardar cambios y renderizar.

---

## 🏗️ Arquitectura Técnica

DocxLite no es solo una página web; es un híbrido nativo optimizado:

1.  **Núcleo Rust (Tauri):** Empaquetado como una aplicación Windows nativa de menos de 2MB.
2.  **Web Worker & Mammoth.js:** El procesamiento de los documentos Word ocurre en un hilo separado del sistema para no congelar la interfaz durante la conversión.
3.  **Virtual Scroller de Alto Desempeño:** Dividimos el documento en "secciones" y usamos `IntersectionObserver` para mantener el DOM limpio y rápido.
4.  **Zero-Dependencies (en Runtime):** Todo el código necesario está inyectado dentro de la app para máxima portabilidad.

---

## 🚀 Instalación para Desarrolladores

Si querés modificar o mejorar DocxLite, necesitás tener instalado **Rust** y **Node.js**:

1.  **Clonar el repo:** `git clone https://...`
2.  **Instalar dependencias de Tauri:** `cargo tauri init` (si aún no lo hiciste).
3.  **Lanzar en modo dev:** `dx` (o `cargo tauri dev` dentro de `src-tauri`).
4.  **Generar versión final:** `cargo tauri build`.

---

## ⚖️ Licencia

Hecho por **Maudev** — Pensado para la velocidad. 🏎️💨

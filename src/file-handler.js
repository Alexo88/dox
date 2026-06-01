/* Khipu Codex — src/file-handler.js */

'use strict';

// Worker factory (replaceable by build.js)
const createWorker = () => new Worker('docx.worker.js'); // DOCXLITE_WORKER

/* ═══════════════════════════════════════════
   9. FileHandler
   ═══════════════════════════════════════════ */
const FileHandler = {
    worker: null,
    currentMarkdown: null,
    currentMarkdownName: null,
    currentFileName: null,
    currentFilePath: null, // Ruta completa (solo en Tauri)
    isEditing: false,

    init() {
        // Crear Web Worker
        this.worker = createWorker();
        this.worker.onmessage = (e) => this._onWorkerMessage(e.data);
        this.worker.onerror = (e) => {
            console.error('Worker error:', e);
            Progress.show('Error al procesar el documento', 0);
            setTimeout(Progress.hide, 2000);
        };

        // Drag & Drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        // Click en dropzone abre file picker
        dropzone.addEventListener('click', () => fileInput.click());

        // Botón abrir
        btnOpen.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFile(e.target.files[0]);
            fileInput.value = ''; // Reset para permitir re-seleccionar mismo archivo
        });

        // Botón editar markdown
        if (btnEdit) {
            btnEdit.addEventListener('click', () => this.toggleMarkdownEdit());
        }

        // Botón guardar
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveCurrentMarkdown());
        }

        // También soportar drop en toda la ventana cuando el viewer está activo
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && !dropzone.classList.contains('hidden')) return; // Ya manejado por dropzone
            if (file) this.handleFile(file);
        });

        // Ctrl+O para abrir
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // Leer argumento si se abrió con "Abrir con..." desde Explorer
        this._handleOpenWithArgv();
    },

    /**
     * Lee el path pasado como argumento al abrir la app con un archivo
     * (Windows: "Abrir con...", doble click si es predeterminado)
     */
    async _handleOpenWithArgv() {
        if (typeof window.__TAURI__ === 'undefined' ||
            typeof window.__TAURI__.invoke === 'undefined') {
            console.log('[Khipu] No Tauri — skip argv');
            return;
        }

        try {
            // Usamos invoke directo a nuestro comando Rust get_open_args
            const args = await window.__TAURI__.invoke('get_open_args');
            console.log('[Khipu] get_open_args:', args);

            if (!args || args.length === 0) {
                console.log('[Khipu] No file argument in argv');
                return;
            }

            const filePath = args[0];
            if (!filePath || typeof filePath !== 'string') {
                console.warn('[Khipu] Invalid file path arg:', filePath);
                return;
            }

            console.log('[Khipu] Opening file from argv:', filePath);

            const lower = filePath.toLowerCase();
            const isMarkdown = lower.endsWith('.md') || lower.endsWith('.markdown');
            const isDocx = lower.endsWith('.docx');
            const isSvg = lower.endsWith('.svg');
            if (!isMarkdown && !isDocx && !isSvg) return;

            // Extraer nombre del archivo
            const parts = filePath.replace(/\\/g, '/').split('/');
            const fileName = parts.pop();

            this.currentFileName = fileName;
            this.currentFilePath = filePath; // Guardar para poder sobreescribir
            document.title = fileName + ' — Khipu Codex';
            SearchEngine.reset();
            dropzone.classList.add('hidden');
            viewer.classList.remove('hidden');

            if (isMarkdown) {
                this.currentMarkdownName = fileName;
                Progress.show('Leyendo markdown...', 30);
                const text = await window.__TAURI__.fs.readTextFile(filePath);
                Progress.show('Renderizando markdown...', 70);
                this._renderMarkdown(String(text));
            } else {
                // .docx
                this.currentMarkdown = null;
                this.currentMarkdownName = null;
                this.isEditing = false;
                if (btnEdit) btnEdit.classList.add('hidden');
                if (markdownEditor) markdownEditor.classList.add('hidden');

                Progress.show('Leyendo archivo...', 20);
                const raw = await window.__TAURI__.fs.readBinaryFile(filePath);
                // readBinaryFile devuelve number[] o Uint8Array según versión
                const uint8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                const arrayBuffer = uint8.buffer.slice(0);
                Progress.show('Procesando documento...', 50);
                this.worker.postMessage(arrayBuffer, [arrayBuffer]);
            }

            if (isSvg) {
                this.currentMarkdown = null;
                this.currentMarkdownName = null;
                this.isEditing = false;
                if (btnEdit) btnEdit.classList.add('hidden');
                if (markdownEditor) markdownEditor.classList.add('hidden');

                Progress.show('Leyendo SVG...', 30);
                const text = await window.__TAURI__.fs.readTextFile(filePath);
                Progress.show('Renderizando SVG...', 100);
                this._openSvg(String(text), fileName);
                return;
            }
        } catch (err) {
            console.warn('[Khipu] Error al abrir archivo desde argumentos:', err);
        }
    },

    /**
     * Guarda el markdown actual a disco (Tauri) o descarga (browser).
     */
    async saveCurrentMarkdown() {
        if (!this.currentMarkdown) return;

        // Sincronizar último valor desde el editor si está abierto
        if (this.isEditing && markdownEditor && !markdownEditor.classList.contains('hidden')) {
            this.currentMarkdown = markdownEditor.value;
        }

        const content = this.currentMarkdown;
        const name = this.currentMarkdownName || this.currentFileName || 'documento.md';

        // Backup automático antes de guardar
        saveMarkdownVersion(name, content);

        if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.fs) {
            try {
                // Tauri: escribir al archivo original o pedir destino
                let targetPath = this.currentFilePath;

                if (!targetPath) {
                    // No hay path (archivo abierto por file picker) → save dialog
                    const selected = await window.__TAURI__.dialog.save({
                        defaultPath: name,
                        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
                    });
                    if (!selected) return;
                    targetPath = selected;
                }

                await window.__TAURI__.fs.writeTextFile(targetPath, content);
                this.currentFilePath = targetPath;
                this.currentFileName = targetPath.replace(/\\/g, '/').split('/').pop();
                document.title = this.currentFileName + ' — Khipu Codex';
                saveMarkdownVersion(name, content); // backup post-save
                Progress.show('✅ Guardado', 100);
                setTimeout(Progress.hide, 1200);
                console.log('[Khipu] Markdown guardado en:', targetPath);
            } catch (err) {
                console.error('[Khipu] Error al guardar:', err);
                Progress.show('❌ Error al guardar', 0);
                setTimeout(Progress.hide, 2000);
            }
        } else {
            // Browser: descarga via Blob
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Progress.show('✅ Descargado', 100);
            setTimeout(Progress.hide, 1200);
        }
    },

    /**
     * Procesa un archivo .docx o markdown
     * @param {File} file
     */
    handleFile(file) {
        const lowerName = file.name.toLowerCase();
        const isDocx = lowerName.endsWith('.docx');
        const isMarkdown = lowerName.endsWith('.md') || lowerName.endsWith('.markdown');

        // SVG — path independiente (sin virtualización ni sanitización HTML)
        if (lowerName.endsWith('.svg')) {
            this.currentFileName = file.name;
            this.currentFilePath = null;
            document.title = file.name + ' — Khipu Codex';

            const reader = new FileReader();
            reader.onload = (e) => {
                Progress.show('Renderizando SVG...', 100);
                this._openSvg(String(e.target.result), file.name);
            };
            reader.onerror = () => {
                Progress.show('Error al leer el archivo', 0);
                setTimeout(Progress.hide, 2000);
            };
            reader.readAsText(file);
            return;
        }

        // Validar extension
        if (!isDocx && !isMarkdown) {
            alert('Solo se admiten archivos .docx, .md o .markdown');
            return;
        }

        // Resetear busqueda para evitar resultados antiguos
        SearchEngine.reset();

        // Guardar nombre del archivo
        this.currentFileName = file.name;
        document.title = file.name + ' — Khipu Codex';

        if (isMarkdown) {
            this.currentMarkdownName = file.name;
            Progress.show('Leyendo markdown...', 30);
            const reader = new FileReader();
            reader.onload = (e) => {
                Progress.show('Renderizando markdown...', 70);
                const text = e.target.result || '';
                this._renderMarkdown(String(text));
            };
            reader.onerror = () => {
                Progress.show('Error al leer el archivo', 0);
                setTimeout(Progress.hide, 2000);
            };
            reader.readAsText(file);
            return;
        }

        // Reset estado markdown
        this.currentMarkdown = null;
        this.currentMarkdownName = null;
        this.isEditing = false;
        if (btnEdit) btnEdit.classList.add('hidden');
        if (markdownEditor) markdownEditor.classList.add('hidden');

        console.log('[LOG] Procesando DOCX:', file.name);
        // Reset viewer
        viewer.innerHTML = '';
        viewer.classList.remove('hidden');
        dropzone.classList.add('hidden');

        // Leer archivo DOCX
        Progress.show('Leyendo archivo...', 20);

        const reader = new FileReader();
        reader.onload = (e) => {
            Progress.show('Procesando documento...', 50);
            const arrayBuffer = e.target.result;
            // Transferir al Worker (zero-copy)
            this.worker.postMessage(arrayBuffer, [arrayBuffer]);
        };
        reader.onerror = () => {
            Progress.show('Error al leer el archivo', 0);
            setTimeout(Progress.hide, 2000);
        };
        reader.readAsArrayBuffer(file);
    },

    toggleMarkdownEdit() {
        if (!this.currentMarkdown || !markdownEditor || !btnEdit) return;

        if (this.isEditing) {
            // Guardar cambios y volver a vista lectura
            this.currentMarkdown = markdownEditor.value;
            saveMarkdownVersion(this.currentMarkdownName, this.currentMarkdown);
            this.isEditing = false;
            btnEdit.innerHTML = '<span class="icon">📝</span> Editar';
            if (btnSave) btnSave.classList.add('hidden');
            markdownEditor.classList.add('hidden');
            viewer.classList.remove('hidden');
            this._renderMarkdown(this.currentMarkdown);
        } else {
            // Entrar en modo edición
            // Deshabilitar anotaciones si están activas
            if (typeof AnnotationLayer !== 'undefined' && AnnotationLayer.enabled) {
                AnnotationLayer.toggle();
            }
            this.isEditing = true;
            btnEdit.innerHTML = '<span class="icon">👁️</span> Ver';
            if (btnSave) btnSave.classList.remove('hidden');
            // Sincronizar currentMarkdown desde la tab activa
            const activeTab = TabManager.getActiveTab();
            if (activeTab) {
                this.currentMarkdown = activeTab.markdown || this.currentMarkdown;
                this.currentMarkdownName = activeTab.name;
            }
            SearchEngine.reset();
            markdownEditor.value = this.currentMarkdown;
            markdownEditor.classList.remove('hidden');
            viewer.classList.add('hidden');
            dropzone.classList.add('hidden');
            markdownEditor.focus();
        }
    },

    _renderMarkdown(sourceText) {
        this.currentMarkdown = sourceText;
        SearchEngine.reset();
        saveMarkdownVersion(this.currentMarkdownName, sourceText);
        this.isEditing = false;
        if (btnEdit) {
            btnEdit.classList.remove('hidden');
            btnEdit.innerHTML = '<span class="icon">📝</span> Editar';
        }
        // Cargar anotaciones guardadas para este documento
        if (typeof AnnotationLayer !== 'undefined') {
            AnnotationLayer.load(this.currentMarkdownName);
        }

        this._renderHtml(marked.parse(sourceText));
    },

    _openSvg(svgText, fileName) {
        this.currentMarkdown = null;
        this.currentMarkdownName = null;
        this.isEditing = false;
        if (btnEdit) btnEdit.classList.add('hidden');
        if (markdownEditor) markdownEditor.classList.add('hidden');

        try {
            const sanitized = SvgViewer.sanitize(svgText);
            this._renderSvg(sanitized, fileName);
        } catch (err) {
            console.error('[Khipu] SVG inválido:', err);
            Progress.show('Error: el archivo no es un SVG válido', 0);
            setTimeout(Progress.hide, 2500);
        }
    },

    _renderSvg(svgSanitized, name) {
        const wrapped = SvgViewer.wrap(svgSanitized);
        Progress.show('Renderizando SVG...', 100);

        const sections = Sectionizer.parse(wrapped);
        SearchEngine.reset();
        Progress.hide();

        // Si ya hay una tab activa con el mismo nombre, actualizarla
        const active = TabManager.getActiveTab();
        if (active && active.name === name) {
            TabManager.updateActiveTab(wrapped, sections, null);
            return;
        }

        TabManager.openDocument(name, wrapped, sections, {
            markdown: null
        });

        setTimeout(() => {
            if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
                window.__TAURI__.invoke('expand_window_for_document')
                    .then(() => console.log('Ventana expandida'))
                    .catch(err => console.log('Error al expandir:', err));
            }
        }, 100);
    },

    /**
     * Sanitiza HTML contra XSS: filtra protocolos en href y elimina handlers inline.
     * Sin DOMPurify (no está en el bundle) usa DOMParser nativo.
     * Reemplazar cuerpo con DOMPurify cuando se agregue al bundle.
     */
    _sanitizeHtml(html) {
        const SAFE_PROTOCOLS = ['http://', 'https://', 'mailto:', '#', '/'];
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Filtrar href en links
        doc.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            const hasSafeProtocol = SAFE_PROTOCOLS.some(p => href.toLowerCase().startsWith(p));
            if (!hasSafeProtocol) a.setAttribute('href', '#');
        });

        // Eliminar event handlers inline (onclick, onerror, etc.)
        doc.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
            });
        });

        return doc.body.innerHTML;
    },

    _renderHtml(html, messages) {
        const cleanHtml = this._sanitizeHtml(html);
        const sections = Sectionizer.parse(cleanHtml);

        const name = this.currentMarkdownName || this.currentFileName || 'Documento';

        // Si ya hay una tab activa con el mismo documento, actualizarla en vez de crear duplicado
        const active = TabManager.getActiveTab();
        if (active && active.name === name) {
            TabManager.updateActiveTab(html, sections, this.currentMarkdown);
            return;
        }

        // Use TabManager to open as a tab
        TabManager.openDocument(name, html, sections, {
            messages,
            markdown: this.currentMarkdown
        });

        // Log warnings de mammoth (si hay)
        if (messages && messages.length > 0) {
            console.info('Mammoth warnings:', messages);
        }
    },

    /**
     * Respuesta del Worker
     */
    _onWorkerMessage(data) {
        if (data.type === 'error') {
            Progress.show('Error: ' + data.error, 0);
            setTimeout(Progress.hide, 3000);
            return;
        }

        if (data.type === 'success') {
            Progress.show('Renderizando...', 80);

            // Sectionizar el HTML
            const html = data.html;
            data.html = null;

            this._renderHtml(html, data.messages);

            // Expandir ventana para lectura (en Tauri)
            // En Tauri v1, usamos __TAURI__ que se expone con withGlobalTauri: true
            setTimeout(() => {
                if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
                    window.__TAURI__.invoke('expand_window_for_document')
                        .then(() => console.log('Ventana expandida'))
                        .catch(err => console.log('Error al expandir:', err));
                }
            }, 100);
        }
    }
};

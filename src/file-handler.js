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
    currentDocumentToken: null, // Token del documento actual (Rust side)
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
     * Ahora usa open_document_from_argv que lee argv internamente y devuelve DocumentInfo
     */
    async _handleOpenWithArgv() {
        if (typeof window.__TAURI__ === 'undefined' ||
            typeof window.__TAURI__.invoke === 'undefined') {
            console.log('[Khipu] No Tauri — skip argv');
            return;
        }

        try {
            // open_document_from_argv lee argv internamente y abre el primer archivo
            const result = await window.__TAURI__.invoke('open_document_from_argv');
            console.log('[Khipu] open_document_from_argv result:', result);

            if (!result) {
                console.log('[Khipu] No file argument in argv');
                return;
            }

            // Guardar token y nombre
            this.currentDocumentToken = result.token;
            this.currentFileName = result.file_name;
            document.title = result.file_name + ' — Khipu Codex';
            SearchEngine.reset();
            dropzone.classList.add('hidden');
            viewer.classList.remove('hidden');

            if (result.is_text) {
                const text = new TextDecoder('utf-8').decode(new Uint8Array(result.content));
                const lowerName = result.file_name.toLowerCase();
                if (lowerName.endsWith('.svg')) {
                    // SVG — ruta independiente
                    this.currentMarkdown = null;
                    this.currentMarkdownName = null;
                    this.isEditing = false;
                    if (btnEdit) btnEdit.classList.add('hidden');
                    if (markdownEditor) markdownEditor.classList.add('hidden');
                    Progress.show('Renderizando SVG...', 100);
                    this._openSvg(text, result.file_name);
                } else {
                    // Markdown
                    this.currentMarkdownName = result.file_name;
                    Progress.show('Renderizando...', 70);
                    this._renderMarkdown(text);
                }
            } else {
                // DOCX binario
                this.currentMarkdown = null;
                this.currentMarkdownName = null;
                this.isEditing = false;
                if (btnEdit) btnEdit.classList.add('hidden');
                if (markdownEditor) markdownEditor.classList.add('hidden');

                Progress.show('Procesando documento...', 50);
                const uint8 = new Uint8Array(result.content);
                const arrayBuffer = uint8.buffer.slice(0);
                this.worker.postMessage(arrayBuffer, [arrayBuffer]);
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

        if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
            try {
                // Tauri: guardar con token existente o pedir destino
                if (this.currentDocumentToken) {
                    // Ya tenemos token — sobrescribir el mismo archivo
                    const result = await window.__TAURI__.invoke('save_markdown', {
                        token: this.currentDocumentToken,
                        existing_token: this.currentDocumentToken,
                        content: content
                    });

                    this.currentFileName = result.replace(/\\/g, '/').split('/').pop();
                    document.title = this.currentFileName + ' — Khipu Codex';
                } else {
                    // No hay token (archivo abierto por file picker) — Save As dialog
                    await this._saveMarkdownAs(content, name);
                    return;
                }
                saveMarkdownVersion(name, content); // backup post-save
                Progress.show('✅ Guardado', 100);
                setTimeout(Progress.hide, 1200);
                console.log('[Khipu] Markdown guardado en:', result);
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
     * Guarda como nuevo archivo (Save As) — usa comando Rust save_markdown_as.
     * Funciona sin token inicial (archivos abiertos por file picker).
     * Actualiza currentDocumentToken y currentFileName con el resultado.
     * @param {string} content — Contenido markdown a guardar
     * @param {string} suggestedName — Nombre sugerido para el diálogo
     */
    async _saveMarkdownAs(content, suggestedName) {
        if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
            try {
                // save_markdown_as devuelve { path, new_token } o error si cancela
                const result = await window.__TAURI__.invoke('save_markdown_as', {
                    token: this.currentDocumentToken || '',
                    content: content,
                    suggested_name: suggestedName
                });

                if (!result || !result.path) {
                    saveMarkdownVersion(suggestedName, content);
                    return; // Usuario canceló el diálogo
                }

                this.currentDocumentToken = result.new_token;
                this.currentFileName = result.path.replace(/\\/g, '/').split('/').pop();
                document.title = this.currentFileName + ' — Khipu Codex';
                saveMarkdownVersion(suggestedName, content);
                Progress.show('✅ Guardado como', 100);
                setTimeout(Progress.hide, 1200);
                console.log('[Khipu] Markdown guardado como:', result.path);
            } catch (err) {
                console.error('[Khipu] Error al guardar como:', err);
                Progress.show('❌ Error al guardar', 0);
                setTimeout(Progress.hide, 2000);
            }
        } else {
            // Browser: descarga via Blob
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = suggestedName;
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
            this.currentDocumentToken = null;
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
            this.currentDocumentToken = null; // Archivo local del browser, no hay token Rust
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

        // Pasar documentToken (null para archivos locales del browser)
        TabManager.openDocument(name, wrapped, sections, {
            markdown: null,
            documentToken: this.currentDocumentToken
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
     * Sanitiza HTML contra XSS usando una política allowlist.
     * No depende de marked ni de DOMPurify — opera sobre el HTML ya generado.
     *
     * Elimina elementos activos, atributos inline peligrosos y
     * restringe protocolos en URLs. No confía en marked como frontera de seguridad.
     */
    _sanitizeHtml(html) {
        const BLOCKED_TAGS = [
            'script', 'style', 'iframe', 'object', 'embed', 'form',
            'input', 'button', 'textarea', 'select', 'option', 'optgroup',
            'meta', 'base', 'link', 'noscript', 'svg', 'math'
        ];
        const DANGEROUS_ATTRS = [
            'srcdoc', 'formaction', 'formmethod', 'formenctype',
            'action', 'data', 'xlink:href', 'autofocus'
        ];
        const SAFE_PROTOCOLS = ['http://', 'https://', 'mailto:', '#', '/'];
        const URL_ATTRS = ['href', 'src', 'srcset'];

        const doc = new DOMParser().parseFromString(html, 'text/html');

        // 1. Remover elementos activos/peligrosos
        BLOCKED_TAGS.forEach(tag => {
            doc.querySelectorAll(tag).forEach(el => el.remove());
        });

        // 2. Remover atributos inline peligrosos y handlers de eventos
        doc.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                } else if (DANGEROUS_ATTRS.includes(name)) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 3. Restringir protocolos en href, src, srcset
        doc.querySelectorAll('*').forEach(el => {
            URL_ATTRS.forEach(attr => {
                const val = el.getAttribute(attr);
                if (!val) return;
                const isSafe = SAFE_PROTOCOLS.some(p => val.toLowerCase().startsWith(p));
                if (!isSafe) el.removeAttribute(attr);
            });
        });

        // 4. Agregar rel="noopener noreferrer" a enlaces externos
        doc.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href') || '';
            if (/^https?:\/\//i.test(href)) {
                const rel = a.getAttribute('rel') || '';
                const extras = ['noopener', 'noreferrer'];
                extras.forEach(r => {
                    if (!rel.split(/\s+/).includes(r)) {
                        a.setAttribute('rel', (rel + ' ' + r).trim());
                    }
                });
            }
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
            TabManager.updateActiveTab(cleanHtml, sections, this.currentMarkdown);
            return;
        }

        // Use TabManager to open as a tab
        TabManager.openDocument(name, cleanHtml, sections, {
            messages,
            markdown: this.currentMarkdown,
            documentToken: this.currentDocumentToken
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
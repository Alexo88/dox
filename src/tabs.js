/* Khipu Codex — src/tabs.js */

'use strict';

/* ═══════════════════════════════════════════
   TabManager
   ═══════════════════════════════════════════ */

const TabManager = {
    tabs: new Map(),       // id → TabState
    activeTabId: null,
    nextId: 1,

    init() {
        SplitManager.init();
    },

    /**
     * Opens a document as a new tab.
     */
    openDocument(name, html, sections, extras = {}) {
        const id = this.nextId++;

        // Save current active tab state before switching
        if (this.activeTabId !== null && !SplitManager.isSplit) {
            this.saveActiveState();
            this._destroyCurrentDOM();
        }

        const tab = {
            id,
            name,
            html,
            sections,
            scrollY: extras.scrollY || 0,
            messages: extras.messages || null,
            markdown: extras.markdown || null,
            documentToken: extras.documentToken || null
        };

        this.tabs.set(id, tab);
        this.activeTabId = id;

        this._renderTabBar();
        if (!SplitManager.isSplit) {
            this.restoreState(tab);
        }

        return id;
    },

    /**
     * Actualiza la tab activa con nuevo contenido.
     */
    updateActiveTab(html, sections, markdown) {
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;

        tab.html = html;
        tab.sections = sections;
        tab.markdown = markdown || null;
        tab.scrollY = 0;

        if (!SplitManager.isSplit) {
            this._destroyCurrentDOM();
            this.restoreState(tab);
        }
    },

    /**
     * Switch to a different tab.
     */
    switchTab(id) {
        if (SplitManager.isSplit) {
            SplitManager.closeSplit();
        }

        if (id === this.activeTabId) return;
        const targetTab = this.tabs.get(id);
        if (!targetTab) return;

        this.saveActiveState();
        this._destroyCurrentDOM();

        this.activeTabId = id;
        this._renderTabBar();
        this.restoreState(targetTab);
    },

    /**
     * Close a tab.
     */
    closeTab(id) {
        if (!this.tabs.has(id)) return;

        const tab = this.tabs.get(id);
        const wasActive = id === this.activeTabId;

        if (SplitManager.isSplit && (id === SplitManager.leftTabId || id === SplitManager.rightTabId)) {
            SplitManager.closeSplit();
        }

        if (wasActive) {
            const ids = Array.from(this.tabs.keys());
            const closedIdx = ids.indexOf(id);
            this.tabs.delete(id);

            if (this.tabs.size === 0) {
                this.activeTabId = null;
                this._renderTabBar();
                this._showEmptyState();
                return;
            }

            let nextActive = ids[closedIdx + 1] ?? ids[closedIdx - 1];

            this._destroyCurrentDOM();
            this.activeTabId = nextActive;
            this._renderTabBar();
            this.restoreState(this.tabs.get(nextActive));
        } else {
            this.tabs.delete(id);
            this._renderTabBar();
        }

        if (tab?.documentToken && typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
            window.__TAURI__.invoke('close_document', { token: tab.documentToken })
                .catch(err => console.warn('[Khipu] Error cerrando documento en Rust:', err));
        }
    },

    getActiveTab() {
        return this.activeTabId !== null ? this.tabs.get(this.activeTabId) : null;
    },

    saveActiveState() {
        const tab = this.getActiveTab();
        if (!tab) return;
        tab.scrollY = window.scrollY || 0;
    },

    restoreState(tab) {
        if (typeof markdownEditor !== 'undefined' && markdownEditor) markdownEditor.classList.add('hidden');
        if (typeof btnSave !== 'undefined' && btnSave) btnSave.classList.add('hidden');
        if (typeof splitViewer !== 'undefined') splitViewer.classList.add('hidden');
        if (typeof splitToolbar !== 'undefined') splitToolbar.classList.add('hidden');
        if (typeof splitDropZone !== 'undefined') splitDropZone.classList.add('hidden');

        if (typeof FileHandler !== 'undefined') {
            FileHandler.isEditing = false;
            FileHandler.currentMarkdown = tab.markdown;
            FileHandler.currentMarkdownName = tab.name;
            FileHandler.currentFileName = tab.name;
            FileHandler.currentDocumentToken = tab.documentToken;
        }

        dropzone.classList.add('hidden');
        viewer.classList.remove('hidden');

        globalSearch.placeholder = `Buscar en ${tab.name}...`;

        if (typeof AnnotationLayer !== 'undefined') {
            AnnotationLayer.load(tab.name);
        }

        VirtualScroller.init(tab.sections, {
            onMeasured: () => {
                Progress.hide();
                if (tab.scrollY) {
                    window.scrollTo(0, tab.scrollY);
                }
            }
        });

        if (tab.markdown !== null && btnEdit) {
            btnEdit.classList.remove('hidden');
            btnEdit.innerHTML = '<span class="icon">📝</span> Editar';
        } else if (btnEdit) {
            btnEdit.classList.add('hidden');
        }

        document.title = tab.name + ' — Khipu Codex';
    },

    _destroyCurrentDOM() {
        if (typeof VirtualScroller !== 'undefined' && VirtualScroller.destroy) {
            VirtualScroller.destroy();
        }
        viewer.innerHTML = '';
        SearchEngine.reset();
    },

    _showEmptyState() {
        if (typeof VirtualScroller !== 'undefined' && VirtualScroller.destroy) {
            VirtualScroller.destroy();
        }
        viewer.innerHTML = '';
        viewer.classList.add('hidden');
        if (typeof splitViewer !== 'undefined') splitViewer.classList.add('hidden');
        if (typeof splitToolbar !== 'undefined') splitToolbar.classList.add('hidden');
        if (typeof splitDropZone !== 'undefined') splitDropZone.classList.add('hidden');
        dropzone.classList.remove('hidden');
        document.title = 'Khipu Codex';
        globalSearch.placeholder = 'Buscar...';
        if (btnEdit) btnEdit.classList.add('hidden');
        if (markdownEditor) markdownEditor.classList.add('hidden');
        if (btnSave) btnSave.classList.add('hidden');
        if (btnSplit) btnSplit.classList.add('hidden');

        if (typeof FileHandler !== 'undefined') {
            FileHandler.isEditing = false;
            FileHandler.currentMarkdown = null;
            FileHandler.currentMarkdownName = null;
            FileHandler.currentFileName = null;
            FileHandler.currentDocumentToken = null;
        }
    },

    _renderTabBar() {
        tabsContainer.innerHTML = '';

        // Mostrar / ocultar botón Comparar según cantidad de tabs
        if (typeof btnSplit !== 'undefined' && btnSplit) {
            if (this.tabs.size >= 2) {
                btnSplit.classList.remove('hidden');
                btnSplit.title = 'Comparar documentos lado a lado (Ctrl+\\)';
            } else if (this.tabs.size === 1) {
                btnSplit.classList.remove('hidden');
                btnSplit.title = 'Abrir segundo documento en vista dividida';
            } else {
                btnSplit.classList.add('hidden');
            }
        }

        this.tabs.forEach((tab, id) => {
            const el = document.createElement('div');
            let className = 'tab';
            if (SplitManager.isSplit) {
                if (id === SplitManager.leftTabId || id === SplitManager.rightTabId) {
                    className += ' active';
                }
            } else if (id === this.activeTabId) {
                className += ' active';
            }
            el.className = className;
            el.dataset.tabId = id;
            el.setAttribute('data-no-drag', '');
            el.setAttribute('draggable', 'true');

            // Drag-to-split desde pestaña interna
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/x-khipu-tab', String(id));
                e.dataTransfer.setData('text/plain', String(id));
                e.dataTransfer.effectAllowed = 'copyMove';
                if (typeof splitDropZone !== 'undefined' && splitDropZone) {
                    splitDropZone.classList.remove('hidden');
                }
            });

            el.addEventListener('dragend', () => {
                if (typeof splitDropZone !== 'undefined' && splitDropZone) {
                    splitDropZone.classList.add('hidden');
                }
            });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'tab-name';
            nameSpan.textContent = tab.name;
            nameSpan.title = tab.name;
            nameSpan.setAttribute('data-no-drag', '');

            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.title = 'Cerrar pestaña';
            closeBtn.setAttribute('aria-label', 'Cerrar pestaña');
            closeBtn.setAttribute('data-no-drag', '');

            el.appendChild(nameSpan);
            el.appendChild(closeBtn);

            // Click on tab → switch
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tab-close')) return;
                this.switchTab(id);
            });

            // Click on close → close
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(id);
            });

            tabsContainer.appendChild(el);
        });
    }
};
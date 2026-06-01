/* Khipu Codex — src/tabs.js */

'use strict';

/* ═══════════════════════════════════════════
   6. TabManager
   ═══════════════════════════════════════════ */
const TabManager = {
    tabs: new Map(),       // id → TabState
    activeTabId: null,
    nextId: 1,

    init() {
        // Nothing to init — tabs created on demand
    },

    /**
     * Opens a document as a new tab.
     * @param {string} name — display name (filename)
     * @param {string} html — rendered HTML content
     * @param {Array} sections — parsed sections from Sectionizer
     * @param {object} extras — optional { scrollY, messages, markdown }
     * @returns {number} tab id
     */
    openDocument(name, html, sections, extras = {}) {
        const id = this.nextId++;

        // Save current active tab state before switching
        if (this.activeTabId !== null) {
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
            markdown: extras.markdown || null
        };

        this.tabs.set(id, tab);
        this.activeTabId = id;

        this._renderTabBar();
        this.restoreState(tab);

        return id;
    },

    /**
     * Actualiza la tab activa con nuevo contenido (sin crear tab duplicada).
     */
    updateActiveTab(html, sections, markdown) {
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;

        tab.html = html;
        tab.sections = sections;
        tab.markdown = markdown || null;
        tab.scrollY = 0;

        this._destroyCurrentDOM();
        this.restoreState(tab);
    },

    /**
     * Switch to a different tab. Lazy DOM recreation.
     */
    switchTab(id) {
        if (id === this.activeTabId) return;
        const targetTab = this.tabs.get(id);
        if (!targetTab) return;

        // Save current state
        this.saveActiveState();
        this._destroyCurrentDOM();

        // Activate target
        this.activeTabId = id;
        this._renderTabBar();
        this.restoreState(targetTab);
    },

    /**
     * Close a tab. Activates adjacent tab or shows empty state.
     */
    closeTab(id) {
        if (!this.tabs.has(id)) return;

        const wasActive = id === this.activeTabId;

        if (wasActive) {
            // Obtener IDs ANTES del delete para saber posición exacta
            const ids = Array.from(this.tabs.keys());
            const closedIdx = ids.indexOf(id);
            this.tabs.delete(id);

            if (this.tabs.size === 0) {
                this.activeTabId = null;
                this._renderTabBar();
                this._showEmptyState();
                return;
            }

            // Activar tab adyacente: preferir el que estaba después, fallback al anterior
            let nextActive = ids[closedIdx + 1] ?? ids[closedIdx - 1];

            this._destroyCurrentDOM();
            this.activeTabId = nextActive;
            this._renderTabBar();
            this.restoreState(this.tabs.get(nextActive));
        } else {
            this.tabs.delete(id);
            this._renderTabBar();
        }
    },

    /**
     * Returns the current active tab state.
     */
    getActiveTab() {
        return this.activeTabId !== null ? this.tabs.get(this.activeTabId) : null;
    },

    /**
     * Save current viewer scroll position and search state to active tab.
     */
    saveActiveState() {
        const tab = this.getActiveTab();
        if (!tab) return;
        tab.scrollY = window.scrollY || 0;
    },

    /**
     * Recreate DOM from tab state.
     */
    restoreState(tab) {
        // Show viewer, hide dropzone
        dropzone.classList.add('hidden');
        viewer.classList.remove('hidden');

        // Update global search placeholder
        globalSearch.placeholder = `Buscar en ${tab.name}...`;

        // Load annotations for this tab (if layer exists)
        if (typeof AnnotationLayer !== 'undefined') {
            AnnotationLayer.load(tab.name);
        }

        // Re-initialize VirtualScroller with saved sections
        VirtualScroller.init(tab.sections, {
            onMeasured: () => {
                Progress.hide();
                // Restore scroll position
                if (tab.scrollY) {
                    window.scrollTo(0, tab.scrollY);
                }
            }
        });

        // Show edit button for markdown tabs
        if (tab.markdown !== null && btnEdit) {
            btnEdit.classList.remove('hidden');
            btnEdit.innerHTML = '<span class="icon">📝</span> Editar';
        } else if (btnEdit) {
            btnEdit.classList.add('hidden');
        }

        // Update title
        document.title = tab.name + ' — Khipu Codex';
    },

    /**
     * Destroy current viewer DOM completely.
     */
    _destroyCurrentDOM() {
        viewer.innerHTML = '';
        SearchEngine.reset();
    },

    /**
     * Show empty dropzone state (no tabs open).
     */
    _showEmptyState() {
        viewer.innerHTML = '';
        viewer.classList.add('hidden');
        dropzone.classList.remove('hidden');
        document.title = 'Khipu Codex';
        globalSearch.placeholder = 'Buscar...';
        if (btnEdit) btnEdit.classList.add('hidden');
        markdownEditor.classList.add('hidden');
    },

    /**
     * Render the tab bar HTML.
     */
    _renderTabBar() {
        tabsContainer.innerHTML = '';
        this.tabs.forEach((tab, id) => {
            const el = document.createElement('div');
            el.className = 'tab' + (id === this.activeTabId ? ' active' : '');
            el.dataset.tabId = id;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'tab-name';
            nameSpan.textContent = tab.name;
            nameSpan.title = tab.name;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.title = 'Cerrar pestaña';
            closeBtn.setAttribute('aria-label', 'Cerrar pestaña');

            el.appendChild(nameSpan);
            el.appendChild(closeBtn);

            // Click on tab name → switch
            nameSpan.addEventListener('click', () => this.switchTab(id));
            // Click on close → close
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(id);
            });

            tabsContainer.appendChild(el);
        });
    }
};

/* ═══════════════════════════════════════════
   Khipu Codex — App principal
   Orquestador: FileHandler, Sectionizer,
   VirtualScroller, SearchEngine, ThemeManager
   ═══════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   Refs DOM
   ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const customTitlebar = $('custom-titlebar');
const tabsContainer = $('tabs-container');
const btnOpen = $('btn-open');
const btnTheme = $('btn-theme');
const btnEdit = $( 'btn-edit' );
const globalSearch = $('global-search');
const fileInput = $('file-input');
const dropzone = $('dropzone');
const viewer = $('viewer');
const markdownEditor = $( 'markdown-editor' );
const progress = $('progress');
const progressBar = $('progress-bar');
const progressText = $('progress-text');

// Window controls
const btnMinimize = $('btn-minimize');
const btnMaximize = $('btn-maximize');
const btnClose = $('btn-close');
const iconMaximize = $('icon-maximize');
const iconRestore = $('icon-restore');

// Search
const searchBar = $('search-bar');
const searchInput = $('search-input');
const searchCount = $('search-count');
const searchPrev = $('search-prev');
const searchNext = $('search-next');
const searchClose = $('search-close');

// Theme icons
const iconMoon = $('icon-moon');
const iconSun = $('icon-sun');


/* ─────────────────────────────────────────
   Constantes
   ───────────────────────────────────────── */
const SECTION_SIZE = 20;   // Nodos top-level por sección
const OBSERVER_MARGIN = '100%'; // Pre-cargar 1 viewport arriba y abajo
const APP_VERSION = '0.2.0';
const MARKDOWN_VERSION_LIMIT = 10;

// Worker factory (replaceable by build.js)
const createWorker = () => new Worker('docx.worker.js'); // DOCXLITE_WORKER

// Markdown helpers
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
    let s = escapeHtml(text);
    const codeSpans = [];
    s = s.replace(/`([^`]+)`/g, (m, p1) => {
        codeSpans.push(p1);
        return `@@CODE${codeSpans.length - 1}@@`;
    });

    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, href) => {
        // Validar protocolos seguros (case-insensitive)
        const SAFE_PROTOCOLS = ['http://', 'https://', 'mailto:', '#', '/'];
        const hasSafeProtocol = SAFE_PROTOCOLS.some(p => href.toLowerCase().startsWith(p));
        const validatedHref = hasSafeProtocol ? href : '#';
        const safeHref = validatedHref.replace(/"/g, '&quot;');
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    s = s.replace(/@@CODE(\d+)@@/g, (m, idx) => {
        const code = codeSpans[parseInt(idx, 10)] || '';
        return `<code>${code}</code>`;
    });

    return s;
}

function markdownToHtml(markdown) {
    const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const html = [];
    let inCode = false;
    let listType = null;

    const closeList = () => {
        if (listType) {
            html.push(`</${listType}>`);
            listType = null;
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            if (!inCode) {
                closeList();
                inCode = true;
                html.push('<pre><code>');
            } else {
                inCode = false;
                html.push('</code></pre>');
            }
            return;
        }

        if (inCode) {
            html.push(escapeHtml(line));
            return;
        }

        if (trimmed === '') {
            closeList();
            return;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            html.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
            return;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            closeList();
            html.push('<hr>');
            return;
        }

        if (trimmed.startsWith('> ')) {
            closeList();
            html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
            return;
        }

        const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
        const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
        if (ulMatch || olMatch) {
            const nextType = ulMatch ? 'ul' : 'ol';
            if (listType !== nextType) {
                closeList();
                listType = nextType;
                html.push(`<${listType}>`);
            }
            const itemText = ulMatch ? ulMatch[1] : olMatch[1];
            html.push(`<li>${inlineMarkdown(itemText)}</li>`);
            return;
        }

        closeList();
        html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    });

    closeList();
    if (inCode) {
        html.push('</code></pre>');
    }

    return html.join('\n');
}


/* ═══════════════════════════════════════════
   1. ThemeManager
   ═══════════════════════════════════════════ */
const ThemeManager = {
    init() {
        // Respetar preferencia guardada, fallback a prefers-color-scheme
        let saved = localStorage.getItem('khipu-theme');
        // Migración desde clave anterior
        if (!saved) {
            const oldTheme = localStorage.getItem('docxlite-theme');
            if (oldTheme) {
                saved = oldTheme;
                localStorage.setItem('khipu-theme', oldTheme);
                localStorage.removeItem('docxlite-theme');
            }
        }
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        this._updateIcon();

        btnTheme.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('khipu-theme', next);
        this._updateIcon();
    },

    _updateIcon() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        iconMoon.style.display = isDark ? 'block' : 'none';
        iconSun.style.display = isDark ? 'none' : 'block';
    }
};


/* ═══════════════════════════════════════════
   2. Progress
   ═══════════════════════════════════════════ */
const Progress = {
    show(text, pct) {
        progress.classList.remove('hidden');
        progressText.textContent = text;
        progressBar.style.width = pct + '%';
    },
    hide() {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progress.classList.add('hidden');
            progressBar.style.width = '0%';
        }, 300);
    }
};


/* ═══════════════════════════════════════════
   3. Sectionizer
   ═══════════════════════════════════════════ */
const Sectionizer = {
    /**
     * Parsea HTML y agrupa nodos top-level en secciones.
     * @param {string} html — HTML completo de mammoth
     * @returns {Array<{id: number, html: string, height: number|null}>}
     */
    parse(html) {
        // Parsear en un template (no activa scripts, no carga imágenes)
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const nodes = Array.from(tpl.content.childNodes);

        const sections = [];
        let sectionId = 0;

        for (let i = 0; i < nodes.length; i += SECTION_SIZE) {
            const chunk = nodes.slice(i, i + SECTION_SIZE);
            // Serializar chunk a HTML string para storage
            const wrapper = document.createElement('div');
            chunk.forEach(node => wrapper.appendChild(node.cloneNode(true)));

            sections.push({
                id: sectionId++,
                html: wrapper.innerHTML,
                height: null // Se medirá después del primer render
            });
        }

        // Liberar el template
        tpl.innerHTML = '';

        return sections;
    }
};


/* ═══════════════════════════════════════════
   4. VirtualScroller
   ═══════════════════════════════════════════ */
const VirtualScroller = {
    sections: [],       // Datos de cada sección
    elements: [],       // Refs DOM de cada <div.section>
    observer: null,     // IntersectionObserver
    materialized: new Set(), // IDs de secciones con DOM real

    /**
     * Inicializa el viewer con las secciones parseadas.
     * @param {Array} sections — del Sectionizer
     */
    init(sections, options = {}) {
        this.sections = sections;
        this.elements = [];
        this.materialized = new Set();
        this.onMeasured = typeof options.onMeasured === 'function' ? options.onMeasured : null;
        viewer.innerHTML = '';

        // Crear un div por cada sección
        const fragment = document.createDocumentFragment();
        sections.forEach((section, idx) => {
            const el = document.createElement('div');
            el.className = 'section';
            el.dataset.sectionId = idx;
            fragment.appendChild(el);
            this.elements.push(el);
        });
        viewer.appendChild(fragment);

        // Render inicial: materializar todas para medir alturas
        this._measureAll();
    },

    /**
     * Materializa todas las secciones, mide alturas, luego desmaterializa las lejanas.
     * Usamos requestIdleCallback para no bloquear.
     */
    _measureAll() {
        const total = this.sections.length;
        let idx = 0;

        const measureBatch = (deadline) => {
            // Procesar en lotes según tiempo disponible
            while (idx < total && (deadline ? deadline.timeRemaining() > 5 : true)) {
                this._materialize(idx);
                idx++;
            }

            if (idx < total) {
                // Aún quedan secciones — continuar en idle
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(measureBatch);
                } else {
                    requestAnimationFrame(() => measureBatch(null));
                }
            } else {
                // Todas medidas — ahora medir alturas y configurar observer
                requestAnimationFrame(() => {
                    this.elements.forEach((el, i) => {
                        this.sections[i].height = el.offsetHeight;
                    });

                    // Desmaterializar secciones fuera del viewport inicial
                    this._dematerializeDistant();
                    this._setupObserver();
                    if (this.onMeasured) this.onMeasured();
                });
            }
        };

        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(measureBatch);
        } else {
            measureBatch(null);
        }
    },

    /**
     * Desmaterializa secciones que están lejos del viewport actual.
     */
    _dematerializeDistant() {
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + window.innerHeight;
        const buffer = window.innerHeight * 2; // 2x viewport buffer

        this.elements.forEach((el, idx) => {
            const rect = el.getBoundingClientRect();
            const elTop = rect.top + window.scrollY;
            const elBottom = elTop + rect.height;

            // Si está fuera del buffer, desmaterializar
            if (elBottom < viewportTop - buffer || elTop > viewportBottom + buffer) {
                this._dematerialize(idx);
            }
        });
    },

    /**
     * Configura IntersectionObserver para virtualización dinámica.
     */
    _setupObserver() {
        if (this.observer) this.observer.disconnect();

        this.observer = new IntersectionObserver(
            (entries) => this._handleIntersection(entries),
            { rootMargin: OBSERVER_MARGIN }
        );

        this.elements.forEach(el => this.observer.observe(el));
    },

    /**
     * Callback del IntersectionObserver.
     * Materializa secciones que entran, desmaterializa las que salen.
     */
    _handleIntersection(entries) {
        entries.forEach(entry => {
            const idx = parseInt(entry.target.dataset.sectionId, 10);
            if (entry.isIntersecting) {
                this._materialize(idx);
            } else {
                this._dematerialize(idx);
            }
        });
    },

    /**
     * Inyecta HTML real en una sección.
     */
    _materialize(idx) {
        if (this.materialized.has(idx)) return;
        const el = this.elements[idx];
        const section = this.sections[idx];

        el.innerHTML = section.html;
        el.classList.remove('section--placeholder');
        el.style.height = '';

        // Lazy loading + async decoding para imágenes
        const imgs = el.querySelectorAll('img');
        imgs.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        this.materialized.add(idx);
    },

    /**
     * Reemplaza contenido con placeholder de altura fija.
     */
    _dematerialize(idx) {
        if (!this.materialized.has(idx)) return;
        const el = this.elements[idx];
        const section = this.sections[idx];

        // Guardar altura medida si no se tenía
        if (!section.height) {
            section.height = el.offsetHeight;
        }

        // Protección: si la altura aún no se midió, no desmaterializar
        if (!section.height || section.height <= 0) return;

        el.innerHTML = '';
        el.classList.add('section--placeholder');
        el.style.height = section.height + 'px';

        this.materialized.delete(idx);
    },

    /**
     * Fuerza materialización de una sección específica (para búsqueda).
     * @returns {HTMLElement} el elemento de la sección
     */
    ensureMaterialized(idx) {
        this._materialize(idx);
        return this.elements[idx];
    }
};


/* ═══════════════════════════════════════════
   5. SearchEngine
   ═══════════════════════════════════════════ */
const SearchEngine = {
    results: [],    // Array de { sectionIdx, nodeInfo }
    currentIdx: -1,
    isOpen: false,
    _debounceTimer: null,

    init() {
        // Ctrl+F and Escape handled by keyboard shortcuts handler
        // Enter = next result, Shift+Enter = prev result (when search is open)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isOpen) {
                e.preventDefault();
                e.shiftKey ? this.prev() : this.next();
            }
        });

        searchClose.addEventListener('click', () => this.close());
        searchPrev.addEventListener('click', () => this.prev());
        searchNext.addEventListener('click', () => this.next());

        searchInput.addEventListener('input', () => {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => this.search(searchInput.value), 200);
        });
    },

    open() {
        searchBar.classList.remove('hidden');
        searchInput.focus();
        searchInput.select();
        this.isOpen = true;
    },

    close() {
        searchBar.classList.add('hidden');
        this.isOpen = false;
        this.clearHighlights();
        this.results = [];
        this.currentIdx = -1;
        searchInput.value = '';
        searchCount.textContent = '';
    },

    reset() {
        if (this.isOpen) {
            this.close();
        } else {
            this.clearHighlights();
            this.results = [];
            this.currentIdx = -1;
            searchInput.value = '';
            searchCount.textContent = '';
        }
    },

    /**
     * Busca texto en TODAS las secciones (incluyendo las no renderizadas).
     * Opera sobre el HTML almacenado, no sobre el DOM visible.
     */
    search(query) {
        this.clearHighlights();
        this.results = [];
        this.currentIdx = -1;

        if (!query || query.length < 2) {
            searchCount.textContent = '';
            return;
        }

        const lowerQuery = query.toLowerCase();

        // Buscar en el HTML de cada sección
        VirtualScroller.sections.forEach((section, sectionIdx) => {
            // Crear un parser temporal para buscar en texto
            const tpl = document.createElement('template');
            tpl.innerHTML = section.html;
            const text = tpl.content.textContent || '';

            // Contar ocurrencias en esta sección
            let pos = 0;
            let lowerText = text.toLowerCase();
            while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
                this.results.push({ sectionIdx, offset: pos });
                pos += lowerQuery.length;
            }
            tpl.innerHTML = '';
        });

        searchCount.textContent = this.results.length > 0
            ? `0/${this.results.length}`
            : 'Sin resultados';

        if (this.results.length > 0) {
            this.currentIdx = 0;
            this._highlightCurrent();
        }
    },

    /**
     * Highlight un resultado específico, materializando la sección si es necesario.
     */
    _highlightCurrent() {
        if (this.currentIdx < 0 || this.currentIdx >= this.results.length) return;

        // Limpiar highlight activo anterior
        const prevActive = viewer.querySelector('mark.search-highlight.active');
        if (prevActive) prevActive.classList.remove('active');

        const result = this.results[this.currentIdx];
        const el = VirtualScroller.ensureMaterialized(result.sectionIdx);

        // Highlight con TreeWalker para precisión
        this._highlightInSection(el, searchInput.value);

        // Marcar el resultado actual como activo
        const marks = el.querySelectorAll('mark.search-highlight');

        // Encontrar el mark correcto dentro de la sección
        let inSectionIdx = 0;
        for (let i = 0; i < this.currentIdx; i++) {
            if (this.results[i].sectionIdx === result.sectionIdx) {
                inSectionIdx++;
            }
        }

        if (marks[inSectionIdx]) {
            marks[inSectionIdx].classList.add('active');
            marks[inSectionIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        searchCount.textContent = `${this.currentIdx + 1}/${this.results.length}`;
    },

    /**
     * Aplica <mark> highlights a los text nodes de una sección.
     */
    _highlightInSection(container, query) {
        // Primero limpiar marks existentes en esta sección
        container.querySelectorAll('mark.search-highlight').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });

        if (!query) return;

        const lowerQuery = query.toLowerCase();
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const lowerText = text.toLowerCase();
            if (lowerText.indexOf(lowerQuery) === -1) return;

            const fragment = document.createDocumentFragment();
            let lastIdx = 0;

            let idx = lowerText.indexOf(lowerQuery);
            while (idx !== -1) {
                // Texto antes del match
                if (idx > lastIdx) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
                }
                // Mark
                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = text.slice(idx, idx + query.length);
                fragment.appendChild(mark);

                lastIdx = idx + query.length;
                idx = lowerText.indexOf(lowerQuery, lastIdx);
            }

            // Texto restante
            if (lastIdx < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });
    },

    next() {
        if (this.results.length === 0) return;
        this.currentIdx = (this.currentIdx + 1) % this.results.length;
        this._highlightCurrent();
    },

    prev() {
        if (this.results.length === 0) return;
        this.currentIdx = (this.currentIdx - 1 + this.results.length) % this.results.length;
        this._highlightCurrent();
    },

    clearHighlights() {
        viewer.querySelectorAll('mark.search-highlight').forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            }
        });
    }
};


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


/* ═══════════════════════════════════════════
   7. WindowControls
   ═══════════════════════════════════════════ */
const WindowControls = {
    isMaximized: false,

    init() {
        if (typeof window.__TAURI__ === 'undefined') return;

        btnMinimize.addEventListener('click', () => {
            window.__TAURI__.invoke('minimize')
                .catch(err => console.error('minimize error:', err));
        });

        btnMaximize.addEventListener('click', () => {
            window.__TAURI__.invoke('toggle_maximize')
                .then(() => {
                    this.isMaximized = !this.isMaximized;
                    this._updateMaximizeIcon();
                })
                .catch(err => console.error('toggle_maximize error:', err));
        });

        btnClose.addEventListener('click', () => {
            window.__TAURI__.invoke('close_window')
                .catch(err => console.error('close_window error:', err));
        });

        // Sincronizar isMaximized cuando la ventana cambia externamente (Win+↑, snap, etc.)
        if (window.__TAURI__.event) {
            window.__TAURI__.event.listen('tauri://resize', () => {
                window.__TAURI__.window.appWindow.isMaximized()
                    .then(maximized => {
                        this.isMaximized = maximized;
                        this._updateMaximizeIcon();
                    })
                    .catch(err => console.error('isMaximized error:', err));
            });
        }
    },

    _updateMaximizeIcon() {
        if (this.isMaximized) {
            iconMaximize.style.display = 'none';
            iconRestore.style.display = 'block';
        } else {
            iconMaximize.style.display = 'block';
            iconRestore.style.display = 'none';
        }
    }
};


/* ═══════════════════════════════════════════
   8. Keyboard Shortcuts
   ═══════════════════════════════════════════ */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+W — close active tab
        if (e.ctrlKey && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            e.stopPropagation();
            if (TabManager.activeTabId !== null) {
                TabManager.closeTab(TabManager.activeTabId);
            }
        }

        // Ctrl+F — focus titlebar search
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            e.stopPropagation();
            globalSearch.focus();
            globalSearch.select();
        }

        // Esc — exit search mode
        if (e.key === 'Escape') {
            if (document.activeElement === globalSearch) {
                globalSearch.value = '';
                globalSearch.blur();
                SearchEngine.close();
            } else if (SearchEngine.isOpen) {
                SearchEngine.close();
            }
        }
    });

    // Global search triggers detailed search overlay
    globalSearch.addEventListener('input', () => {
        const query = globalSearch.value;
        if (query.length >= 2) {
            if (!SearchEngine.isOpen) SearchEngine.open();
            searchInput.value = query;
            SearchEngine.search(query);
        } else if (query.length === 0) {
            SearchEngine.close();
        }
    });

    globalSearch.addEventListener('focus', () => {
        if (globalSearch.value.length >= 2) {
            if (!SearchEngine.isOpen) SearchEngine.open();
        }
    });
}

/* ═══════════════════════════════════════════
   9. FileHandler
   ═══════════════════════════════════════════ */
const FileHandler = {
    worker: null,
    currentMarkdown: null,
    currentMarkdownName: null,
    currentFileName: null,
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
    },

    /**
     * Procesa un archivo .docx o markdown
     * @param {File} file
     */
    handleFile(file) {
        const lowerName = file.name.toLowerCase();
        const isDocx = lowerName.endsWith('.docx');
        const isMarkdown = lowerName.endsWith('.md') || lowerName.endsWith('.markdown');

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
            markdownEditor.classList.add('hidden');
            viewer.classList.remove('hidden');
            this._renderMarkdown(this.currentMarkdown);
            
            // Opcional: Ofrecer descarga automática o mediante botón
            console.log('Cambios guardados en memoria/localStorage');
        } else {
            // Entrar en modo edición
            this.isEditing = true;
            btnEdit.innerHTML = '<span class="icon">👁️</span> Ver';
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
        this._renderHtml(markdownToHtml(sourceText));
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


/* ═══════════════════════════════════════════
   10. Init
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   9. Titlebar Drag (Manual fallback for Tauri v1)
   ═══════════════════════════════════════════ */
function initTitlebarDrag() {
    if (typeof window.__TAURI__ === 'undefined') return;
    
    const titlebar = document.getElementById('custom-titlebar');
    if (!titlebar) return;
    
    // Listen for mousedown on titlebar
    titlebar.addEventListener('mousedown', (e) => {
        // If clicking on an interactive element, don't drag
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        if (interactiveElements.includes(e.target.tagName)) return;
        if (e.target.closest('button') || e.target.closest('input')) return;
        if (e.target.closest('.tab')) return; // Evitar drag en pestañas

        // Start dragging via Tauri API
        if (window.__TAURI__.window && window.__TAURI__.window.appWindow) {
            window.__TAURI__.window.appWindow.startDragging();
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('khipu-version', APP_VERSION);
    ThemeManager.init();
    SearchEngine.init();
    TabManager.init();
    WindowControls.init();
    initKeyboardShortcuts();
    initTitlebarDrag();
    FileHandler.init();
});









function saveMarkdownVersion(name, text) {
    if (!name) return;
    const key = `khipu-md:${name}`;
    let versions = [];
    try {
        versions = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) {
        versions = [];
    }

    const last = versions.length ? versions[versions.length - 1] : null;
    if (last && last.text === text) return;

    versions.push({ ts: Date.now(), text });

    // Límite por cantidad
    if (versions.length > MARKDOWN_VERSION_LIMIT) {
        versions = versions.slice(-MARKDOWN_VERSION_LIMIT);
    }

    // Límite por peso (~400KB máx)
    const MAX_STORAGE_BYTES = 400 * 1024;
    let serialized = JSON.stringify(versions);
    while (serialized.length > MAX_STORAGE_BYTES && versions.length > 1) {
        versions.shift();
        serialized = JSON.stringify(versions);
    }

    try {
        localStorage.setItem(key, serialized);
    } catch (err) {
        console.warn('[Khipu] localStorage lleno — versión no guardada para:', name);
    }
}

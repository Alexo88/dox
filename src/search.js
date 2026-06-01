/* Khipu Codex — src/search.js */

'use strict';

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

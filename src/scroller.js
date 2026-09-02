/* Khipu Codex — src/scroller.js */

'use strict';

/* ═══════════════════════════════════════════
   4. VirtualScroller (Multi-Instance & Single-View)
   ═══════════════════════════════════════════ */
class VirtualScrollerInstance {
    constructor(container = null) {
        this.container = container; // null = window / #viewer, or HTMLElement
        this.sections = [];
        this.elements = [];
        this.observer = null;
        this.materialized = new Set();
        this._measuring = false;
        this.onMeasured = null;
        this._idleId = null;
        this._rafId = null;
    }

    _getViewer() {
        return this.container || (typeof viewer !== 'undefined' ? viewer : document.getElementById('viewer'));
    }

    _isContainerWindow() {
        return !this.container || (typeof viewer !== 'undefined' && this.container === viewer);
    }

    /**
     * Inicializa el viewer con las secciones parseadas.
     * @param {Array} sections — del Sectionizer
     */
    init(sections, options = {}) {
        this.destroy();
        this.sections = sections || [];
        this.elements = [];
        this.materialized = new Set();
        this.onMeasured = typeof options.onMeasured === 'function' ? options.onMeasured : null;

        const targetViewer = this._getViewer();
        if (!targetViewer) return;
        targetViewer.innerHTML = '';

        // Crear un div por cada sección
        const fragment = document.createDocumentFragment();
        this.sections.forEach((section, idx) => {
            const el = document.createElement('div');
            el.className = 'section';
            el.dataset.sectionId = idx;
            fragment.appendChild(el);
            this.elements.push(el);
        });
        targetViewer.appendChild(fragment);

        // Render inicial: materializar todas para medir alturas
        this._measureAll();
    }

    /**
     * Materializa todas las secciones, mide alturas, luego desmaterializa las lejanas.
     * Usamos requestIdleCallback para no bloquear.
     */
    _measureAll() {
        this._measuring = true;
        const total = this.sections.length;
        let idx = 0;

        const measureBatch = (deadline) => {
            while (idx < total && (deadline ? deadline.timeRemaining() > 5 : true)) {
                this._materialize(idx);
                idx++;
            }

            if (idx < total) {
                if (typeof requestIdleCallback !== 'undefined') {
                    this._idleId = requestIdleCallback(measureBatch);
                } else {
                    this._rafId = requestAnimationFrame(() => measureBatch(null));
                }
            } else {
                this._rafId = requestAnimationFrame(() => {
                    this.elements.forEach((el, i) => {
                        if (this.sections[i]) {
                            this.sections[i].height = el.offsetHeight;
                        }
                    });

                    this._measuring = false;
                    this._idleId = null;
                    this._rafId = null;
                    this._dematerializeDistant();
                    this._setupObserver();
                    if (this.onMeasured) this.onMeasured();
                });
            }
        };

        if (typeof requestIdleCallback !== 'undefined') {
            this._idleId = requestIdleCallback(measureBatch);
        } else {
            this._rafId = requestAnimationFrame(() => measureBatch(null));
        }
    }

    /**
     * Desmaterializa secciones que están lejos del viewport actual.
     */
    _dematerializeDistant() {
        const isWindow = this._isContainerWindow();
        const viewportTop = isWindow ? window.scrollY : (this.container ? this.container.scrollTop : 0);
        const viewportHeight = isWindow ? window.innerHeight : (this.container ? this.container.clientHeight : window.innerHeight);
        const viewportBottom = viewportTop + viewportHeight;
        const buffer = viewportHeight * 2;

        this.elements.forEach((el, idx) => {
            let elTop, elHeight;
            if (isWindow) {
                const rect = el.getBoundingClientRect();
                elTop = rect.top + window.scrollY;
                elHeight = rect.height;
            } else {
                elTop = el.offsetTop;
                elHeight = el.offsetHeight || (this.sections[idx] ? this.sections[idx].height : 0);
            }
            const elBottom = elTop + elHeight;

            if (elBottom < viewportTop - buffer || elTop > viewportBottom + buffer) {
                this._dematerialize(idx);
            }
        });
    }

    /**
     * Configura IntersectionObserver para virtualización dinámica.
     */
    _setupObserver() {
        if (this.observer) this.observer.disconnect();

        const options = {
            rootMargin: typeof OBSERVER_MARGIN !== 'undefined' ? OBSERVER_MARGIN : '800px 0px'
        };
        if (!this._isContainerWindow() && this.container) {
            options.root = this.container;
        }

        this.observer = new IntersectionObserver(
            (entries) => this._handleIntersection(entries),
            options
        );

        this.elements.forEach(el => this.observer.observe(el));
    }

    /**
     * Callback del IntersectionObserver.
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
    }

    /**
     * Inyecta HTML real en una sección.
     */
    _materialize(idx) {
        if (this.materialized.has(idx)) return;
        const el = this.elements[idx];
        const section = this.sections[idx];
        if (!el || !section) return;

        el.innerHTML = section.html;
        el.classList.remove('section--placeholder');
        el.style.height = '';

        const imgs = el.querySelectorAll('img');
        imgs.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        if (!this._measuring && typeof AnnotationLayer !== 'undefined' && this._isContainerWindow()) {
            AnnotationLayer.restoreCanvas(el, idx);
        }

        this.materialized.add(idx);
    }

    /**
     * Reemplaza contenido con placeholder de altura fija.
     */
    _dematerialize(idx) {
        if (!this.materialized.has(idx)) return;
        const el = this.elements[idx];
        const section = this.sections[idx];
        if (!el || !section) return;

        if (!section.height) {
            section.height = el.offsetHeight;
        }
        if (!section.height || section.height <= 0) return;

        if (!this._measuring && typeof AnnotationLayer !== 'undefined' && this._isContainerWindow()) {
            AnnotationLayer.detachCanvas(el, idx);
        }

        el.innerHTML = '';
        el.classList.add('section--placeholder');
        el.style.height = section.height + 'px';

        this.materialized.delete(idx);
    }

    /**
     * Fuerza materialización de una sección específica (para búsqueda).
     */
    ensureMaterialized(idx) {
        this._materialize(idx);
        return this.elements[idx];
    }

    /**
     * Limpia observador y estado al cambiar o destruir tab.
     */
    destroy() {
        if (this._idleId !== null && typeof cancelIdleCallback !== 'undefined') {
            cancelIdleCallback(this._idleId);
            this._idleId = null;
        }
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._measuring = false;

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.materialized.clear();
        this.elements = [];
        this.sections = [];
    }
}

const VirtualScroller = new VirtualScrollerInstance();

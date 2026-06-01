/* Khipu Codex — src/scroller.js */

'use strict';

/* ═══════════════════════════════════════════
   4. VirtualScroller
   ═══════════════════════════════════════════ */
const VirtualScroller = {
    sections: [],       // Datos de cada sección
    elements: [],       // Refs DOM de cada <div.section>
    observer: null,     // IntersectionObserver
    materialized: new Set(), // IDs de secciones con DOM real
    _measuring: false,  // true durante _measureAll — suprime hooks de anotaciones

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
        this._measuring = true;
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

                    // Fin de la medición — restaurar hooks de anotaciones
                    this._measuring = false;

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

        // Hook para AnnotationLayer (solo fuera de medición inicial)
        if (!this._measuring && typeof AnnotationLayer !== 'undefined') {
            AnnotationLayer.restoreCanvas(el, idx);
        }

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

        // Hook para AnnotationLayer (solo fuera de medición inicial)
        if (!this._measuring && typeof AnnotationLayer !== 'undefined') {
            AnnotationLayer.detachCanvas(el, idx);
        }

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

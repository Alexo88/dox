/* Khipu Codex — src/svg-viewer.js */

'use strict';

/* ═══════════════════════════════════════════
    SvgViewer — Sanitización y wrapping de SVG
   ═══════════════════════════════════════════ */
const SvgViewer = {
    /**
     * Sanitiza un SVG crudo produciendo contenido estático.
     *
     * Elimina elementos activos (script, foreignObject, animaciones),
     * atributos inline peligrosos (on*, style, href no-fragment),
     * y produce solo SVG estructural seguro para un visor de lectura.
     *
     * @param {string} svgText — contenido SVG crudo
     * @returns {string} SVG sanitizado (string)
     * @throws {Error} si no es un SVG válido
     */
    sanitize(svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = doc.documentElement;

        if (!root || root.tagName !== 'svg') {
            throw new Error('El archivo no es un SVG válido');
        }

        // 1. Remover elementos activos y de animación
        const REMOVED_TAGS = [
            'script',           // XSS directo
            'foreignObject',    // HTML embebido con scripts
            'style',            // CSS global que rompe la app
            'set',              // Mutación de atributos en runtime
            'animate',          // Animación que cambia atributos
            'animateTransform', // Animación de transformaciones
            'animateMotion',    // Animación sobre un trazado
            'mpath'             // Referencia de trazado para animateMotion
        ];
        REMOVED_TAGS.forEach(tag => {
            root.querySelectorAll(tag).forEach(el => el.remove());
        });

        // 2. Remover atributos on* (onclick, onload, onerror, etc.) y style
        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                if (name === 'style') {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 3. Restringir href/xlink:href exclusivamente a fragmentos internos (#id)
        const REF_TAGS = ['use', 'a', 'image', 'cursor'];
        REF_TAGS.forEach(tag => {
            root.querySelectorAll(tag).forEach(el => {
                ['href', 'xlink:href'].forEach(attr => {
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('#')) {
                        el.removeAttribute(attr);
                    }
                });
            });
        });

        // 4. Bloquear javascript: en href directo de <a> (defensa en profundidad)
        root.querySelectorAll('a').forEach(el => {
            ['href', 'xlink:href'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val && val.toLowerCase().startsWith('javascript:')) {
                    el.removeAttribute(attr);
                }
            });
        });

        return root.outerHTML;
    },

    /**
     * Envuelve SVG sanitizado en un contenedor para VirtualScroller.
     * @param {string} svgSanitized — output de sanitize()
     * @returns {string} HTML listo para un section
     */
    wrap(svgSanitized) {
        return `<div class="svg-container">${svgSanitized}</div>`;
    }
};

/* Khipu Codex — src/svg-viewer.js */

'use strict';

/* ═══════════════════════════════════════════
    SvgViewer — Sanitización y wrapping de SVG
   ═══════════════════════════════════════════ */
const SvgViewer = {
    /**
     * Sanitiza un SVG crudo: remueve scripts, foreignObject,
     * atributos on*, estilos globales, y restringe href.
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

        // 1. Remover <script> — XSS directo
        const scripts = root.querySelectorAll('script');
        scripts.forEach(s => s.remove());

        // 2. Remover <foreignObject> — puede contener HTML embebido con scripts
        const foreignObjects = root.querySelectorAll('foreignObject');
        foreignObjects.forEach(fo => fo.remove());

        // 3. Remover <style> global — evita que el SVG rompa el CSS de la app
        const styles = root.querySelectorAll('style');
        styles.forEach(s => s.remove());

        // 4. Remover atributos on* (onclick, onload, onerror, etc.)
        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 5. Restringir href/xlink:href a fragmentos internos (#...)
        const refTags = ['use', 'a', 'image', 'animate', 'animateTransform', 'set', 'cursor'];
        refTags.forEach(tag => {
            root.querySelectorAll(tag).forEach(el => {
                ['href', 'xlink:href'].forEach(attr => {
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('#') && !val.startsWith('#')) {
                        el.removeAttribute(attr);
                    }
                });
            });
        });

        // 6. Bloquear javascript: en href directo de <a>
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

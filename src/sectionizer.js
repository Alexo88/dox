/* Khipu Codex — src/sectionizer.js */

'use strict';

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

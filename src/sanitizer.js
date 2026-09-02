/* Khipu Codex — src/sanitizer.js */

'use strict';

/**
 * Sanitiza HTML contra XSS usando una política allowlist.
 * No depende de marked ni de DOMPurify — opera sobre el HTML ya generado.
 *
 * Elimina elementos activos, atributos inline peligrosos y
 * restringe protocolos en URLs. No confía en marked como frontera de seguridad.
 */
const HtmlSanitizer = {
    BLOCKED_TAGS: [
        'script', 'style', 'iframe', 'object', 'embed', 'form',
        'input', 'button', 'textarea', 'select', 'option', 'optgroup',
        'meta', 'base', 'link', 'noscript', 'svg', 'math'
    ],
    DANGEROUS_ATTRS: [
        'srcdoc', 'formaction', 'formmethod', 'formenctype',
        'action', 'data', 'xlink:href', 'autofocus'
    ],
    SAFE_PROTOCOLS: [
        'http://', 'https://', 'mailto:', '#', '/',
        'data:image/png;base64,',
        'data:image/jpeg;base64,',
        'data:image/jpg;base64,',
        'data:image/gif;base64,',
        'data:image/webp;base64,'
    ],
    URL_ATTRS: ['href', 'src', 'srcset'],

    sanitize(html) {
        if (!html || typeof html !== 'string') return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // 1. Remover elementos activos/peligrosos
        this.BLOCKED_TAGS.forEach(tag => {
            doc.querySelectorAll(tag).forEach(el => el.remove());
        });

        // 2. Remover atributos inline peligrosos y handlers de eventos
        doc.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                } else if (this.DANGEROUS_ATTRS.includes(name)) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 3. Restringir protocolos en href, src, srcset
        doc.querySelectorAll('*').forEach(el => {
            this.URL_ATTRS.forEach(attr => {
                const val = el.getAttribute(attr);
                if (!val) return;
                const isSafe = this.SAFE_PROTOCOLS.some(p => val.toLowerCase().startsWith(p));
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
    }
};

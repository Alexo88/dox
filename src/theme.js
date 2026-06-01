/* Khipu Codex — src/theme.js */

'use strict';

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

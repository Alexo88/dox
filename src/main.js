/* Khipu Codex — src/main.js */

'use strict';

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
    AnnotationLayer.init();
    WindowControls.init();
    initKeyboardShortcuts();
    initTitlebarDrag();
    FileHandler.init();
});

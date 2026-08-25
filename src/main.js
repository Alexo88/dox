/* Khipu Codex — src/main.js */

'use strict';

/* ═══════════════════════════════════════════
   10. Init
   ═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('khipu-version', APP_VERSION);
    ThemeManager.init();
    SearchEngine.init();
    TabManager.init();
    AnnotationLayer.init();
    WindowControls.init();
    initKeyboardShortcuts();
    FileHandler.init();
});

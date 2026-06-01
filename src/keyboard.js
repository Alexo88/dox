/* Khipu Codex — src/keyboard.js */

'use strict';

/* ═══════════════════════════════════════════
   8. Keyboard Shortcuts
   ═══════════════════════════════════════════ */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S — save current markdown
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            e.stopPropagation();
            if (FileHandler.isEditing && FileHandler.currentMarkdown !== null) {
                FileHandler.saveCurrentMarkdown();
            }
            return;
        }

        // Ctrl+W — close active tab
        if (e.ctrlKey && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            e.stopPropagation();
            if (TabManager.activeTabId !== null) {
                TabManager.closeTab(TabManager.activeTabId);
            }
        }

        // Ctrl+F — focus titlebar search
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            e.stopPropagation();
            globalSearch.focus();
            globalSearch.select();
        }

        // Esc — exit search mode
        if (e.key === 'Escape') {
            if (document.activeElement === globalSearch) {
                globalSearch.value = '';
                globalSearch.blur();
                SearchEngine.close();
            } else if (SearchEngine.isOpen) {
                SearchEngine.close();
            }
        }
    });

    // Global search triggers detailed search overlay
    globalSearch.addEventListener('input', () => {
        const query = globalSearch.value;
        if (query.length >= 2) {
            if (!SearchEngine.isOpen) SearchEngine.open();
            searchInput.value = query;
            SearchEngine.search(query);
        } else if (query.length === 0) {
            SearchEngine.close();
        }
    });

    globalSearch.addEventListener('focus', () => {
        if (globalSearch.value.length >= 2) {
            if (!SearchEngine.isOpen) SearchEngine.open();
        }
    });
}

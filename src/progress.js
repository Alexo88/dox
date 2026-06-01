/* Khipu Codex — src/progress.js */

'use strict';

/* ═══════════════════════════════════════════
   2. Progress
   ═══════════════════════════════════════════ */
const Progress = {
    show(text, pct) {
        progress.classList.remove('hidden');
        progressText.textContent = text;
        progressBar.style.width = pct + '%';
    },
    hide() {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progress.classList.add('hidden');
            progressBar.style.width = '0%';
        }, 300);
    }
};

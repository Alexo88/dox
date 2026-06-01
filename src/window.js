/* Khipu Codex — src/window.js */

'use strict';

/* ═══════════════════════════════════════════
   7. WindowControls
   ═══════════════════════════════════════════ */
const WindowControls = {
    isMaximized: false,

    init() {
        if (typeof window.__TAURI__ === 'undefined') return;

        btnMinimize.addEventListener('click', () => {
            window.__TAURI__.invoke('minimize')
                .catch(err => console.error('minimize error:', err));
        });

        btnMaximize.addEventListener('click', () => {
            window.__TAURI__.invoke('toggle_maximize')
                .then(() => {
                    this.isMaximized = !this.isMaximized;
                    this._updateMaximizeIcon();
                })
                .catch(err => console.error('toggle_maximize error:', err));
        });

        btnClose.addEventListener('click', () => {
            window.__TAURI__.invoke('close_window')
                .catch(err => console.error('close_window error:', err));
        });

        // Sincronizar isMaximized cuando la ventana cambia externamente (Win+↑, snap, etc.)
        if (window.__TAURI__.event) {
            window.__TAURI__.event.listen('tauri://resize', () => {
                window.__TAURI__.window.appWindow.isMaximized()
                    .then(maximized => {
                        this.isMaximized = maximized;
                        this._updateMaximizeIcon();
                    })
                    .catch(err => console.error('isMaximized error:', err));
            });
        }
    },

    _updateMaximizeIcon() {
        if (this.isMaximized) {
            iconMaximize.style.display = 'none';
            iconRestore.style.display = 'block';
        } else {
            iconMaximize.style.display = 'block';
            iconRestore.style.display = 'none';
        }
    }
};

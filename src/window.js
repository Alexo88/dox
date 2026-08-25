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

        // Sincronizar estado inicial al arrancar
        window.__TAURI__.invoke('is_window_maximized')
            .then(maximized => {
                this.isMaximized = !!maximized;
                this._updateMaximizeIcon();
            })
            .catch(() => {});

        // Dragging de ventana fluido tipo Excel / nativo desde cualquier parte de la cabecera
        const titlebar = document.getElementById('custom-titlebar');
        if (titlebar) {
            titlebar.addEventListener('mousedown', (e) => {
                if (e.button === 0 && !e.target.closest('button, input, textarea, select, a, .tab, .tab-name, .tab-close, [data-no-drag]')) {
                    if (window.__TAURI__.window && window.__TAURI__.window.appWindow) {
                        window.__TAURI__.window.appWindow.startDragging().catch(() => {});
                    }
                }
            });
        }

        // Sincronizar isMaximized cuando la ventana cambia externamente (Win+↑, snap, etc.)
        if (window.__TAURI__.event) {
            window.__TAURI__.event.listen('tauri://resize', async () => {
                try {
                    const maximized = await window.__TAURI__.invoke('is_window_maximized');
                    this.isMaximized = !!maximized;
                    this._updateMaximizeIcon();
                } catch (err) {
                    console.error('is_window_maximized error:', err);
                }
            });
        }
    },

    _updateMaximizeIcon() {
        if (!iconMaximize || !iconRestore) return;
        if (this.isMaximized) {
            iconMaximize.style.display = 'none';
            iconRestore.style.display = 'block';
            if (btnMaximize) btnMaximize.title = 'Restaurar';
        } else {
            iconMaximize.style.display = 'block';
            iconRestore.style.display = 'none';
            if (btnMaximize) btnMaximize.title = 'Maximizar';
        }
    }
};
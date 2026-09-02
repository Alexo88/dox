/* Khipu Codex — src/split.js */

'use strict';

/* ═══════════════════════════════════════════
   SplitManager
   ═══════════════════════════════════════════ */
const SplitManager = {
    isSplit: false,
    leftTabId: null,
    rightTabId: null,
    leftScroller: null,
    rightScroller: null,
    syncScroll: true,
    _suppressScroll: false,

    init() {
        if (typeof btnSplit !== 'undefined' && btnSplit) {
            btnSplit.addEventListener('click', () => this.toggleSplit());
        }

        if (typeof btnSplitSync !== 'undefined' && btnSplitSync) {
            btnSplitSync.addEventListener('click', () => {
                this.syncScroll = !this.syncScroll;
                btnSplitSync.classList.toggle('active', this.syncScroll);
                Progress.show(this.syncScroll ? '🔗 Scroll sincronizado activado' : '🔓 Scroll independiente', 100);
                setTimeout(Progress.hide, 1200);
            });
        }

        if (typeof btnSplitSwap !== 'undefined' && btnSplitSwap) {
            btnSplitSwap.addEventListener('click', () => this.swap());
        }

        if (typeof btnSplitClose !== 'undefined' && btnSplitClose) {
            btnSplitClose.addEventListener('click', () => this.closeSplit());
        }

        // Scroll sincronizado por porcentaje
        if (typeof viewerLeft !== 'undefined' && viewerLeft && typeof viewerRight !== 'undefined' && viewerRight) {
            viewerLeft.addEventListener('scroll', () => {
                if (!this.isSplit || !this.syncScroll || this._suppressScroll) return;
                const maxLeft = viewerLeft.scrollHeight - viewerLeft.clientHeight;
                if (maxLeft <= 0) return;
                const ratio = viewerLeft.scrollTop / maxLeft;
                const maxRight = viewerRight.scrollHeight - viewerRight.clientHeight;
                this._suppressScroll = true;
                viewerRight.scrollTop = ratio * maxRight;
                requestAnimationFrame(() => { this._suppressScroll = false; });
            });

            viewerRight.addEventListener('scroll', () => {
                if (!this.isSplit || !this.syncScroll || this._suppressScroll) return;
                const maxRight = viewerRight.scrollHeight - viewerRight.clientHeight;
                if (maxRight <= 0) return;
                const ratio = viewerRight.scrollTop / maxRight;
                const maxLeft = viewerLeft.scrollHeight - viewerLeft.clientHeight;
                this._suppressScroll = true;
                viewerLeft.scrollTop = ratio * maxLeft;
                requestAnimationFrame(() => { this._suppressScroll = false; });
            });
        }

        // Separador central arrastrable (Resize handle)
        const divider = document.querySelector('.split-divider');
        if (divider && typeof splitViewer !== 'undefined' && splitViewer && typeof splitPanelLeft !== 'undefined' && splitPanelLeft && typeof splitPanelRight !== 'undefined' && splitPanelRight) {
            let isResizing = false;
            divider.addEventListener('mousedown', (e) => {
                isResizing = true;
                divider.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing || !this.isSplit) return;
                const rect = splitViewer.getBoundingClientRect();
                const offset = e.clientX - rect.left;
                const pct = Math.max(20, Math.min(80, (offset / rect.width) * 100));
                splitPanelLeft.style.flex = `0 0 ${pct}%`;
                splitPanelRight.style.flex = `1 1 auto`;
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    divider.classList.remove('dragging');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        }

        // Drag & Drop sobre split drop zone lateral
        if (typeof splitDropZone !== 'undefined' && splitDropZone) {
            splitDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                splitDropZone.classList.add('drag-over');
            });
            splitDropZone.addEventListener('dragleave', () => {
                splitDropZone.classList.remove('drag-over');
            });
            splitDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                splitDropZone.classList.remove('drag-over');
                splitDropZone.classList.add('hidden');

                // 1. Arrastre de tab interna
                const internalTabIdStr = e.dataTransfer.getData('application/x-khipu-tab') || e.dataTransfer.getData('text/plain');
                const internalTabId = parseInt(internalTabIdStr, 10);
                if (!isNaN(internalTabId) && TabManager.tabs.has(internalTabId)) {
                    const ids = Array.from(TabManager.tabs.keys());
                    if (ids.length >= 2) {
                        const activeId = TabManager.activeTabId;
                        const leftId = (internalTabId === activeId)
                            ? (ids.find(id => id !== internalTabId) || activeId)
                            : activeId;
                        const rightId = internalTabId === leftId
                            ? ids.find(id => id !== leftId)
                            : internalTabId;
                        if (leftId && rightId) {
                            SplitManager.openSplit(leftId, rightId);
                        }
                        return;
                    }
                    if (typeof fileInput !== 'undefined') fileInput.click();
                    return;
                }

                // 2. Archivo externo arrastrado desde Windows Explorer
                const file = e.dataTransfer.files && e.dataTransfer.files[0];
                if (file && typeof FileHandler !== 'undefined') {
                    FileHandler.handleFile(file);
                    setTimeout(() => {
                        const ids = Array.from(TabManager.tabs.keys());
                        if (ids.length >= 2) {
                            SplitManager.openSplit(ids[0], ids[ids.length - 1]);
                        }
                    }, 200);
                }
            });
            splitDropZone.addEventListener('click', () => {
                splitDropZone.classList.add('hidden');
                if (typeof fileInput !== 'undefined') fileInput.click();
            });
        }

        // Si se arrastra un archivo sobre el borde derecho, iluminar dropzone lateral
        document.addEventListener('dragover', (e) => {
            if (TabManager.tabs.size >= 1 && !this.isSplit) {
                if (e.clientX > window.innerWidth * 0.75) {
                    if (typeof splitDropZone !== 'undefined' && splitDropZone) {
                        splitDropZone.classList.remove('hidden');
                    }
                }
            }
        });
    },

    toggleSplit() {
        if (this.isSplit) {
            this.closeSplit();
            return;
        }

        const ids = Array.from(TabManager.tabs.keys());
        if (ids.length >= 2) {
            const activeId = TabManager.activeTabId;
            const otherId = ids.find(id => id !== activeId) || ids[1];
            this.openSplit(activeId, otherId);
        } else if (ids.length === 1) {
            // Con 1 pestaña: mostrar zona para soltar o abrir segundo archivo
            if (typeof splitDropZone !== 'undefined' && splitDropZone) {
                splitDropZone.classList.remove('hidden');
                Progress.show('Arrastrá un segundo archivo o hacé click para abrirlo en split', 100);
                setTimeout(Progress.hide, 3000);
            }
        }
    },

    openSplit(leftId, rightId) {
        const leftTab = TabManager.tabs.get(leftId);
        const rightTab = TabManager.tabs.get(rightId);
        if (!leftTab || !rightTab) return;

        this.isSplit = true;
        this.leftTabId = leftId;
        this.rightTabId = rightId;

        // Auto-maximizar ventana para split view si no está maximizada
        if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.invoke) {
            window.__TAURI__.invoke('is_window_maximized')
                .then(isMax => {
                    if (!isMax) {
                        window.__TAURI__.invoke('toggle_maximize').catch(() => {});
                    }
                })
                .catch(() => {});
        }

        // Ocultar single viewer y dropzone, mostrar split containers
        if (typeof dropzone !== 'undefined') dropzone.classList.add('hidden');
        if (typeof viewer !== 'undefined') viewer.classList.add('hidden');
        if (typeof splitDropZone !== 'undefined') splitDropZone.classList.add('hidden');
        if (typeof splitViewer !== 'undefined') splitViewer.classList.remove('hidden');
        if (typeof splitToolbar !== 'undefined') splitToolbar.classList.remove('hidden');
        if (typeof btnSplit !== 'undefined') btnSplit.classList.add('active');

        // Resetear anchos al 50%/50%
        if (typeof splitPanelLeft !== 'undefined') splitPanelLeft.style.flex = '1 1 0%';
        if (typeof splitPanelRight !== 'undefined') splitPanelRight.style.flex = '1 1 0%';

        // Títulos de cabecera
        if (typeof splitLeftTitle !== 'undefined') splitLeftTitle.textContent = leftTab.name;
        if (typeof splitRightTitle !== 'undefined') splitRightTitle.textContent = rightTab.name;

        // Instanciar scrollers independientes
        if (!this.leftScroller) this.leftScroller = new VirtualScrollerInstance(viewerLeft);
        if (!this.rightScroller) this.rightScroller = new VirtualScrollerInstance(viewerRight);

        this.leftScroller.init(leftTab.sections);
        this.rightScroller.init(rightTab.sections);

        TabManager._renderTabBar();
        document.title = `${leftTab.name} | ${rightTab.name} — Khipu Codex`;
    },

    closeSplit() {
        if (!this.isSplit) return;
        this.isSplit = false;

        if (this.leftScroller) this.leftScroller.destroy();
        if (this.rightScroller) this.rightScroller.destroy();

        if (typeof splitViewer !== 'undefined') splitViewer.classList.add('hidden');
        if (typeof splitToolbar !== 'undefined') splitToolbar.classList.add('hidden');
        if (typeof splitDropZone !== 'undefined') splitDropZone.classList.add('hidden');
        if (typeof btnSplit !== 'undefined') btnSplit.classList.remove('active');

        // Restaurar estado de la tab activa en single viewer
        const active = TabManager.getActiveTab();
        if (active) {
            TabManager.restoreState(active);
        } else {
            TabManager._showEmptyState();
        }
        TabManager._renderTabBar();
    },

    swap() {
        if (!this.isSplit) return;
        const temp = this.leftTabId;
        this.openSplit(this.rightTabId, temp);
    }
};

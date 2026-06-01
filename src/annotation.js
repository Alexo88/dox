/* Khipu Codex — src/annotation.js */

'use strict';

/* ═══════════════════════════════════════════
    AnnotationLayer — Canvas overlay para dibujo
   ═══════════════════════════════════════════ */
const AnnotationLayer = {
    enabled: false,
    annotations: new Map(),   // sectionIdx → strokes[]
    activeTool: 'pen',        // 'pen' | 'eraser'
    activeColor: '#ff6b6b',
    activeSize: 3,
    isDrawing: false,
    currentSection: null,
    currentPath: [],          // strokes del path actual (antes de commit)
    toolbarEl: null,           // referencia al toolbar flotante
    btnAnnotate: null,

    COLORS: ['#ff6b6b', '#ffd93d', '#6bcbff', '#a66cff', '#51cf66', '#ff922b'],
    SIZES: [2, 4, 6, 10, 16],

    init() {
        // Referencias
        this.btnAnnotate = document.getElementById('btn-annotate');
        this.toolbarEl = document.getElementById('annotation-toolbar');
        if (!this.btnAnnotate || !this.toolbarEl) return;

        // Botón toggle
        this.btnAnnotate.addEventListener('click', () => this.toggle());
        this._buildToolbar();
    },

    toggle() {
        this.enabled = !this.enabled;
        this.btnAnnotate.classList.toggle('active', this.enabled);
        this.toolbarEl.classList.toggle('hidden', !this.enabled);
        if (!this.enabled) {
            this._removeAllCanvases();
        } else {
            this._attachAllCanvases();
        }
    },

    _buildToolbar() {
        // Color buttons
        const colorGroup = this.toolbarEl.querySelector('.ann-colors');
        colorGroup.innerHTML = '';
        this.COLORS.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'ann-color-btn' + (c === this.activeColor ? ' active' : '');
            btn.style.background = c;
            btn.dataset.color = c;
            btn.addEventListener('click', () => {
                this.activeColor = c;
                this.activeTool = 'pen';
                colorGroup.querySelectorAll('.ann-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            colorGroup.appendChild(btn);
        });

        // Size buttons
        const sizeGroup = this.toolbarEl.querySelector('.ann-sizes');
        sizeGroup.innerHTML = '';
        this.SIZES.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'ann-size-btn' + (s === this.activeSize ? ' active' : '');
            btn.innerHTML = `<span style="display:block;width:${s+4}px;height:${s+4}px;border-radius:50%;background:var(--text-primary);margin:auto;"></span>`;
            btn.dataset.size = s;
            btn.addEventListener('click', () => {
                this.activeSize = s;
                sizeGroup.querySelectorAll('.ann-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            sizeGroup.appendChild(btn);
        });

        // Eraser button
        const eraserBtn = this.toolbarEl.querySelector('.ann-eraser');
        eraserBtn.addEventListener('click', () => {
            this.activeTool = 'eraser';
            eraserBtn.classList.add('active');
            colorGroup.querySelectorAll('.ann-color-btn').forEach(b => b.classList.remove('active'));
        });

        // Clear all button
        this.toolbarEl.querySelector('.ann-clear').addEventListener('click', () => this.clear());

        // Pen button (default)
        this.toolbarEl.querySelector('.ann-pen').addEventListener('click', () => {
            this.activeTool = 'pen';
            eraserBtn.classList.remove('active');
        });
    },

    /**
     * Crea un canvas overlay sobre una sección.
     */
    _attachCanvas(el, idx) {
        if (el.querySelector('.ann-canvas')) return; // ya existe

        const canvas = document.createElement('canvas');
        canvas.className = 'ann-canvas';
        canvas.width = el.offsetWidth;
        canvas.height = el.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = this.enabled ? 'auto' : 'none';
        canvas.style.zIndex = '10';

        el.style.position = 'relative';
        el.appendChild(canvas);

        // Drawing handlers
        const ctx = canvas.getContext('2d');
        this._restoreStrokes(ctx, idx);

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return {
                x: (touch.clientX - rect.left) * (canvas.width / rect.width),
                y: (touch.clientY - rect.top) * (canvas.height / rect.height)
            };
        };

        const startDraw = (e) => {
            if (!this.enabled) return;
            e.preventDefault();
            this.isDrawing = true;
            this.currentSection = idx;
            this.currentPath = [];
            const pos = getPos(e);
            this.currentPath.push({ ...pos, color: this.activeColor, size: this.activeSize, tool: this.activeTool });
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const draw = (e) => {
            if (!this.isDrawing || this.currentSection !== idx) return;
            e.preventDefault();
            const pos = getPos(e);
            this.currentPath.push({ ...pos, color: this.activeColor, size: this.activeSize, tool: this.activeTool });

            const last = this.currentPath[this.currentPath.length - 2] || this.currentPath[0];
            if (this.activeTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = this.activeSize * 4;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = this.activeColor;
                ctx.lineWidth = this.activeSize;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const endDraw = () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            ctx.globalCompositeOperation = 'source-over';

            // Commit path to annotations store
            if (this.currentPath.length > 0) {
                if (!this.annotations.has(idx)) {
                    this.annotations.set(idx, []);
                }
                this.annotations.get(idx).push({ points: this.currentPath.slice() });
                this.currentPath = [];
                this.save();
            }
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', endDraw);
    },

    /**
     * Serializa strokes ANTES de desmaterializar la sección.
     */
    detachCanvas(el, idx) {
        const canvas = el.querySelector('.ann-canvas');
        if (!canvas) return;
        // Strokes ya están guardados en this.annotations — solo remover canvas
        canvas.remove();
    },

    /**
     * Redibuja strokes al materializar la sección.
     */
    restoreCanvas(el, idx) {
        if (!this.enabled) return;
        // Necesitamos esperar a que el content se renderice y mida
        requestAnimationFrame(() => {
            this._attachCanvas(el, idx);
        });
    },

    /**
     * Redibuja todos los strokes guardados para una sección.
     */
    _restoreStrokes(ctx, idx) {
        const strokes = this.annotations.get(idx);
        if (!strokes) return;

        strokes.forEach(path => {
            if (!path.points || path.points.length < 2) return;
            ctx.beginPath();
            const first = path.points[0];
            ctx.moveTo(first.x, first.y);

            for (let i = 1; i < path.points.length; i++) {
                const p = path.points[i];
                if (p.tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                    ctx.lineWidth = p.size * 4;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.size;
                }
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
            }
            ctx.globalCompositeOperation = 'source-over';
        });
    },

    _attachAllCanvases() {
        VirtualScroller.elements.forEach((el, idx) => {
            if (VirtualScroller.materialized.has(idx)) {
                this._attachCanvas(el, idx);
            }
        });
    },

    _removeAllCanvases() {
        VirtualScroller.elements.forEach(el => {
            const canvas = el.querySelector('.ann-canvas');
            if (canvas) canvas.remove();
        });
    },

    /**
     * Guarda anotaciones a localStorage.
     */
    save() {
        const activeTab = TabManager.getActiveTab();
        if (!activeTab) return;
        const key = `khipu-ann:${activeTab.name}`;
        const data = {};
        this.annotations.forEach((strokes, idx) => {
            data[idx] = strokes;
        });
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.warn('[Khipu] Error al guardar anotaciones:', err);
        }
    },

    /**
     * Carga anotaciones desde localStorage.
     */
    load(name) {
        if (!name) name = TabManager.getActiveTab()?.name;
        if (!name) return;
        const key = `khipu-ann:${name}`;
        this.annotations.clear();
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const data = JSON.parse(raw);
                Object.keys(data).forEach(idx => {
                    this.annotations.set(parseInt(idx, 10), data[idx]);
                });
            }
        } catch (err) {
            console.warn('[Khipu] Error al cargar anotaciones:', err);
        }
    },

    /**
     * Borra todas las anotaciones del documento activo.
     */
    clear() {
        if (!confirm('¿Borrar todas las anotaciones de este documento?')) return;
        this.annotations.clear();
        this._removeAllCanvases();
        if (this.enabled) this._attachAllCanvases();
        this.save();
    }
};

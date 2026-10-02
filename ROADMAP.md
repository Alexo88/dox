# Khipu Codex — Roadmap

> Creado: 2026-09-02 | Base: v0.4.1 | HEAD `cd8280c` | Estado verificado contra el código
>
> Este es el documento de **big picture**. El detalle por change vive en
> `openspec/changes/` (proposal → design → tasks → verify-report). El estado
> histórico por fase vive en `khipu-codex-plan.md`.

---

## Dónde estamos

App de escritorio (Tauri v1, EXE-only) para **ver, editar y anotar documentos DOCX/MD**.
Vanilla JS, sin framework, sin bundler: `build.js` concatena 17 módulos de `src/` e
inlina mammoth + marked. Web Worker para el parseo DOCX.

**Lo que ya está completo y verificado** (Fases 1A–6, 13 changes archivados):

| Área | Estado |
|---|---|
| Visor DOCX/MD con virtual scrolling | ✅ |
| Multi-tab con lazy DOM | ✅ |
| Editor MD con preview, versiones y guardado a disco | ✅ (Tauri, `atomic_write`) |
| Parser MD `marked.js` + sanitizador post-parse | ✅ |
| Split View / Book Mode con scrollers independientes | ✅ v0.4.0 |
| Single-instance (reusar ventana) | ✅ v0.4.0 |
| Visor SVG (sanitizador 6 pasos) | ✅ v0.3.0 |
| AnnotationLayer (dibujo libre) | ✅ |
| Hardening de seguridad (CSP, capabilities, allowlist) | ✅ v0.4.1 |
| Protocolo `requestId` del Web Worker | 🟡 parcial — ver abajo |

---

## Prioridad 1 — Cerrar lo que quedó abierto

Nada de functionality nueva. Es cerrar trabajo ya empezado.

### 1. `worker-race-recovery` — sin empezar (24 tareas)
El change más grande pendiente. Tiene `proposal.md`, `design.md` y deltas para
`docx-worker-lifecycle`, `file-handler` y `worker-message-protocol`, pero **cero tareas
implementadas**.

La spec `worker-message-protocol` estuvo mergeada en `openspec/specs/` sin implementación
que la respaldara. El 2026-09-02 se **de-mergeó**: vive ahora como draft en
`changes/worker-race-recovery/specs/worker-message-protocol/delta.md` y vuelve a los specs
canónicos solo cuando `/sdd-archive` mergee el delta tras verificar el change.

### 2. `security-c-csp` — cerrar fase 5
Implementación y verificación están hechas. Faltan las tareas 5.1 y 5.2
(`tasks.md:42-43`): confirmar que el commit contiene solo
`index.html`, `tauri.conf.json`, `KhipuCodex.html`, `public/index.html` y nada más.
Verificar contra el estado actual del repo antes de cerrar.

### 3. `security-d-svg-viewer` — verificación manual
Sanitizador + 7 fixtures adversariales listos (`tasks.md:10-23`). Falta la
verificación manual 3.3–3.5 (`tasks.md:28-30`):
- SVG adversariales renderizan **estáticos** (sin script ni fetch externo)
- SVG válido renderiza correctamente
- Worker / DOCX / Markdown sin regressions

Esto necesita una sesión con la app abierta, no es verificable con `node build.js`.

---

## Prioridad 2 — Deuda técnica conocida

| Item | Qué implica | Dónde |
|---|---|---|
| Anotaciones no se restauran en paneles de split | El panel derecho pierde las marcas al desmaterializar | `scroller.js:25-27`, `split.js` |
| Backup MD ≠ especificado | Hay historial de versiones, no la key `khipu-md:nombre:backup` del plan | `file-handler.js:242` |
| ~~Sin `TODO.md`~~ | ✅ Resuelto 2026-09-02: `AGENTS.md:70` ahora apunta a `odd/tasks/<feature>.md` | `AGENTS.md:70` |
| `openspec/config.yaml` congelado | Describe el `app.js` monolítico, el build portable `KhipuCodex.html` y una lista de "Known debt" que ya está toda resuelta | `openspec/config.yaml` |
| Sin suite de tests | SDD config tiene TDD deshabilitado; la verificación es `node build.js` | `openspec/config.yaml` |
| `security-b-tauri-capabilities` sin proposal/design | Change creado ad-hoc, fuera del workflow estándar | `openspec/changes/security-b-tauri-capabilities/` |

**Decisión ya tomada que conviene documentar**: no hay fallback de guardado en
browser (`file-handler.js:288-289`). Es coherente con EXE-only desde v0.3.0, pero
`khipu-codex-plan.md` pedía descarga vía `<a download>`. Si alguna vez se revierte
EXE-only, esto hay que reimplementar.

---

## Prioridad 3 — Backlog de ideas (sin commitment)

Ordenado por relación valor/complejidad. **Nada de esto está propuesto todavía** —
si querés arrancar alguno, va por el workflow SDD completo
(`/sdd-explore → /sdd-propose → /sdd-spec → /sdd-design → /sdd-tasks → /sdd-apply`).

- **Anotaciones en split view** — cerrar la deuda de arriba; es el hueco de UX más visible
- **Exportar a PDF** — vía `window.print()` con CSS de impresión; encaja con el uso de lectura/anotación
- **Búsqueda entre documentos** — hoy `Ctrl+F` es por documento
- **Tests** — al menos unit tests del sanitizador y del protocolo del worker; hoy la regresión depende de inspección visual
- **History de navegación (volver atrás)** — el back del navegador no aplica dentro del webview

---

## Reglas de este roadmap

- Actualizar cuando se cierra un change, no antes (`AGENTS.md:91`).
- Los cambios acá se proponen, los confirma la persona, y recién después se edita
  (`AGENTS.md:10`). Nunca se reescribe de cero.
- El estado de un change no se marca acá: sale de sus `tasks.md`. Acá va la
  dirección, no el checklist.

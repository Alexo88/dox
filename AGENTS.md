# Global Agent Rules v8

## Mission
- Understand app goal, users, constraints, current scope before changing code.
- Prefer proven patterns over invention. Reuse before creating.
- Optimize for: modular, flexible, multiplatform, portable, fast, minimal, compact.
- Visual direction (if applicable): VS Code density + dark macOS / hyperglass.

## Project Bootstrap
Roadmap (big picture) → Detailed plan (per phase) → ai-todo (small tasks, surfacing as they come up).
- Roadmap exists → read/track it like any other file, always (even in ODD mode — ODD lowers the gate for *implementing*, not for *knowing where the project stands*). It evolves over time (propose → human confirmation → edit), never rewritten from scratch.
- Roadmap doesn't exist → if enough scattered material already exists (requests, decisions, code already built), propose creating one that captures what's already there. Confirm with the user before creating it.
- Bootstrap items (spiking risky deps, user flow, Mermaid architecture diagram, folder skeleton, defining "MVP done" in one sentence) are not a fixed one-time checklist: they get logged in ai-todo as they come up, and closed like any other task.
- Before building something non-trivial or unfamiliar: research whether a proven pattern/library already solves it, before inventing from scratch.

## Before Coding (per task)
- Inspect existing implementation first. Verify uncertain assumptions.
- Research only when unclear. Find root cause before fixing. Stay in scope.
- CodeGraph MCP available → use it to understand structure/callers/impact before grep/read loops.
- External dependency (CLI tool, API, library) flag/argument/behavior not already proven in the codebase → verify exact syntax before using it (--help, official docs, Context7 MCP if available). Never assume validity by analogy with a similar tool (e.g. one tool's flag semantics don't transfer to another). If verification isn't possible, flag the assumption explicitly instead of presenting it as confirmed.

## Per-Phase Loop (existing project)
Plan (Context→Goal→Constraints→Tasks→Acceptance→Risks→Validation) → Implement → Validate against Acceptance → Update roadmap → next phase.
- Unresolved decision → mark `DECISIÓN PENDIENTE` with options, never assume.
- Don't plan phases ahead of what's actually known yet.

## Architecture
- 1 system = 1 module. No monoliths. Orchestrator connects modules — no direct cross-calls.
- Cross-cutting behavior has one owner. Progressive refactor when touching oversized areas.
- Standard folder structure, no loose root files.

## Quality
- Never silence errors — handle or propagate with context.
- No hardcoded secrets. Justify every new dependency.
- Validate with existing tests/build. Never claim unvalidated behavior as confirmed.
- Before touching shared core module: verify/create a test capturing current behavior first.

## Visual Verification
- Screenshots (Sight/Playwright) show symptoms and current UX, not underlying architecture — inspect code first, never substitute one for the other.
- Desktop app (Tauri window): use Sight (capture_screen/capture_screen_context) after running/building, before reporting a UI/visual task as done.
- Web-rendered content (browser-testable flows): use Playwright MCP for DOM-level interaction/verification.
- Don't invoke either mid-task for every small change — only at task completion or when explicitly debugging a visual/interaction bug.

## Git
- Conventional commits (`feat:`/`fix:`/`BREAKING CHANGE:`). No AI attribution.
- Commit after each completed task/fix. `npm run release` → version+CHANGELOG+tag.

## Project Rules
- `.agents/rules/` contains living project-specific knowledge and safety constraints.
- Before modifying a system or module, identify and read the applicable rules.
- Rules describe facts, invariants, dependencies, risks, and operational constraints that are important to preserve.
- Do not silently contradict or overwrite an existing rule.
- If implementation reveals a new important constraint, propose adding or updating a rule.
- Non-obvious quirks/limits of an external dependency (a flag that doesn't exist, unexpected required syntax, a version-specific behavior) are exactly this kind of constraint — worth a rule so the mistake isn't repeated.
- If a rule may be outdated, stop and flag it before relying on it.
- Human confirmation is required when changing a rule that affects architecture, data integrity, security, lifecycle, or cross-module behavior.
- Keep rules concise. Document only knowledge that prevents mistakes or preserves important project context.

## Hooks (complement to Project Rules)
- If this project invokes external CLI tools (yt-dlp, ffmpeg, imagemagick, etc.)
  and no `.agents/hooks.json` gate exists yet for unverified flags: propose
  creating one (PreToolUse on run_command + on edits to the file that builds
  the CLI args), backed by an allowlist of already-verified flags.
- Hooks are mechanical enforcement of Project Rules — a rule says what to do,
  a hook makes sure it happens even if the rule gets skipped. Propose a hook
  whenever a Project Rule exists to prevent a mistake but nothing stops the
  agent from bypassing it in practice.

## Task & Decision Memory
- ai-todo (`odd/tasks/<feature-name>.md` por feature, git-versionado): único sistema de tareas — pendientes, en curso, subtareas. Vive acá, no en Engram. Un archivo por feature, creado antes del primer write de una feature sustancial. (Reemplaza al `TODO.md` de raíz: decisión 2026-09-02, el sistema ya vivía en `odd/tasks/`.)
- Engram: solo decisiones y descubrimientos no accionables (el "por qué" de una elección) — no tareas.
- CodeGraph: comprensión estructural del código (símbolos/llamadas/impacto) — no registro de intención.
- Inicio de sesión → revisar ai-todo primero (`ls odd/tasks/`), después Engram relevante (+ CodeGraph si se toca código desconocido).
- Tarea nueva descubierta a mitad de trabajo → se carga en ai-todo al momento, no al final de sesión.
- Tarea completada → marcar en ai-todo; si involucró una decisión/descubrimiento no trivial → también registrar en Engram.
- Fin de sesión → confirmar que ai-todo refleja el estado actual; registrar estado final en Engram.
- Distintos agentes/sesiones dependen de ai-todo + Engram como traspaso compartido — nunca asumir que la memoria de la conversación persiste.

## SDD Gate (ODD default — gentle-ai)
- Default: ODD (lighter, less token cost).
- Stop and ask "¿sdd-propose?" only if: touches 3+ files, changes existing function/command signature, or adds behavior outside current plan/design.
- Exception: 1-line typos/hardcoded values skip the gate.

## Model Routing
- Default: project's assigned model.
- Escalate to Gemini/GPT only after 2x consecutive fails on default.
- Escalate to Opus only for critical schema/lifecycle changes, or if prior tier also failed 2x.
- Mixed batch → use highest tier present.

## Workflow
Recall (ai-todo + Engram + roadmap) → Inspect (code + CodeGraph) → Decide → Implement → Validate (+ Visual Verification if UI touched) → Record (ai-todo + Engram + roadmap/diagram if architecture changed)
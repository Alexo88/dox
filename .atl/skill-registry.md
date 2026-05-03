# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | C:\Users\alexo\.config\opencode\skills\skill-creator\SKILL.md |
| When writing Go tests, using teatest, or adding test coverage. | go-testing | C:\Users\alexo\.config\opencode\skills\go-testing\SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | judgment-day | C:\Users\alexo\.config\opencode\skills\judgment-day\SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review. | branch-pr | C:\Users\alexo\.config\opencode\skills\branch-pr\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | issue-creation | C:\Users\alexo\.config\opencode\skills\issue-creation\SKILL.md |
| Guide for building 1-click launchers and building apps with launchers built-in using Pinokio | gepeto | C:\Users\alexo\.agents\skills\gepeto\SKILL.md |
| Discover, launch, and use apps and tools for the current task. | pinokio | C:\Users\alexo\.agents\skills\pinokio\SKILL.md |
| Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. | find-skills | C:\Users\alexo\.agents\skills\find-skills\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### skill-creator
- Skill structure: `skills/{name}/SKILL.md` with optional `assets/` and `references/`
- Frontmatter required: name, description (with Trigger:), license (Apache-2.0), metadata.author (gentleman-programming), metadata.version
- DO: start with critical patterns, use tables for decision trees, keep examples minimal, include Commands section
- DON'T: add Keywords section, duplicate existing docs, include lengthy explanations, add troubleshooting sections
- Use `assets/` for code templates/schemas, `references/` for local doc links (not web URLs)
- Naming: `{technology}` for generic, `{project}-{component}` for project-specific, `{action}-{target}` for workflow

### go-testing
- Table-driven tests are the standard Go pattern for multiple test cases
- Bubbletea TUI: test Model.Update() directly for state changes, use teatest.NewTestModel() for full flows
- Golden file testing for visual/rendering output comparison
- Use `t.TempDir()` for file operations in tests, `*update` flag for golden file regeneration
- Commands: `go test ./...`, `go test -cover ./...`, `go test -short ./...` (skip integration)

### judgment-day
- Launch TWO sub-agents via delegate() in parallel — NEVER sequential, NEVER review yourself
- Neither judge knows about the other — no cross-contamination
- Classify warnings: WARNING (real) = normal user can trigger; WARNING (theoretical) = contrived scenario
- After Fix Agent returns, IMMEDIATE next action is re-launching judges in parallel
- After 2 fix iterations, ASK user before continuing — never escalate automatically
- MUST NOT declare APPROVED until: Round 1 CLEAN, or Round 2 with 0 CRITICALs + 0 confirmed real WARNINGs
- Resolve skills from registry BEFORE launching judges — inject Project Standards into ALL prompts

### branch-pr
- Every PR MUST link an approved issue (Closes/Fixes/Resolves #N) — no exceptions
- Every PR MUST have exactly one `type:*` label
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`
- Conventional commits required: `type(scope): description` — never add "Co-Authored-By"
- Run shellcheck on modified scripts before pushing
- Blank PRs without issue linkage will be blocked by GitHub Actions

### issue-creation
- Blank issues are disabled — MUST use template (Bug Report or Feature Request)
- Every issue gets `status:needs-review` automatically; maintainer MUST add `status:approved` before PR
- Search for duplicates before creating new issues
- Questions go to Discussions, NOT issues
- Bug Report: requires pre-flight checks, description, steps to reproduce, expected/actual behavior, OS, agent, shell
- Feature Request: requires pre-flight checks, problem description, proposed solution, affected area

### gepeto
- Non-negotiable 5-step workflow: AGENTS Snapshot → Example Lock-in → Pre-flight Checklist → Mid-task Verification → Exit Checklist
- Always copy URL capture block from examples for start.js: `on: [{ event: "/(http:\\/\\/[0-9.:]+)/", done: true }]`
- Every launcher change must mirror reference examples unless user explicitly instructs otherwise
- Cross-check Pinokio script syntax against examples in `system/examples/`

### pinokio
- Assume `pterm` is preinstalled — do not ask users to manually install/launch when pterm can do it
- Resolve pterm path from `~/.pinokio/config.json` home attribute or control-plane API
- Windows path: `<home>\\bin\\npm\\pterm`; macOS/Linux: `<home>/bin/npm/bin/pterm`
- Fallback: generic local lookup if control-plane unreachable

### find-skills
- Use `npx skills find [query]` to search the open agent skills ecosystem
- Use `npx skills add <package>` to install, `npx skills update` to update all
- Trigger when user asks "how do I do X", "find a skill for X", or expresses interest in extending capabilities

## Project Conventions

| File | Path | Notes |
|------|------|-------|

No project-level convention files found (no AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, or copilot-instructions.md).

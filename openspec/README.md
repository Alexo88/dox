# OpenSpec — Khipu Codex

This directory contains the **SDD (Spec-Driven Development)** artifacts for the Khipu Codex project.

## What is SDD?

SDD is a structured workflow that ensures every change goes through:

1. **Explore** → Understand the problem space
2. **Propose** → Define intent, scope, and approach
3. **Spec** → Write requirements and scenarios (Given/When/Then)
4. **Design** → Architecture and technical approach
5. **Tasks** → Break into implementation tasks
6. **Apply** → Implement each task
7. **Verify** → Prove implementation matches specs
8. **Archive** → Merge delta specs into main specs

## Directory Layout

```
openspec/
├── config.yaml          ← Project context, rules, testing capabilities
├── README.md            ← This file
├── specs/               ← Source of truth (main specs per domain)
│   └── {domain}/
│       └── spec.md
└── changes/             ← Active and archived changes
    ├── archive/         ← Completed changes (YYYY-MM-DD-{name}/)
    └── {change-name}/   ← Active change folder
        ├── state.yaml
        ├── exploration.md   (optional, from sdd-explore)
        ├── proposal.md      (from sdd-propose)
        ├── specs/           (from sdd-spec)
        ├── design.md        (from sdd-design)
        ├── tasks.md         (from sdd-tasks, updated by sdd-apply)
        └── verify-report.md (from sdd-verify)
```

## Quick Start

To start a new change:

```
/sdd-explore    — Explore the idea before committing
/sdd-propose    — Create a formal proposal
/sdd-spec       — Write delta specs
/sdd-design     — Technical design
/sdd-tasks      — Break into tasks
/sdd-apply      — Implement
/sdd-verify     — Verify against specs
/sdd-archive    — Archive and merge
```

## Current Status

- **Strict TDD**: Disabled (no test runner available)
- **Persistence**: openspec (files in repo for traceability)
- **Build command**: `node build.js`

## Conventions

- All specs use Given/When/Then scenarios with RFC 2119 keywords
- Proposals must include rollback plans for risky changes
- Tasks are grouped by phase, completable in one session
- Never touch more than 3 files per task without splitting

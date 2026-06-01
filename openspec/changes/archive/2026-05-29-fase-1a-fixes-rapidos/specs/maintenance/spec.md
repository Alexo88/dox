# Maintenance Specification

## Purpose

Update project identity, documentation, and configuration for Khipu Codex.

## Requirements

### Requirement: Update dx.bat error message
The system MUST show "Khipu Codex" instead of "DocxLite" in the error message in `dx.bat`.

#### Scenario: Verify dx.bat error message
- GIVEN `dx.bat` is executed when dependencies are missing
- WHEN the script runs the check
- THEN the error message MUST display "Error: Khipu Codex no está en..."

### Requirement: Clean tauri.conf.json allowlist
The system MUST remove the `process` object from the tauri.conf.json allowlist.

#### Scenario: Verify tauri config
- GIVEN `src-tauri/tauri.conf.json` exists
- WHEN the configuration is parsed
- THEN the `process` key MUST NOT exist in the allowlist

### Requirement: Update README.md
The system MUST provide an updated `README.md` reflecting the new project name "Khipu Codex" and current features.

#### Scenario: Verify README content
- GIVEN the `README.md` file
- WHEN it is read
- THEN it MUST mention "Khipu Codex", features, and build instructions

### Requirement: Update CHANGELOG.md
The system MUST append a v0.3.0 entry documenting the audit fixes in `CHANGELOG.md`.

#### Scenario: Verify Changelog entry
- GIVEN the `CHANGELOG.md` file
- WHEN it is read
- THEN it MUST contain a v0.3.0 section listing security, UI, icon, open-with, and CSS fixes

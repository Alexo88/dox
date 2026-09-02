# Delta for docx-worker-lifecycle

## MODIFIED Requirements

### Requirement: Single Worker

The app SHALL maintain at most one active worker instance at any time.
(Previously: Implicitly assumed single worker)

### Requirement: Crash Detection

On `worker.onerror`, the app MUST:
- Collect all pending requestIds from the crashed worker.
- Mark them as `failed` with reason `'crash'`.
- Terminate the dead worker.
- Release retained input references for invalidated requests.
(Previously: Unspecified behavior on worker error)

#### Scenario: Worker crash with multiple pending (S2)

- GIVEN 2 DOCX files opened rapidly (both pending)
- WHEN worker crashes
- THEN both requests SHALL be marked failed
- AND a new worker SHALL be created
- AND notification SHALL show for the most recent fileName

### Requirement: Worker Recreation

After termination, a new worker SHALL be created via the factory function. `onmessage` and `onerror` handlers SHALL be registered on the NEW instance.
(Previously: No worker recreation logic)

### Requirement: Handler Registration

Handlers SHALL be registered exactly once per worker instance (not accumulated across crashes).
(Previously: No handler registration lifecycle)

### Requirement: User Feedback

After crash, a notification SHALL show: "Error en el worker al procesar {fileName}." Persistent for 3s.
(Previously: No user feedback on worker crash)

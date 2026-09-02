# Delta for file-handler

## MODIFIED Requirements

### Requirement: Input Ownership

Before transferring the ArrayBuffer to the worker, the app SHALL create a clone via `arrayBuffer.slice(0)`. This clone SHALL be stored in the RequestState for potential retry.
(Previously: Implicit input ownership without retry capabilities)

### Requirement: Input Sources

- File picker / drag & drop: store reference to original `File` object.
- "Abrir con..." (argv): store typed array copy from Rust result.
(Previously: No explicit input source tracking)

### Requirement: Automatic Retry

After crash, the app MAY retry at most ONE time. Retry SHALL only occur if `RequestState.inputSource` is available.
(Previously: No retry logic)

#### Scenario: Retry with valid input (S3)

- GIVEN a DOCX file opened via drag & drop
- WHEN worker crashes during processing
- AND the File reference is available
- THEN the app SHALL retry once automatically
- AND the new request SHALL have a new requestId

#### Scenario: Crash without reusable input (S4)

- GIVEN a file opened via argv (from Rust)
- WHEN worker crashes
- AND the buffer copy is unavailable or corrupted
- THEN the app SHALL NOT retry
- AND the worker SHALL still be recreated for future opens

### Requirement: Mammoth Errors

`{ type: 'error' }` responses SHALL be displayed as user-facing errors. They MUST NOT trigger worker recreation or automatic retry.
(Previously: Unhandled error responses)

#### Scenario: Mammoth error (not a crash) (S5)

- GIVEN a DOCX file
- WHEN mammoth returns `{ type: 'error', error: 'Invalid format' }`
- THEN the error SHALL be displayed to the user
- AND the worker SHALL NOT be terminated or recreated

### Requirement: tabId Association

When a request starts, `tabId` MAY be `null`. The request SHALL store `fileName` and use it to match against the active tab name when the response arrives. After the tab is created, `tabId` SHALL be set on the RequestState for subsequent stale checks.
(Previously: No tab association)

#### Scenario: Quick open A then B (S1)

- GIVEN A and B are DOCX files
- WHEN user opens A, then immediately opens B
- THEN A's worker response SHALL be discarded as stale
- AND B's content SHALL render correctly in B's tab

### Requirement: Stale Cleanup

When a request transitions to `stale` or `failed`, its input references SHALL be released. The `pendingRequests` entry SHALL be removed after 5s (grace period for any in-flight messages).
(Previously: Unspecified cleanup behavior)

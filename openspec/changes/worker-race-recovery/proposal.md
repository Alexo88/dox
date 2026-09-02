# Proposal: worker-race-recovery

## Intent

Prevent stale DOCX worker responses from rendering in incorrect tabs and ensure robust recovery from worker crashes, with explicit input ownership to avoid detached-buffer issues on retry.

## Scope

### In Scope
- `requestId` contract between main thread and worker for stale response detection.
- Associate every request with its document context (fileName, tab, token, state).
- Discard stale responses without side effects on progress, title, or active tab.
- Detect worker crash → invalidate pending requests → terminate dead worker → create new one.
- Retry: max one time, only if retry-capable input is available. Never retry Mammoth errors.
- User-visible feedback: crash notification, recovery status, which document failed.

### Out of Scope
- Worker pooling or multi-worker architecture.
- Modifying SVG or Markdown rendering paths.
- Altering mammoth.js or DOCX conversion core logic.
- Changes to file-handler's save flows or Rust commands.

## Capabilities

### New Capabilities
- `worker-message-protocol`: RequestId-based message correlation with full document context (requestId, fileName, tabId, token, state).

### Modified Capabilities
- `docx-worker-lifecycle`: Worker init, message routing, crash detection, termination, and recreation.
- `file-handler`: File loading workflow with input ownership tracking and retry-safe async processing.

## Approach

### 1. Request Registry

Introduce a `pendingRequests` structure (Map<requestId, RequestState>):
```javascript
{
  requestId: number,          // monotonic counter
  fileName: string,           // file name for this request
  tabId: number | null,       // target tab if already created
  documentToken: string|null, // Rust token if applicable
  state: 'pending',           // transitions: pending→completed|failed|stale
  inputSource: File | ArrayBuffer | null,  // retry-capable input
  inputPath: string | null    // file path for argv opens (re-read from disk)
}
```

### 2. Input Ownership

- **File picker / drag & drop**: keep a reference to the original `File` object. Not a copy of the buffer.
- **"Abrir con..." (argv)**: keep a copy of the typed array (`new Uint8Array(result.content)`) since the Rust-side `Vec<u8>` is consumed after serialization.
- Before `postMessage`, take a clone for retry: `retryBuffer = arrayBuffer.slice(0)` (shallow copy of the bytes).
- The clone is stored ONLY in the RequestState entry. Released when request completes or is invalidated.

### 3. Message Protocol

Each `postMessage` includes metadata:
```javascript
// Sent TO worker: { requestId, payload: arrayBuffer }
this.worker.postMessage({ requestId: this.nextRequestId, payload: arrayBuffer }, [arrayBuffer]);
```

Worker echoes `requestId` in response:
```javascript
// Received FROM worker: { requestId, type: 'success', html, messages }
// or: { requestId, type: 'error', error }
// or crash (no message at all)
```

### 4. Stale Response Policy

On receiving a response:
1. Look up `requestId` in `pendingRequests`.
2. If not found OR state is not 'pending' → response is stale → discard silently.
3. If found AND state is 'pending' → compare requestId against latest expected:
   - `response.requestId === currentRequestId` → process and render.
   - `response.requestId < currentRequestId` → mark stale, discard, no UI changes.

Stale response never modifies: active tab, progress bar, document title, or search state.

### 5. Crash Lifecycle

On `worker.onerror`:
1. Collect all pending requestIds from the crashed worker.
2. Mark them as `failed` with reason `'crash'`.
3. Terminate the dead worker: `this.worker.terminate()`.
4. Invalidate: release any retained input references (buffers, File refs).
5. Create new worker via the factory function.
6. Re-register `onmessage` and `onerror` handlers on the new worker.
7. Show persistent feedback: "Worker error: {fileName}. Cerrá y reabrí el archivo." for 3s.
8. Do NOT block the UI — the new worker is ready for the next user action.

### 6. Retry Policy (only after crash)

- Max **one** automatic retry per request.
- Only triggers if `RequestState.inputSource` is available (File or buffer clone).
- Retry creates a NEW request with a new `requestId`. The old request stays `failed`.
- Never retry `{ type: 'error' }` responses (those are legitimate Mammoth errors).
- If retry input is NOT available (already detached, no File ref, no buffer clone):
  - Recreate the worker anyway (so next open works).
  - Show error, do NOT retry, do NOT block.
- After retry fails → no more retries for that request. User must re-open manually.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/file-handler.js` | Modified | Worker lifecycle, request registry, input ownership, stale detection, crash recovery |
| `docx.worker.js` | Modified | Echo requestId, accept structured message instead of raw buffer |
| `src/tabs.js` | Minor | May expose tabId for request association |
| `src/progress.js` | Minor | Crash notification feedback duration/severity |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ArrayBuffer detached on retry | Low | Keep File ref or buffer clone BEFORE transfer |
| Infinite retry loop | None | Max 1 retry, never retry Mammoth errors |
| Stale response shown briefly | Low | requestId check before ANY side effect (progress, title, render) |

## Rollback Plan

- Revert `docx.worker.js` to accept raw ArrayBuffer (remove requestId protocol).
- Revert `src/file-handler.js` to single-worker-no-recovery.
- Revert `src/tabs.js` and `src/progress.js` if touched.

## Dependencies

- None.

## Success Criteria

- [ ] Open A then B rapidly: A's content never appears in B's tab (nor vice versa).
- [ ] Stale response does not modify tab, progress, title, or search state.
- [ ] After worker crash (simulated): worker is recreated, pending requests invalidated, next open works.
- [ ] Automatic retry fires at most once and only when input source is available.
- [ ] Mammoth { type: 'error' } responses are shown as errors, NOT retried.
- [ ] All pending requests are cleaned up after crash (no memory leaks, no stale entries).

# Design: worker-race-recovery

## Architecture Decisions

| Decision | Option | Rationale |
|----------|--------|-----------|
| Request correlation | Monotonic `requestId` counter | Simple, no UUID overhead, single-threaded guarantees ordering |
| `tabId` nullable | `null` at request start, filled on tab creation | Request starts before tab exists (file picker → FileReader → worker → response → tab). `fileName` used for intermediate matching |
| Retry identity | New `requestId` on retry | Retry is a fresh request through normal stale-detection. Old request stays `failed` |
| Progress ownership | Optional `requestId` param on `Progress.show()` | Minimal API change, backward compatible. No-op when `requestId !== currentRequestId` |
| Worker message format | `{ requestId, payload }` wrapper | Non-breaking: protocol is updated atomically with the worker file. Transfer list references `payload`, not the wrapper |
| Input clone timing | `arrayBuffer.slice(0)` BEFORE `postMessage` | Zero-copy transfer still works; clone is separate memory for retry |
| Max retries | 1 | Prevents loops. Crash likely to repeat — one retry is sufficient |
| Pending cleanup | 5s grace after staleness | Catches late messages without leaking memory |
| Crash action | Terminate → Create new → Register handlers | Clean slate. Old worker is dead; new worker gets fresh handlers exactly once |

---

## Data Structures

### RequestRegistry (new, in FileHandler)

```
FileHandler._nextRequestId: number      → monotonic counter, init 1
FileHandler._currentRequestId: number   → the latest request the user cares about
FileHandler._pendingRequests: Map       → Map<requestId, RequestState>

RequestState {
  requestId: number,
  fileName: string,
  tabId: number | null,         // set when _renderHtml opens/updates a tab
  documentToken: string | null, // for future Rust-side crash tracking
  state: 'pending' | 'completed' | 'failed' | 'stale',
  inputSource: File | ArrayBuffer | null,  // retry-capable input (ArrayBuffer for argv/buffer opens)
  inputSourceType: 'file' | 'buffer' | 'none',
  createdAt: number             // Date.now()
}
```

**Cleanup policy:** Before creating a new RequestState (in `handleFile` or `_sendToWorker`), prune all entries with state `stale` or `failed` and `createdAt` older than 5000ms. This keeps the Map bounded without an explicit timer. Input references are already released when entries transition to stale/failed, so pruning only removes the metadata wrapper.

### Progress.show() signature (modified)

```javascript
// Before: Progress.show(text, pct)
// After:
Progress.show(text, pct, requestId?)
// If requestId is provided and !== FileHandler._currentRequestId → no-op
```

---

## Flow Diagrams

### Normal Flow (single doc)

```
User opens DOCX via drag & drop
  │
  ├─ handleFile(file)
  │   ├─ this.currentMarkdown = null
  │   ├─ reader.readAsArrayBuffer(file)
  │   │
  │   └─ reader.onload:
  │       ├─ id = this._nextRequestId++
  │       ├─ this._currentRequestId = id
  │       ├─ pendingRequests.set(id, {
  │       │     requestId: id,
  │       │     fileName: file.name,
  │       │     tabId: null,
  │       │     state: 'pending',
  │       │     inputSource: file,                  ← File ref for retry (file picker/drag)
  │       │                                          For argv opens: inputSource is ArrayBuffer copy
  │       │     inputSourceType: 'file'             ← 'buffer' for argv opens
  │       │   })
  │       ├─ Progress.show('Procesando...', 50, id)
  │       └─ worker.postMessage({ requestId: id, payload: arrayBuffer }, [arrayBuffer])
  │
  ├─ Worker receives { requestId, payload }
  │   ├─ result = await mammoth.convertToHtml(payload)
  │   └─ postMessage({ requestId, type: 'success', html, messages })
  │
  └─ _onWorkerMessage(data):
      ├─ entry = pendingRequests.get(data.requestId)
      ├─ if (!entry || entry.state !== 'pending') → discard silently    ← stale gate
      ├─ if (data.requestId !== this._currentRequestId)                 ← stale gate
      │     entry.state = 'stale', release inputSource, return
      ├─ entry.state = 'completed'
      ├─ Progress.show('Renderizando...', 80, data.requestId)
      └─ _renderHtml(html, messages)
          ├─ TabManager.openDocument(name, html, sections, ...)
          │   └─ tabId is returned → entry.tabId = tab.id
          └─ Progress.hide()
```

### Race: Open A then B quickly

```
Time ────────────────────────────────────────────────────────────────>
     Open A              Open B              A response arrives     B response arrives

A:   postMessage(id=1)   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                         B: postMessage(id=2)
                         _currentRequestId = 2
                                             A: _onWorkerMessage({requestId:1})
                                                entry.state === 'pending' ✓
                                                requestId(1) !== _currentRequestId(2)
                                                → mark stale, discard, release inputSource
                                                                      B: _onWorkerMessage({requestId:2})
                                                                         entry.state === 'pending' ✓
                                                                         requestId(2) === _currentRequestId(2) ✓
                                                                         → render B correctly
```

### Crash + Recovery Flow

```
Worker.onerror:
  │
  ├─ 1. Invalidate ALL pending
  │     for each [id, entry] of pendingRequests:
  │       entry.state = 'failed'
  │       entry.inputSource = null (release)
  │
  ├─ 2. Terminate dead worker
  │     this.worker.terminate()
  │
  ├─ 3. Create new worker
  │     this.worker = createWorker()
  │     this.worker.onmessage = (e) => this._onWorkerMessage(e.data)
  │     this.worker.onerror = (e) => this._handleWorkerCrash(e)
  │
  ├─ 4. Show notification
  │     Progress.show('Error en worker al procesar {fileName}', 0)
  │     setTimeout(Progress.hide, 3000)
  │
  └─ 5. Attempt retry (max 1)
        find failed entry with highest requestId that has inputSource
        │
        ├─ if inputSourceType === 'file':
        │     const reader = new FileReader()
        │     reader.onload = (e) =>
        │       this._sendToWorker(e.target.result, entry.fileName)
        │     reader.readAsArrayBuffer(entry.inputSource)
        │
        ├─ if inputSourceType === 'buffer':
        │     this._sendToWorker(entry.inputSource, entry.fileName)
        │
        └─ if inputSourceType === 'none':
              do NOT retry (wait for user to re-open)
```

### Mammoth Error (NOT a crash)

```
Worker sends: { requestId: 5, type: 'error', error: 'Invalid format' }

_onWorkerMessage(data):
  ├─ entry = pendingRequests.get(5)  → found, state='pending'
  ├─ requestId(5) === _currentRequestId(5) ✓
  ├─ entry.state = 'failed'
  ├─ Progress.show('Error: Invalid format', 0, 5)
  ├─ setTimeout(Progress.hide, 3000)
  └─ worker is NOT terminated ← key difference from crash
```

---

## Modified Code Sections

### `src/file-handler.js`

| Location | Change |
|----------|--------|
| `init()` (line 19) | Add `this._nextRequestId = 1`, `this._currentRequestId = null`, `this._pendingRequests = new Map()` |
| `handleFile()` DOCX branch (line 310-315) | Add buffer clone, create RequestState, structured postMessage with requestId |
| `_onWorkerMessage()` (line 520) | Add stale-detection gate before processing. Forward requestId to Progress.show() and _renderHtml() |
| `_renderHtml()` (line 491) | Accept optional requestId, set tabId on RequestState when tab opens |
| NEW `_sendToWorker(arrayBuffer, fileName)` | Creates requestId, stores RequestState, sends structured message |
| NEW `_handleWorkerCrash(e)` | Invalidate pending, terminate, recreate, notify, attempt retry |
| `worker.onerror` (line 23) | Replace inline handler with call to `_handleWorkerCrash` |
| `_sanitizeHtml()` | No changes needed |

### `docx.worker.js`

| Location | Change |
|----------|--------|
| `self.onmessage` (line 15) | Destructure `{ requestId, payload }` instead of raw `e.data`. Echo `requestId` in response |

### `src/progress.js`

| Location | Change |
|----------|--------|
| `show(text, pct)` | Add `requestId` param (optional, default undefined). Add `Progress._getCurrentRequestId = null` (callable getter). `FileHandler.init()` calls `Progress.setCurrentRequestId(() => this._currentRequestId)`. If `requestId` is provided and `_getCurrentRequestId()` returns a different value → no-op. This decouples Progress from FileHandler via a closure getter. |

---

## Edge Cases

### 1. Rapid open A → B (race)
- Handled by `requestId` check in `_onWorkerMessage`. A's response has id=1, currentRequestId=2 → stale → discarded. No side effects.

### 2. Crash with multiple pending requests
- All pending entries marked `failed`. Highest requestId attempted for retry if inputSource available. Worker recreated for future opens.

### 3. Retry with valid File reference
- File reference kept in RequestState.inputSource. New FileReader reads it → new requestId → postMessage. One retry only.

### 4. Crash without reusable input
- e.g., argv open where buffer copy was corrupted or never stored. Worker is still recreated. No retry. User must re-open. Notification shown.

### 5. Mammoth error (not a crash)
- `{ type: 'error' }` is a normal message. Processed through `_onWorkerMessage`. Worker NOT terminated. No retry.

### 6. Request completes while another is pending
- `entry.state = 'completed'`. When late duplicate arrives, `entry.state !== 'pending'` → discarded as stale.

### 7. Multiple rapid crashes
- Each crash creates a new worker. Each crash triggers invalidation. Retry only attempts on the FIRST crash (one retry per original request). Subsequent crashes on the retry do NOT retry again (the retry request is marked failed).

### 8. Crash during retry FileReader window
- Retry for `inputSourceType === 'file'` creates a new `FileReader` before `_sendToWorker` establishes a new `requestId`. If the NEW worker crashes during this async window:
  - `_handleWorkerCrash` fires, but `_pendingRequests` has no entry yet → invalidation loop is a no-op
  - Worker is terminated and recreated again
  - The FileReader's `onload` fires later, calling `_sendToWorker` on the now-current worker
  - The document opens correctly but with more delay
- This is NOT a correctness bug (document still opens), but means crash-during-retry silently escalates to potentially multiple recreations.
- Mitigation (optional, not required for V1): Add `_isRetrying` flag to prevent redundant crash handling during the retry window.

---

## Rollback

Revert changes to these files:
- `src/file-handler.js`
- `docx.worker.js`
- `src/progress.js`

No database, no schema, no config changes.

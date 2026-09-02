# Tasks: Worker Race Recovery

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation + validation | PR 1 | Single PR within budget |

## Phase 1: Worker message protocol (docx.worker.js + FileHandler)

- [ ] 1.1 Modify `self.onmessage` in `docx.worker.js` (line 15) to destructure `{ requestId, payload }` and echo `requestId` in success/error responses
- [ ] 1.2 Add `this._nextRequestId = 1`, `this._currentRequestId = null`, `this._pendingRequests = new Map()` to `FileHandler.init()` (line 19)
- [ ] 1.3 In `handleFile()` DOCX branch (line 310–315): store buffer clone, create `RequestState`, send `{ requestId, payload }` via `postMessage` with transfer list on `payload`

## Phase 2: Stale response detection

- [ ] 2.1 Add stale gate in `_onWorkerMessage()` (line 520): validate `pendingRequests.get(data.requestId)` state === `'pending'` and `data.requestId === this._currentRequestId`. Discard stale responses without side effects
- [ ] 2.2 Prune cleanup: before creating new `RequestState`, remove entries with state `stale`/`failed` and `createdAt` > 5s

## Phase 3: Input ownership and request registry

- [ ] 3.1 Create `RequestState` entries in `handleFile()`: store `fileName`, `tabId` (null), `inputSource` (File ref or buffer copy), `inputSourceType`, `createdAt`
- [ ] 3.2 For argv opens in `_handleOpenWithArgv()` (line 134–145): store `ArrayBuffer` copy as `inputSource` with type `'buffer'` before `postMessage`
- [ ] 3.3 Set `tabId` on the `RequestState` entry after `TabManager.openDocument()` returns the tab id in `_renderHtml()` (line 491)

## Phase 4: Crash recovery

- [ ] 4.1 Extract `worker.onerror` (line 23) into `_handleWorkerCrash()`: invalidate all pending, terminate, create new worker, register handlers once
- [ ] 4.2 Add `Progress.setCurrentRequestId(getterFn)` to `Progress` module and wire it in `FileHandler.init()`
- [ ] 4.3 Add `requestId` param to `Progress.show()` — no-op when `requestId !== _currentRequestId`
- [ ] 4.4 Show crash notification: "Error en el worker al procesar {fileName}." for 3s, then recreate worker

## Phase 5: Retry (max 1)

- [ ] 5.1 In `_handleWorkerCrash()`: after recreation, find the failed entry with highest `requestId` that has `inputSource`
- [ ] 5.2 If `inputSourceType === 'file'`: create new `FileReader`, read `arrayBuffer`, call `_sendToWorker()` with new `requestId`
- [ ] 5.3 If `inputSourceType === 'buffer'`: call `_sendToWorker()` directly with stored `ArrayBuffer`
- [ ] 5.4 If `inputSourceType === 'none'`: show error notification, do NOT retry
- [ ] 5.5 Ensure `{ type: 'error' }` Mammoth responses go through normal message path, never trigger recreation or retry

## Phase 6: Validation (manual — no test framework)

- [ ] 6.1 S1: Quick open A then B — open two DOCX files rapidly, verify correct content per tab
- [ ] 6.2 S2: Crash with multiple pending — simulate worker error, verify invalidation, recreation, notification
- [ ] 6.3 S3: Retry with valid input — simulate crash during drag-drop open, verify retry fires once
- [ ] 6.4 S4: Crash without reusable input — simulate crash with argv open (no buffer clone), verify no retry, worker recreated
- [ ] 6.5 S5: Mammoth error — verify error displayed, worker NOT terminated
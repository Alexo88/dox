# Worker Message Protocol Specification

## Purpose

Define a robust request-response correlation mechanism between the main thread and the DOCX worker to prevent stale rendering and support crash recovery.

## Requirements

### Requirement: RequestId Assignment

Every `postMessage` to the DOCX worker MUST include a monotonic `requestId`. The counter SHALL increment on every send.

#### Scenario: RequestId increment

- GIVEN the worker is initialized
- WHEN the main thread sends two consecutive requests
- THEN the first request MUST have requestId N
- AND the second request MUST have requestId N+1

### Requirement: Message Structure

Messages sent TO the worker SHALL be `{ requestId: number, payload: ArrayBuffer }`. The ArrayBuffer SHALL be transferred.

#### Scenario: Message transmission

- GIVEN a valid ArrayBuffer payload
- WHEN postMessage is called
- THEN the worker receives the payload as an ArrayBuffer
- AND the requestId is correctly set

### Requirement: Response Echo

The worker MUST echo the same `requestId` in its response: `{ requestId, type, html, messages }` or `{ requestId, type, error }`.

#### Scenario: Successful echo

- GIVEN the worker receives a request with requestId 123
- WHEN it finishes processing
- THEN it sends a response back containing requestId 123

### Requirement: Response Validation

Before processing a response, the main thread SHALL validate that `response.requestId` matches the latest expected `requestId`. If mismatch → stale → discard silently.

#### Scenario: Stale response discarded

- GIVEN a pending request with requestId 5
- WHEN a response arrives for requestId 4 (stale)
- THEN the main thread MUST discard it silently

### Requirement: Request Registry

A `pendingRequests` map SHALL track every in-flight request.

### Requirement: Per-Request Progress

Every progress update SHALL carry the owning `requestId`. An update MUST NOT appear if its `requestId` no longer matches the active request.

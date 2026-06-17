# Implementation Plan: Phase 18 Command Runtime Audit

## Overview

Phase 18 turns review queue approval into a runtime command transition with audit evidence. The citizen shell can now show that an approval created a domain event, queued projection work, and preserved the reviewer identity.

Source artifacts:

- `docs/plans/2026-06-17-phase-13-citizen-command-review-queues.md`
- `docs/plans/2026-06-17-phase-16-database-backed-command-persistence.md`
- `docs/plans/2026-06-17-phase-17-citizen-form-submission-handlers.md`
- `apps/canopy-web/src/lib/citizen-command-provider.ts`

## Outcomes

- Review approval uses the command provider instead of a display-only route state.
- Approved commands include an audit trail.
- Audit records include event type, outbox destination, projection effect, reviewer, and timestamp.
- In-memory and persistent providers both preserve approval audit evidence.
- The review queue route exposes the audit evidence in plain language.

## Tasks

### Batch 1: Runtime Command Execution

- [x] Add failing Phase 18 command runtime audit tests.
- [x] Add `executeCitizenCommandReview`.
- [x] Add provider-level `approveCommand`.
- [x] Preserve audit trail on in-memory provider records.
- [x] Preserve audit trail on persistent storage records.

### Batch 2: Route Integration

- [x] Parse `reviewAction` route parameter.
- [x] Execute review approval from `/citizen/review-queue`.
- [x] Keep the approved command selected after transition.
- [x] Surface command approval as an action result.

### Batch 3: Citizen Audit Visibility

- [x] Render audit event evidence on selected command detail.
- [x] Render outbox destination and projection effect.
- [x] Add stable styling for audit evidence.

### Batch 4: Verification

- [x] Run focused Phase 18 tests.
- [x] Run combined citizen command tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify review approval on desktop and mobile.

## Remaining Product Work After This Slice

- Add review rejection and request-changes actions.
- Add actor/session-derived reviewer identity.
- Connect audit events to a real outbox adapter.
- Add projection processor acceptance tests.
- Add tamper-evident audit identifiers.

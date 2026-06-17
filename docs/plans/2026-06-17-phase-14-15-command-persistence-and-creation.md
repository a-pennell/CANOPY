# Implementation Plan: Phase 14-15 Command Persistence And Creation

## Overview

Phase 14 introduces a provider-backed command persistence contract for citizen drafts and review work. Phase 15 uses that contract to let citizen workflow routes create saved/submitted command records from report and match surfaces.

This is still deterministic local persistence, not production database persistence.

Source artifacts:

- `docs/plans/2026-06-17-phase-13-citizen-command-review-queues.md`
- `apps/canopy-web/src/lib/citizen-data.ts`
- `apps/canopy-web/src/components/citizen-shell.tsx`

## Outcomes

- In-memory citizen command provider contract.
- Provider operations for save draft, submit command, cancel command, and move to review.
- Citizen model hydration from external provider records.
- Report route action that saves a report draft command.
- Needs/offers route action that submits a match command.
- UI-visible command action result with review owner, status, and review queue link.

## Tasks

### Batch 1: Provider Contract

- [x] Add citizen command draft input type.
- [x] Add citizen command provider interface.
- [x] Add in-memory provider implementation.
- [x] Add provider tests for save, submit, cancel, and move-to-review transitions.

### Batch 2: Model Hydration

- [x] Allow `buildCitizenCanopyModel` to hydrate command center records from provider records.
- [x] Preserve deterministic fixture fallback records.
- [x] Preserve selected command lookup.

### Batch 3: Route-Originated Command Creation

- [x] Parse route action params through the citizen page entry.
- [x] Save report draft commands from `/citizen/report?action=save-report-draft`.
- [x] Submit match commands from `/citizen/needs-offers?action=submit-match`.
- [x] Select the generated command after creation.

### Batch 4: UI Feedback

- [x] Render command action result on report and needs/offers surfaces.
- [x] Link generated commands to the review queue.
- [x] Keep citizen-facing command copy free of internal implementation terms.

### Batch 5: Verification

- [x] Run focused Phase 14/15 tests.
- [x] Run focused citizen acceptance tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify report draft and match submit routes on desktop and mobile.

## Remaining Product Work After This Slice

- Replace in-memory provider with database-backed provider.
- Add actual form input fields and client-side submission handlers.
- Connect command actions to runtime command execution and audit events.
- Add reviewer permissions and notification delivery.

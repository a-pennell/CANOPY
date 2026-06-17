# Implementation Plan: Phase 19 Command Review Actions

## Overview

Phase 19 completes the first review outcome set for citizen commands. Approval, rejection, and requested changes now share the same command runtime path, audit trail shape, and review queue visibility.

Source artifacts:

- `docs/plans/2026-06-17-phase-18-command-runtime-audit.md`
- `apps/canopy-web/src/lib/citizen-command-provider.ts`
- `apps/canopy-web/src/lib/citizen-data.ts`
- `apps/canopy-web/src/components/citizen-shell.tsx`

## Outcomes

- Reviewers can approve, reject, or request changes from the selected command panel.
- Rejection moves a command to `rejected`.
- Requested changes move a command to `changes-requested`.
- Each review outcome records distinct audit event metadata.
- Route-triggered review actions keep the reviewed command selected and visible.

## Tasks

### Batch 1: Review Runtime Coverage

- [x] Add failing Phase 19 tests for reject and request-changes.
- [x] Extend command statuses for rejected and changes-requested outcomes.
- [x] Extend audit actions beyond approval.
- [x] Add provider methods for rejection and requested changes.
- [x] Preserve audit trails in memory and persistent providers.

### Batch 2: Route And Shell Integration

- [x] Map review route parameters to audit actions.
- [x] Render all review action links in the selected command panel.
- [x] Render action-specific audit headings.
- [x] Preserve Phase 18 approval behavior.

### Batch 3: Verification

- [x] Run focused Phase 19 tests.
- [x] Run citizen command regression tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify request-changes and reject review routes.

## Remaining Product Work After This Slice

- Add reviewer-entered notes and change requests.
- Add actor/session-derived reviewer identity instead of fixture reviewer labels.
- Add permission checks for review actions by role and context.
- Connect review audit events to the real outbox/projection processor.
- Add user-facing validation and confirmation states before irreversible rejection.

# Implementation Plan: Phase 20 Reviewer Permissions, Notifications, And Queues

## Overview

Phase 20 adds the first role-aware review boundary to citizen command review. Review actions no longer mutate commands just because a route parameter exists. The active role and context must be allowed to review the selected command, and the review queue now separates work the current actor can review from work that needs another reviewer.

Source artifacts:

- `docs/plans/2026-06-17-phase-18-command-runtime-audit.md`
- `docs/plans/2026-06-17-phase-19-command-review-actions.md`
- `apps/canopy-web/src/lib/citizen-data.ts`
- `apps/canopy-web/src/components/citizen-shell.tsx`

## Outcomes

- Review actions are blocked when the active role cannot review the selected command.
- Blocked review actions do not write audit events or change command status.
- Allowed review actions use actor-derived reviewer identity.
- The review queue shows notifications for blocked and successful review attempts.
- The command center exposes `myReviewQueue` and `otherReviewQueue`.

## Tasks

### Batch 1: Permission Boundary

- [x] Add failing Phase 20 permission tests.
- [x] Add review access calculation from active context, role, and command context.
- [x] Block route-triggered review mutations when access is denied.
- [x] Preserve selected command state when review is blocked.

### Batch 2: Notifications And Actor Identity

- [x] Add command center notifications.
- [x] Render review notifications in the review queue.
- [x] Use actor-derived reviewer labels for allowed audit records.
- [x] Surface blocked review action result in the review queue.

### Batch 3: Queue Separation

- [x] Add `myReviewQueue`.
- [x] Add `otherReviewQueue`.
- [x] Render both queue buckets in the review queue surface.

### Batch 4: Verification

- [x] Run focused Phase 20 tests.
- [x] Run citizen command regression tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify blocked and allowed review routes.

## Remaining Product Work After This Slice

- Expand permission rules beyond the simple role/context matcher.
- Add notifications as persistent records rather than per-render model state.
- Add queue filters for urgency, due date, and command type.
- Add reviewer-entered notes and change request detail.
- Connect permission decisions to the governance/authority packages.

# Implementation Plan: Phase 13 Citizen Command Review Queues

## Overview

Phase 13 starts moving Canopy from route-addressable workflow previews toward persisted citizen command work. This slice introduces a deterministic command center contract before wiring real database persistence or command submission adapters.

Source artifacts:

- `docs/plans/2026-06-17-phase-12-interactive-citizen-workflows.md`
- `docs/reviews/2026-06-17-phase-11-product-ux-gap-review.md`
- `apps/canopy-web/src/lib/citizen-data.ts`

## Outcomes

- Citizen command records for saved drafts, submitted commands, and review queue work.
- Dedicated `/citizen/review-queue` surface.
- Selected command detail with review owner, visibility, due timing, civic memory effect, and review action.
- Today surface includes command drafts and review queue items alongside attention.
- Full deterministic acceptance coverage through the existing citizen shell public interface.

## Tasks

### Batch 1: Command Center Model

- [x] Add citizen command record types.
- [x] Add deterministic command fixtures for report, match, and federation review commands.
- [x] Add command center groups for saved drafts, submitted commands, and review queue items.
- [x] Add selected command lookup from route params.

### Batch 2: Review Queue Surface

- [x] Add `/citizen/review-queue` task surface.
- [x] Render saved drafts, submitted commands, and review queue sections.
- [x] Render selected command detail.
- [x] Keep queue language free of internal implementation terms.

### Batch 3: Today Integration

- [x] Add saved drafts and review queue items to `/citizen/today`.
- [x] Preserve existing attention items.
- [x] Link command items to review queue detail.

### Batch 4: Verification

- [x] Run focused citizen acceptance tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify `/citizen/today` and `/citizen/review-queue` on desktop and mobile.

## Remaining Product Work After This Slice

- Replace deterministic command fixtures with provider-backed draft persistence.
- Add actual form input handling and command creation.
- Connect review queue actions to command runtime workflows.
- Add reviewer permissions, notifications, and audit events.

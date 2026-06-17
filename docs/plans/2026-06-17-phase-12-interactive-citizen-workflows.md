# Implementation Plan: Phase 12 Interactive Citizen Workflows

## Overview

Phase 12 turns the Phase 11 citizen prototype from readable previews into route-addressable interactive workflow surfaces. The goal is still deterministic local behavior, not live persistence or provider-backed submission.

Source artifacts:

- `docs/reviews/2026-06-17-phase-11-product-ux-gap-review.md`
- `docs/product/2026-06-16-phase-11-citizen-friendly-operating-surface-prd.md`
- `.sdd/specs/001-phase-11-citizen-friendly-operating-surface/spec.md`

## Outcomes

- Dedicated mobile/public task routes for Today, My Groups, Around Me, and Search.
- Interactive report concern states: draft, preview, submitted, and cancelled.
- Interactive need/offer selection and match confirmation state.
- Role switching inside a context with authority, attention, action, and data-posture changes.
- Public observer records with browseable detail and per-record redaction explanations.
- Release readiness access boundary for non-operator contexts.
- Federation consequence guidance with recommendation rationale and precedent links.

## Tasks

### Batch 1: Route-Specific Task Surfaces

- [x] Add route-specific model branches for `/citizen/today`, `/citizen/contexts`, `/citizen/around`, and `/citizen/search`.
- [x] Add acceptance tests proving those routes do not fall back to the generic home summary.
- [x] Render dedicated task surfaces with list/detail states.
- [x] Browser verify task routes on desktop and mobile.

### Batch 2: Role Switching

- [x] Add role-switch acceptance coverage for a multi-role context.
- [x] Parse `role` route params through the citizen entry point.
- [x] Change active authority, data posture, attention, and suggested actions by role.
- [x] Render role switching controls on `/citizen/contexts`.

### Batch 3: Workflow Lifecycle

- [x] Add shared command lifecycle model for citizen-visible actions.
- [x] Add report lifecycle states from route params.
- [x] Add selectable need/offer match lifecycle states from route params.
- [x] Render workflow state, next action, available commands, and confirmation summaries.

### Batch 4: Public Trust And Operator Boundaries

- [x] Add public observer record fixtures with public, public-summary, and redacted records.
- [x] Add selected public record detail from route params.
- [x] Render per-record redaction explanations.
- [x] Add release readiness access boundary for non-operator contexts.

### Batch 5: Federation Guidance

- [x] Add recommendation rationale for federation conflict review.
- [x] Add consequence previews for available federation actions.
- [x] Add precedent links back to civic memory.
- [x] Render guidance in the Trust & Data surface.

### Batch 6: Verification

- [x] Run focused Phase 11/12 acceptance tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify Phase 12 routes on desktop and mobile.

## Remaining Product Work After Phase 12

- Replace route-param prototype state with persisted command drafts.
- Add real form inputs and command submission adapters.
- Expand public record browsing into search/filter/detail routes.
- Add design polish after the workflows have real draft and confirmation behavior.

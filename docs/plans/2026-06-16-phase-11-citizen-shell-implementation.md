# Implementation Plan: Phase 11 Citizen-Friendly Operating Surface

## Overview

Implement the Phase 11 citizen-friendly Canopy prototype as a separate Next.js surface. The first goal is not to replace the current shell; it is to prove the new citizen/public workflow model through tested vertical slices.

Source artifacts:

- `.sdd/specs/001-phase-11-citizen-friendly-operating-surface/spec.md`
- `.sdd/specs/001-phase-11-citizen-friendly-operating-surface/plan.md`
- `.sdd/specs/001-phase-11-citizen-friendly-operating-surface/tasks.md`
- `docs/product/2026-06-16-phase-11-citizen-friendly-operating-surface-prd.md`

## TDD Execution Policy

Use tracer bullets. Do not write all tests first.

For each batch:

1. Add one behavior test through a public interface.
2. Run the focused test and observe RED.
3. Add minimal implementation.
4. Run focused test and observe GREEN.
5. Repeat for the next behavior.
6. Refactor only after the batch is green.

## Tasks

### Batch 1: Setup And First Public Interface

- [x] T001: Create `apps/canopy-web/src/lib/citizen-data.ts`.
- [x] T002: Create `apps/canopy-web/src/lib/phase11-acceptance.test.ts`.
- [x] T003: Create `apps/canopy-web/src/components/citizen-shell.tsx`.
- [x] T004: Wire `/citizen` route without replacing existing shell.

Review checkpoint: `/citizen` can be routed to a nonblank placeholder and existing checks still pass.

### Batch 2: P1 Tracer Bullet - Multi-context Home

- [x] T005: RED test for multiple citizen contexts with roles, levels, authority, data posture, relationship path, and attention.
- [x] T006: GREEN implementation of minimal `buildCitizenCanopyModel`.
- [x] T007: RED test for context selection changing attention and active role.
- [x] T008: GREEN implementation of context selection.
- [x] T009: RED test for `/citizen` rendering My Contexts and top attention.
- [x] T010: GREEN implementation of minimal CitizenShell home.

Review checkpoint: User Story 1 passes independently.

### Batch 3: P1 Tracer Bullet - Report A Concern

- [x] T011: RED test for report-a-concern preview fields.
- [x] T012: GREEN implementation of concern report model.
- [x] T013: RED route/component test for `/citizen/report`.
- [x] T014: GREEN minimal report flow surface.
- [x] T015: RED test for avoiding internal terms.
- [x] T016: GREEN copy/terminology cleanup.

Review checkpoint: User Story 2 passes independently and uses citizen language.

### Batch 4: P2 Workflows

- [x] T017: Add needs/offers overview and match preview through RED/GREEN cycles.
- [x] T018: Add decision review through RED/GREEN cycles.
- [x] T019: Add challenge/appeal preview through RED/GREEN cycles.
- [x] T020: Add federation conflict review through RED/GREEN cycles.

Review checkpoint: P2 workflows are visible and independently testable.

### Batch 5: P3 Trust, Public Mode, And Operator Mode

- [x] T021: Add release-readiness summary from Phase 10 completion report.
- [x] T022: Add public observer access boundary and redaction explanation.
- [x] T023: Add mobile task route acceptance checks.

Review checkpoint: operator detail is role-specific and public mode is privacy-safe.

### Batch 6: Verification

- [x] T024: Run focused Phase 11 tests.
- [x] T025: Run `npm --workspace @canopy/web run check`.
- [x] T026: Run `npm run check`.
- [x] T027: Browser verify `/citizen` desktop and mobile.

## Review Checkpoints

- Batch 2 completion: multi-context home approved before expanding workflows.
- Batch 3 completion: report concern approved before P2 workflows.
- Batch 5 completion: release readiness and public mode reviewed for privacy.
- Batch 6 completion: final verification and browser evidence.

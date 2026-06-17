# Implementation Plan: Phase 17 Citizen Form Submission Handlers

## Overview

Phase 17 turns route-action command creation into visible citizen form flows. The forms still submit through GET route parameters in the local prototype, but users can now see and use form controls instead of relying on hand-authored URLs.

Source artifacts:

- `docs/plans/2026-06-17-phase-14-15-command-persistence-and-creation.md`
- `docs/plans/2026-06-17-phase-16-database-backed-command-persistence.md`
- `apps/canopy-web/src/components/citizen-shell.tsx`

## Outcomes

- Report route renders a visible description form.
- Report form submission creates a saved draft command with submitted text reflected in the command label.
- Needs/offers route renders visible need and offer selectors.
- Match form submission creates a submitted match command.
- Form controls are styled for desktop and mobile surfaces.

## Tasks

### Batch 1: Report Form

- [x] Add report form acceptance test.
- [x] Render description input.
- [x] Render save draft submit control.
- [x] Preserve submitted description in generated command label.

### Batch 2: Match Form

- [x] Add match form acceptance test.
- [x] Render need selector.
- [x] Render offer selector.
- [x] Submit selected need/offer through command provider path.

### Batch 3: Responsive Form Styling

- [x] Add stable form layout styles.
- [x] Add textarea/select dimensions.
- [x] Preserve citizen shell mobile behavior.

### Batch 4: Verification

- [x] Run focused Phase 17 tests.
- [x] Run combined citizen command tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.
- [x] Browser verify report and match forms on desktop and mobile.

## Remaining Product Work After This Slice

- Convert GET forms into client-side handlers or server actions.
- Persist real user-entered fields beyond command labels.
- Add validation, error states, and confirmation pages.
- Connect forms to authenticated actor/session context.

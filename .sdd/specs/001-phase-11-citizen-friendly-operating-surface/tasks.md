# Tasks: Phase 11 Citizen-Friendly Operating Surface

## Phase 1: Setup

- [ ] T001 Create Phase 11 citizen model module in `apps/canopy-web/src/lib/citizen-data.ts`.
- [ ] T002 Create Phase 11 acceptance test file in `apps/canopy-web/src/lib/phase11-acceptance.test.ts`.
- [ ] T003 Create citizen shell component placeholder in `apps/canopy-web/src/components/citizen-shell.tsx`.
- [ ] T004 Wire `/citizen` route handling through the existing App Router entry path without replacing the current shell.

## Phase 2: Foundational View Model

- [ ] T005 [P] Define public Phase 11 view-model types for contexts, roles, attention, navigation, report preview, decision summary, federation conflict, and release readiness.
- [ ] T006 [P] Add citizen-friendly terminology mapping helpers for internal Canopy terms.
- [ ] T007 Build deterministic fixture adapter that maps existing Riverbend/Mill Creek runtime data into Phase 11 contexts.
- [ ] T008 Add guard ensuring task-first navigation contains no legacy project names or internal implementation terms.

## Phase 3: User Story 1 - Multi-context home (P1)

- [ ] T009 [US1] RED: Add acceptance test that `buildCitizenCanopyModel` exposes at least neighborhood, school, commons, watershed, federation, and operator contexts.
- [ ] T010 [US1] GREEN: Implement minimal `buildCitizenCanopyModel` contexts with role, level, attention, authority, data posture, and relationship path.
- [ ] T011 [US1] RED: Add acceptance test that selecting a context changes attention, suggested actions, active role, and relationship path.
- [ ] T012 [US1] GREEN: Implement context selection behavior in the view model.
- [ ] T013 [US1] RED: Add route/component test that `/citizen` renders My Contexts and top attention.
- [ ] T014 [US1] GREEN: Render minimal CitizenShell home for My Contexts and attention.

## Phase 4: User Story 2 - Citizen reports a concern (P1)

- [ ] T015 [US2] RED: Add acceptance test for report-a-concern preview fields and plain-language labels.
- [ ] T016 [US2] GREEN: Implement concern report draft and preview model.
- [ ] T017 [US2] RED: Add route/component test that `/citizen/report` shows description, context, urgency, visibility, suggestions, and review preview.
- [ ] T018 [US2] GREEN: Render minimal report flow surface.
- [ ] T019 [US2] RED: Add test that report flow avoids internal implementation terms.
- [ ] T020 [US2] GREEN: Apply terminology mapping and copy cleanup.

## Phase 5: User Story 3 - Steward coordinates need and offer (P2)

- [ ] T021 [US3] RED: Add acceptance test for needs/offers overview with unmatched needs and available offers.
- [ ] T022 [US3] GREEN: Implement needs/offers view-model section.
- [ ] T023 [US3] RED: Add acceptance test for match preview constraints and follow-through states.
- [ ] T024 [US3] GREEN: Implement match preview.
- [ ] T025 [US3] Render `/citizen/needs-offers` minimal surface.

## Phase 6: User Story 4 - Group makes a decision (P2)

- [ ] T026 [US4] RED: Add acceptance test for decision question, status, evidence, objections, affected contexts, and appeal path.
- [ ] T027 [US4] GREEN: Implement decision summary model.
- [ ] T028 [US4] Render `/citizen/decisions` minimal surface.

## Phase 7: User Story 5 - User challenges or appeals (P2)

- [ ] T029 [US5] RED: Add acceptance test for challenge reasons, routing, reviewer, visibility, and civic memory preview.
- [ ] T030 [US5] GREEN: Implement challenge/appeal preview model.
- [ ] T031 [US5] Render challenge affordance in decision or trust/data surface.

## Phase 8: User Story 6 - Federation conflict resolution (P2)

- [ ] T032 [US6] RED: Add acceptance test for local/remote federation conflict comparison in plain language.
- [ ] T033 [US6] GREEN: Implement federation conflict review model.
- [ ] T034 [US6] Render conflict review under `/citizen/trust-data`.

## Phase 9: User Story 7 - Operator release readiness (P3)

- [ ] T035 [US7] RED: Add acceptance test that release readiness separates local acceptance from live deployment blockers.
- [ ] T036 [US7] GREEN: Map Phase 10 completion report into citizen/operator release readiness summary.
- [ ] T037 [US7] Render `/citizen/release-readiness` as operator-focused surface.

## Phase 10: User Story 8 - Public observer mode (P3)

- [ ] T038 [US8] RED: Add acceptance test for public observer mode access boundaries and redaction explanations.
- [ ] T039 [US8] GREEN: Implement public observer view-model filtering.
- [ ] T040 [US8] Render public observer summary in `/citizen/trust-data` or a public route.

## Phase 11: Responsive And Browser Verification

- [ ] T041 Add responsive acceptance tests for mobile task routes: Today, My Groups, Around Me, Report, Review, Search.
- [ ] T042 Run `npm --workspace @canopy/web run check`.
- [ ] T043 Run `npm run check`.
- [ ] T044 Start local dev server and browser-verify `/citizen` desktop and mobile.

## TDD Rules

- One RED test at a time.
- Minimal GREEN implementation per behavior.
- Tests must use public model/component/route interfaces.
- No private helper tests.
- Refactor only after all tests in a vertical slice pass.

# Implementation Plan: Phase 11 Citizen-Friendly Operating Surface

## Summary

Build a separate citizen-friendly prototype surface for Canopy in the existing Next.js web workspace. The surface will use a Phase 11 view model that translates canonical Canopy runtime data into plain-language contexts, roles, attention, workflows, and task-first navigation while preserving the underlying holonic architecture.

Implementation must follow TDD with vertical slices: one public behavior test, minimal implementation, then the next behavior.

## Technical Context

- Language/Version: TypeScript 5.8
- Runtime: Node.js >= 22
- Web Framework: Next.js App Router in `apps/canopy-web`
- UI: Existing React components/CSS patterns, with new citizen prototype components as needed
- Data Source: Existing deterministic Canopy fixture/runtime data
- Primary Dependencies: React, Next.js, existing Canopy workspace packages
- Storage: In-memory runtime/fixtures for prototype
- Testing: Vitest, existing web acceptance tests, browser verification for desktop/mobile
- Verification: `npm run check`, focused web tests, browser pass on `/citizen`

## Project Structure

```text
apps/canopy-web/src/
|-- app/
|   |-- [...route]/page.tsx
|   `-- page.tsx
|-- components/
|   |-- citizen-shell.tsx
|   `-- citizen-primitives.tsx
`-- lib/
    |-- canopy-data.ts
    |-- citizen-data.ts
    |-- phase11-acceptance.test.ts
    `-- citizen-responsive-acceptance.test.ts
```

The exact file names can adapt to existing patterns, but the public interface should stay small:

- `buildCitizenCanopyModel(input)`
- `CitizenShell`
- route handling for `/citizen` and nested citizen routes

## TDD Strategy

Use vertical slices only.

1. RED: test that `/citizen` model exposes `My Contexts` with multiple roles and levels.
2. GREEN: add minimal model data and route wiring.
3. RED: test context switch updates attention, role, authority, data posture, and relationship path.
4. GREEN: implement minimal context selection.
5. RED: test citizen task navigation avoids legacy/internal terms.
6. GREEN: render task-first navigation.
7. RED: test report-a-concern preview.
8. GREEN: implement report preview model and UI.

Do not write all tests first. Each test must describe observable behavior through public interfaces.

## Data Model

See `data-model.md`.

## Route Contract

See `contracts/routes.md`.

## Acceptance Gates

- P1 acceptance tests pass independently.
- Existing Phase 5/7/9 web acceptance tests remain green.
- The citizen surface does not replace the existing shell.
- The citizen surface does not expose legacy project names as primary navigation.
- The citizen surface does not expose internal implementation terms in primary navigation.
- Desktop and mobile browser verification shows nonblank `/citizen` route and no incoherent overlap.

## Non-Goals For Implementation Plan

- No real external auth.
- No live provider infrastructure.
- No default shell replacement.
- No AI summarization until deterministic workflow acceptance passes.
- No unrelated refactor of existing dashboard.

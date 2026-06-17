# Phase 11 Product And UX Gap Review

Date: 2026-06-17

## Review Posture

This review compares the implemented Phase 11 citizen-friendly surface against the Phase 11 PRD, SDD spec, and browser-verified prototype. It treats Phase 11 as a working prototype slice, not the final consumer/public Canopy experience.

Inputs reviewed:

- `docs/product/2026-06-16-phase-11-citizen-friendly-operating-surface-prd.md`
- `.sdd/specs/001-phase-11-citizen-friendly-operating-surface/spec.md`
- `apps/canopy-web/src/lib/citizen-data.ts`
- `apps/canopy-web/src/components/citizen-shell.tsx`
- Browser verification for `/citizen` at desktop and mobile widths

## What Phase 11 Now Proves

- Canopy can expose a separate citizen-friendly operating surface without replacing the existing shell.
- Multi-context participation is now a first-class UI model through `My Contexts`, active role, level, authority, data posture, relationship path, and context-specific attention.
- Core workflows are represented in plain language: report concern, needs/offers, decisions, challenge/appeal, federation conflict review, public observer mode, and release readiness.
- Mobile users now get task-first routes instead of only a stacked version of the dense shell.
- Acceptance tests and full repo checks pass with the citizen prototype included.

## Findings

| Priority | Gap | Why It Matters | Suggested Next Step |
| --- | --- | --- | --- |
| P1 | The prototype still uses static fixture-driven workflow states rather than interactive draft state. | Users can inspect previews, but they cannot yet complete a realistic report, challenge, match, or review loop. | Add local client state for draft, preview, submit/cancel, and confirmation states across report, challenge, and match workflows. |
| P1 | Mobile task routes exist, but most route targets still resolve to the same home/default surface unless they are one of the implemented workflow routes. | The mobile nav now gives the right affordance, but `Today`, `My Groups`, `Around Me`, and `Search` need task-specific content to feel real. | Implement dedicated `/citizen/today`, `/citizen/contexts`, `/citizen/around`, and `/citizen/search` surfaces. |
| P1 | Role and authority are visible, but there is no role-switching interaction inside a context. | Users may have multiple roles in the same group; seeing `availableRoles` without switching keeps the holonic model partially hidden. | Add role switch acceptance tests and UI behavior that changes attention, allowed actions, and data posture. |
| P1 | Public observer mode communicates boundaries but does not yet provide browseable public record detail. | Public trust needs inspectable issues, decisions, commitments, outcomes, and redacted record continuity. | Add public record list/detail fixtures and routes with redaction explanations attached to each restricted item. |
| P1 | Operator release readiness is visible but not gated by role in the prototype model. | The PRD calls release readiness operator-only; current routing can display it directly. | Add model-level audience/role restrictions and a public/citizen fallback explanation for unauthorized access. |
| P2 | The command lifecycle is still implied rather than modeled. | Canopy needs users to understand draft, preview, review, approve, execute, appeal, and close states as a shared civic lifecycle. | Add a common lifecycle view model used by report, match, decision, challenge, and federation actions. |
| P2 | Federation conflict review presents options but does not yet guide consequences. | Accept/reject/remediate/merge/defer/request-review are legible labels, but users need help understanding risk and precedent. | Add consequence previews, recommended next step rationale, and precedent/civic-memory links. |
| P2 | Needs/offers distinguishes lifecycle labels but has no actual comparison or selection UI. | Steward coordination depends on choosing which need and offer are being matched, not only reading a single preview. | Add selectable needs/offers, match comparison state, and a confirmation preview. |
| P2 | Context navigation is text-first; place and relationship are not yet visual. | The Canopy model is holonic and place-based, so users will need map/graph/list modes to understand nested and overlapping groups. | Add first `Around Me` surface with list and relationship-path modes before attempting a full map. |
| P3 | The visual design is coherent but still reads like a functional prototype. | Consumer/public/citizen friendliness will require stronger information hierarchy, interaction feedback, and route-specific density tuning. | Run a UI design pass after the next interactive workflow slice is implemented. |

## Recommended Phase 12

Phase 12 should turn the Phase 11 prototype from readable previews into usable citizen workflows.

Suggested phase title: **Phase 12 Interactive Citizen Workflows**

Primary outcomes:

- Dedicated mobile/public task routes for Today, My Groups, Around Me, and Search.
- Interactive report concern flow with draft, preview, submit/cancel, and confirmation states.
- Role switching inside contexts with authority and data-posture changes.
- Public observer browse/detail records with per-record redaction explanations.
- Release readiness role boundary behavior.
- Shared command lifecycle model for citizen-visible actions.

## Suggested First Batch

1. Add route-specific view model branches for `/citizen/today`, `/citizen/contexts`, `/citizen/around`, and `/citizen/search`.
2. Add acceptance tests that those routes do not fall back to the generic home content.
3. Implement dedicated route surfaces with task-specific empty, list, and detail states.
4. Add role-switch tests for at least one multi-role context.
5. Implement role switching in the model and UI.

## Verification Baseline

Latest local checks:

- `npx vitest run --config vitest.workspace.ts apps/canopy-web/src/lib/phase11-acceptance.test.ts`
- `npm --workspace @canopy/web run check`
- `npm run check`
- Browser verification for `/citizen` at `1280x900` and `390x844`

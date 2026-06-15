# Canopy Phase 7 Validation Report

Date: 2026-06-15

## Scope

Phase 7 validates the Riverbend Foodshed Commons / Mill Creek cybernetic slice as one Canopy path, not as folded-source migration and not as separate app behavior.

Executable source:

- `packages/evaluation/vertical-slice/src/index.ts`
- `packages/evaluation/vertical-slice/src/phase7-riverbend-cybernetic-slice.test.ts`
- `apps/canopy-web/src/lib/phase7-acceptance.test.ts`

## Validation Matrix

| Area | Status | Evidence | Gaps | Next Gate |
| --- | --- | --- | --- | --- |
| Event coverage | Pass | Phase 7 asserts observe, understand, simulate, deliberate, coordinate, act, learn, and federate phases, including a threshold-worsens adaptive branch. | Contested/redacted branch is still pending. | Add contested/redacted Phase 7 branch. |
| Authority coverage | Pass | Guardian review, binding decision, use right, ledger entry, export approval, and appeal path refs are present. | Provider-backed enforcement is not yet exercised by this slice. | Run authority trace through provider-backed replay/export. |
| Data stewardship | Pass | Visibility rule and export approval are part of the slice, and federation export cites the stewardship agreement. | Redaction stress path is not included in the happy path. | Add contested/redacted Phase 7 branch. |
| Replay continuity | Pass | Civic memory projected event count equals the Phase 7 event count. | Provider-backed replay is not yet part of this path. | Add provider-backed replay assertion for Phase 7. |
| Export readiness | Pass | Federation export includes event trail, object refs, authority refs, data stewardship agreement, format, and content hash. | Provider-level federation transport remains separate from this slice. | Run Phase 7 export through provider conformance target. |
| Shell traceability | Pass | Web acceptance starts from the Mill Creek threshold breach and reaches decision, use right, outcome, retrospective, and federation export. | Browser-level visual verification is not part of this checkpoint. | Add Playwright/browser verification once UI layout changes. |
| Native-service gaps | Partial | Native commands now cover living system, threshold, breach, need, offer, scenario, guardian review, amendment, policy version, decision, use right grant/revocation, commitment, ledger post/reversal, task, food flow, outcome, and retrospective. | Production providers remain prototype/planned in adapter conformance. | Provider-backed replay/export pass. |

## Evidence

- `executeRiverbendCyberneticSlice` creates the canonical Riverbend/Mill Creek path and returns refs, phase steps, events, civic memory, object pages, and federation export.
- `buildRiverbendPersistedRuntimeScenario` persists the Phase 7 event stream, rebuilds materialized projections, and exposes route-ready shell sessions for threshold, decision, resource, use right, outcome, and federation.
- `phase7-riverbend-cybernetic-slice.test.ts` proves event coverage, threshold-to-decision traceability, adaptive learning-to-policy feedback, export readiness, and persisted shell session hydration.
- `phase7-acceptance.test.ts` proves the web model starts from `/objects/threshold/threshold.mill-creek-nitrate` and reaches the allocation decision, resource/use-right surface, learning outcome, and federation state.

## Known Gaps

- No direct canonical appends remain in the Phase 7 harness.
- New native commands have package-level capability functions and command-runtime executors.
- Phase 7 now includes an adaptive threshold-worsens branch that revokes the use right, reverses the ledger entry, and versions policy from the learning retrospective.
- Adapter/provider conformance still distinguishes prototype and planned providers from production-ready implementations.

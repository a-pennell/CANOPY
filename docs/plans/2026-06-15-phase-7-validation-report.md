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
| Event coverage | Pass | Phase 7 asserts observe, understand, simulate, deliberate, coordinate, act, learn, and federate phases, including threshold-worsens, contested objection, redaction, and decision-packet branches. | Browser-level verification is the remaining validation layer. | Run Phase 7 shell routes in browser. |
| Authority coverage | Pass | Guardian review, binding decision, use right, ledger entry, export approval, appeal path refs, and provider event-store replay are present. | Production provider enforcement remains beyond prototype scope. | Carry authority traces into Phase 8 provider hardening. |
| Data stewardship | Pass | Visibility rule, redaction request, applied redaction, decision-packet redaction summary, redaction-aware ActivityPub send, and export approval are part of the slice. | Production federation transport remains beyond prototype scope. | Carry redaction transport into Phase 8 provider hardening. |
| Replay continuity | Pass | Civic memory projected event count equals the Phase 7 event count, and the Postgres event-store prototype replays the same stream. | External Postgres integration test remains skipped unless a database is provisioned. | Run external Postgres integration when infrastructure is available. |
| Export readiness | Pass | Federation export includes event trail, object refs, authority refs, data stewardship agreement, format, content hash, redaction summary, and ActivityPub transport sanitization. | Browser-level export inspection is the remaining validation layer. | Run federation route in browser. |
| Shell traceability | Pass | Web acceptance starts from the Mill Creek threshold breach and reaches decision, use right, outcome, retrospective, and federation export. | Browser-level visual verification is not part of this checkpoint. | Add Playwright/browser verification once UI layout changes. |
| Native-service gaps | Partial | Native commands now cover living system, threshold, breach, need, offer, scenario, guardian review, amendment, objection, policy version, decision, use right grant/revocation, commitment, ledger post/reversal, task, food flow, outcome, retrospective, and redaction. | Production providers remain prototype/planned in adapter conformance. | Provider-backed replay/export pass. |

## Evidence

- `executeRiverbendCyberneticSlice` creates the canonical Riverbend/Mill Creek path and returns refs, phase steps, events, civic memory, object pages, and federation export.
- `buildRiverbendPersistedRuntimeScenario` persists the Phase 7 event stream, rebuilds materialized projections, and exposes route-ready shell sessions for threshold, decision, resource, use right, outcome, and federation.
- `phase7-riverbend-cybernetic-slice.test.ts` proves event coverage, threshold-to-decision traceability, adaptive learning-to-policy feedback, contested objection preservation, redaction continuity, export readiness, and persisted shell session hydration.
- The same Phase 7 test replays the full stream through the Postgres event-store provider prototype and sends the redaction-aware export through the ActivityPub transport prototype.
- `phase7-acceptance.test.ts` proves the web model starts from `/objects/threshold/threshold.mill-creek-nitrate` and reaches the allocation decision, resource/use-right surface, learning outcome, and federation state.

## Known Gaps

- No direct canonical appends remain in the Phase 7 harness.
- New native commands have package-level capability functions and command-runtime executors.
- Phase 7 now includes an adaptive threshold-worsens branch that revokes the use right, reverses the ledger entry, and versions policy from the learning retrospective.
- Phase 7 now preserves a data-stewardship objection in a decision packet and carries redaction continuity into the federation export preview.
- Phase 7 now has provider-prototype replay/export coverage for the exact Riverbend stream.
- Adapter/provider conformance still distinguishes prototype and planned providers from production-ready implementations.

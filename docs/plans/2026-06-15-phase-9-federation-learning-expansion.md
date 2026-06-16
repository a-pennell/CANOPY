# Canopy Phase 9 Federation Learning Expansion

Date: 2026-06-15

## Scope

Phase 9 adds governed federation import and reconciliation on top of the Phase 8 trust layer. The workflow track introduces `@canopy/workflows-federation-reconciliation` and a Riverbend slice that exercises remote import, redaction-stub handling, local mapping, quarantine, and reconciliation status.

The shell/web reporting track now consumes a native `federationImportReconciliationState` shell surface and keeps fallback parsing for older audit/event-only states.

## Web Reporting Contract

The web model now expects or derives these Phase 9 fields:

| Field | Preferred source | Current fallback |
| --- | --- | --- |
| Imported envelope id | Shell `federationImportReconciliationState.importedEnvelopeId` | Federated event provenance, import event payload, or `awaiting-federation-import-envelope` |
| Accepted event count | Shell `acceptedEventCount` / `acceptedEventIds` | Reconciliation audit metadata, federated event count, or import event payload |
| Quarantined event count | Shell `quarantinedEventCount` / `quarantinedEventIds` | Reconciliation audit dispositions or event disposition payloads |
| Redaction-stub warnings | Shell `redactionStubWarnings` | Reconciliation audit messages or redacted stub events |
| Local mapping count | Shell `localMappingCount` | Runtime canonical mapping count |
| Reconciliation status | Shell `reconciliationStatus` | Audit status or observed import/reconciliation events |
| Quarantine review | Shell `quarantineReview` | Reconciliation completion payload |
| Learning outputs | Shell `learningOutputs` | Reconciliation completion payload |
| Peer comparisons | Web `peerComparisons` model | Derived Phase 9 multi-peer conflict fixtures |

## Dashboard Behavior

- The top status strip includes the Phase 9 reconciliation status.
- The main dashboard includes a `Federation Import & Reconciliation` panel.
- The existing federation workspace keeps the export posture visible and adds compact import/reconciliation counts.
- Quarantine review and learning outputs are visible in the federation import panel.
- Multi-peer comparisons show local and remote claim, evidence, and stewardship records side by side with peer source, trust status, conflict reason, and proposed action.

## Acceptance Notes

- The expected web status is `applied` for the Riverbend Phase 9 import path under the current permissive trust policy.
- Strict trust policy checks now pass for Riverbend because the export envelope carries the full data stewardship agreement, not only agreement refs.
- If import events are visible without reconciliation completion, the web status falls back to `pending-core-workflow`.
- Redaction-stub warnings should remain visible even when accepted imports are otherwise healthy, because the receiving commons must preserve continuity for redacted originals.
- Duplicate object-ref conflicts from Downstream School Commons and Hilltown Stewardship Circle are quarantined into review instead of replacing local records.

## Validation Gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Export agreement portability | Phase 7 export asserts `dataStewardshipAgreements` includes the Riverbend agreement object with governed ref, federation rule ref, and federation visibility. | Pass |
| Strict import trust | Phase 9 strict policy import requires allowed sender, schema version, expected federation rule, and data stewardship agreement; result is `applied` and `trusted`. | Pass |
| Quarantine command executability | Command runtime executes accept, reject, and remediate commands as separate `federation.quarantine.*` events while preserving imported history. | Pass |
| Multi-peer conflict review | Phase 9 vertical slice imports Downstream and Hilltown duplicate object-ref conflicts and quarantines claim, evidence, and stewardship divergences into review payloads. | Pass |
| Web operator visibility | Web acceptance surfaces learning outputs plus Downstream/Hilltown comparison rows in the federation import panel. | Pass |
| Operations linkage | Operations drift alert names the executable quarantine command functions for accept, reject, and remediate paths. | Pass |

## Phase 9 Checklist

- Done: Native shell surface `federationImportReconciliationState`.
- Done: Lifecycle events `federation.import.received` and `federation.reconciliation.completed`.
- Done: ActivityPub/generic transport receive bridge into reconciliation.
- Done: Trust checks for sender authority, schema compatibility, federation rule agreement, stewardship agreement presence, and required federation signatures.
- Done: Quarantine review payloads with accept/reject/remediate next actions.
- Done: Learning output payloads on reconciliation completion.
- Done: Canonical SQL-plan coverage for Phase 9 records.
- Done: Operations drift alert for quarantined federation import reconciliation.
- Done: Populated `dataStewardshipAgreements` in the Riverbend export envelope so strict stewardship policy passes.
- Done: Added richer multi-peer UI workflows for comparing conflicting remote records side by side.
- Done: Promoted quarantine accept/reject/remediate from displayed next actions into executable governance commands.
- Done: Added multi-peer duplicate object-ref conflict tests for claim, evidence, and stewardship divergence.
- Done: Linked operations quarantine alerts to executable quarantine command names.

## Phase 10 Entry

Phase 9 is ready to hand off into ecosystem hardening. The next phase should bind these native contracts to production provider posture: auth identity, Postgres-backed runtime tables, deployment checks, observability, migration safety, and operator workflows.

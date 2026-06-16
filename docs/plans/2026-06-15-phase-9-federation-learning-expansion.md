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
| Quarantine review | Shell `quarantineReview` | Empty until lifecycle event payload exists |
| Learning outputs | Shell `learningOutputs` | Empty until lifecycle event payload exists |

## Dashboard Behavior

- The top status strip includes the Phase 9 reconciliation status.
- The main dashboard includes a `Federation Import & Reconciliation` panel.
- The existing federation workspace keeps the export posture visible and adds compact import/reconciliation counts.
- Quarantine review and learning outputs are visible in the federation import panel.

## Acceptance Notes

- The expected web status is `applied` for the Riverbend Phase 9 import path under the current permissive trust policy.
- Strict trust policy checks correctly quarantine Riverbend until exported data stewardship agreements are populated in the envelope.
- If import events are visible without reconciliation completion, the web status falls back to `pending-core-workflow`.
- Redaction-stub warnings should remain visible even when accepted imports are otherwise healthy, because the receiving commons must preserve continuity for redacted originals.

## Phase 9 Checklist

- Done: Native shell surface `federationImportReconciliationState`.
- Done: Lifecycle events `federation.import.received` and `federation.reconciliation.completed`.
- Done: ActivityPub/generic transport receive bridge into reconciliation.
- Done: Trust checks for sender authority, schema compatibility, federation rule agreement, stewardship agreement presence, and required federation signatures.
- Done: Quarantine review payloads with accept/reject/remediate next actions.
- Done: Learning output payloads on reconciliation completion.
- Done: Canonical SQL-plan coverage for Phase 9 records.
- Done: Operations drift alert for quarantined federation import reconciliation.
- Remaining: Populate `dataStewardshipAgreements` in the Riverbend export envelope so strict stewardship policy can pass.
- Remaining: Add richer multi-peer UI workflows for comparing conflicting remote records side by side.
- Remaining: Promote quarantine accept/reject/remediate from displayed next actions into executable governance commands.

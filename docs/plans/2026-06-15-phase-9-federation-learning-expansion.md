# Canopy Phase 9 Federation Learning Expansion

Date: 2026-06-15

## Scope

Phase 9 adds governed federation import and reconciliation on top of the Phase 8 trust layer. The initial workflow track introduces `@canopy/workflows-federation-reconciliation` and a Riverbend slice that exercises remote import, redaction-stub handling, local mapping, quarantine, and reconciliation status.

The web/reporting track now consumes the Phase 9 Riverbend reconciliation output and keeps fallback parsing for future shell-native surfaces.

## Web Reporting Contract

The web model now expects or derives these Phase 9 fields:

| Field | Preferred source | Current fallback |
| --- | --- | --- |
| Imported envelope id | Core `importedEnvelopeId`, `sourceEnvelopeId`, `envelopeId`, or federated event provenance | First import event payload envelope/message id, otherwise `awaiting-federation-import-envelope` |
| Accepted event count | Core `acceptedEventCount`, `acceptedEventIds`, reconciliation audit metadata, or federated event count | Imported event payload `eventIds`, otherwise observed `federation.import.received` count |
| Quarantined event count | Core `quarantinedEventCount`, `quarantinedEventIds`, or reconciliation audit dispositions | Events with quarantined disposition |
| Redaction-stub warnings | Core import warnings with `redaction_stub_only` or reconciliation audit messages | Redacted stub events visible in the current stream |
| Local mapping count | Core local mapping fields | Runtime canonical mapping count |
| Reconciliation status | Core `reconciliationStatus` or `status` | `completed`, `pending-core-workflow`, or `awaiting-import` based on observed events |

## Dashboard Behavior

- The top status strip includes the Phase 9 reconciliation status.
- The main dashboard includes a `Federation Import & Reconciliation` panel.
- The existing federation workspace keeps the export posture visible and adds compact import/reconciliation counts.

## Acceptance Notes

- The expected web status is now `applied` for the Riverbend Phase 9 import path.
- If import events are visible without reconciliation completion, the web status falls back to `pending-core-workflow`.
- Once the core package exports a shell surface such as `federationImportReconciliationState`, `federationReconciliationState`, or `federationImportState`, the web parser should consume it without renaming dashboard fields.
- Redaction-stub warnings should remain visible even when accepted imports are otherwise healthy, because the receiving commons must preserve continuity for redacted originals.

## Next Gate

Promote the Phase 9 reconciliation result into a first-class shell surface, then tighten the web parser from audit/event fallback parsing to shell-surface assertions.

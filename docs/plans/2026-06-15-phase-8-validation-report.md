# Canopy Phase 8 Validation Report

Date: 2026-06-15

## Scope

Phase 8 hardens the Riverbend Foodshed Commons / Mill Creek trust layer. The goal is that contested governance, appeal, conflict, consent revocation, redaction, provider auditability, operations review, federation export, and web surfacing behave as native Canopy capabilities in one event stream.

Executable source:

- `packages/capabilities/governance/src/index.ts`
- `packages/workflows/command-runtime/src/index.ts`
- `packages/evaluation/vertical-slice/src/index.ts`
- `packages/evaluation/vertical-slice/src/phase8-trust-governance-hardening.test.ts`
- `packages/evaluation/vertical-slice/src/phase8-provider-hardening.test.ts`
- `packages/projections/decision-packet/src/index.ts`
- `apps/canopy-web/src/lib/phase7-acceptance.test.ts`

## Validation Matrix

| Area | Status | Evidence | Gaps | Next Gate |
| --- | --- | --- | --- | --- |
| Appeal lifecycle | Pass | Native appeal commands and runtime executors open, review, record remedy, and close appeals without mutating the original decision event. | None for executable Phase 8 scope. | Carry appeal closure distinctions into Phase 9 cross-scope reconciliation. |
| Conflict lifecycle | Pass | Native conflict commands and runtime executors open, review, record remedy, and close conflicts linked to the adaptive decision, objection, appeal, and redaction remedy. | None for executable Phase 8 scope. | Add multi-party conflict reconciliation when federation imports become active. |
| Decision packet depth | Pass | Decision packet projection now carries explicit appeal refs, conflict refs, objections, policy versions, redaction indicators, and lifecycle event roles. | Human-authored packet prose can still become richer. | Add packet section UI for contested-governance narratives. |
| Consent and redaction continuity | Pass | Consent grant, consent revocation, redaction request, and applied redaction preserve the original evidence envelope while replacing export detail with stubs. | None for local proof trail. | Exercise remote import of redaction stubs in Phase 9. |
| Provider enforcement | Pass for prototype targets | Provider hardening tests cover Postgres event-store replay authority refs, adapter audit/outbox rows, and ActivityPub redaction sanitization. | External Postgres integration remains skipped until infrastructure exists. | Provision external provider integration and run production-track conformance. |
| Operations readiness | Pass | Operations report checks replay freshness, projection lag, outbox backlog, adapter audit health, federation failures, and remediation hooks where the runtime exposes them. | Real operator identity/approval policy is not yet wired to production providers. | Bind operator loop to production auth and provider alerts. |
| Federation export | Pass | Phase 8 export preview includes appeal, conflict, agreement, evidence, redaction summary, authority refs, content hash, and event ids. | Remote reconciliation is still local/prototype. | Implement governed import reconciliation in Phase 9. |
| Web shell surfacing | Pass | Web acceptance displays appeal lifecycle, conflict lifecycle, contested outcomes, consent revocation, redaction posture, and authority refs from the same Phase 8 event stream. | Dedicated decision-packet page sections are still compact. | Build richer contested packet views during Phase 9 shell expansion. |

## Evidence

- `executeRiverbendTrustHardeningSlice` appends the Phase 8 trust trail on top of the Phase 7 stream without replacing or rewriting the Phase 7 decision records.
- `phase8-trust-governance-hardening.test.ts` proves appeal and conflict lifecycle events, consent-revoked redaction continuity, federation export readiness, and decision packet projection of the Phase 8 proof trail.
- `phase8-provider-hardening.test.ts` proves provider-prototype replay/export hardening across Postgres event store, adapter audit/outbox records, and ActivityPub transport sanitization.
- `@canopy/capabilities-governance` tests cover appeal and conflict authority validation, including reviewer/facilitator requirements after open state.
- `@canopy/workflows-command-runtime` tests prove appeal and conflict lifecycle commands persist through canonical event records, outbox, projection rebuild, and civic-memory replay.
- Web acceptance proves the dashboard derives lifecycle and outcome rows from emitted `governance.appeal.*` and `governance.conflict.*` events.

## Completion Decision

Phase 8 is complete at the executable local-acceptance level.

The remaining caveats are intentionally promoted to later phases:

- External production-provider integration once infrastructure is provisioned.
- Cross-scope federation import reconciliation.
- Richer web packet sections for contested governance narratives.
- Operator identity, approval policy, and provider alert binding.

## Phase 9 Entry

Phase 9 can begin from a stronger base: Canopy now has native contested-governance lifecycle commands, portable decision-packet proof, redaction-aware federation export, provider-prototype enforcement checks, operations readiness signals, and web-visible appeal/conflict traces.

# Phase 8 Trust and Governance Hardening

Date: 2026-06-15

## Entry Condition

Phase 7 now proves a complete Riverbend/Mill Creek cybernetic path with:

- Native commands for observe, understand, simulate, deliberate, coordinate, act, learn, federate, amend, object, redact, reverse, revoke, and version policy.
- Adaptive threshold-worsens branch.
- Preserved objection and redaction continuity in a decision packet.
- Provider-prototype replay through the Postgres event store.
- Redaction-aware ActivityPub federation transport.

## Phase 8 Goal

Harden Canopy's trust layer so contested governance, privacy, provider enforcement, and operational review are not special cases. Phase 8 should make disagreement, appeal, redaction, federation, and provider auditability visible and enforceable across shell, providers, and command runtime.

## Primary Workstreams

1. Appeals and conflicts
   - Add native conflict and appeal command coverage beyond use-right appeal.
   - Preserve minority reports and unresolved objections in decision packets.
   - Exercise appeal paths after adaptive decisions.

2. Provider enforcement
   - Promote prototype provider checks into repeatable Phase 8 acceptance tests.
   - Add external Postgres integration path when infrastructure is available.
   - Require adapter audit records for redaction, federation, and authority-sensitive commands.

3. Redaction and consent UX
   - Surface redaction summaries, sealed refs, removed fields, and continuity events in shell routes.
   - Add consent grant/revocation flows where redaction is caused by consent changes.
   - Verify exports never leak blocked or redacted payload fields.

4. Decision packet depth
   - Add packet projections for amendments, objections, policy versions, appeals, and redaction summaries.
   - Make decision packets the portable proof artifact for contested governance.

5. Operational readiness
   - Add operator checks for replay freshness, projection lag, outbox backlog, provider health, and federation failures.
   - Define Phase 8 completion gates in a validation report.

## First Acceptance Gates

- A contested adaptive decision can be appealed without mutating the original decision.
- A redaction caused by consent revocation preserves envelope continuity and export stubs.
- A provider-backed replay/export test verifies authority refs, adapter audit rows, and redaction sanitization.
- The shell shows objection, appeal, redaction, and policy-version traces from the same event stream.
- `npm run check` remains the baseline verification command.

# Operations Operator Loop

## Purpose

Establish the first provider-neutral control plane model for operators watching a
Canopy commons runtime.

## Loop Surfaces

- Health report: readiness, blocker count, attention count, and alert count.
- Projection rebuild controls/status: direct rebuild control, current/missing/stale/failed
  state tracking, rebuild timestamps, and rebuildability.
- Outbox drain status: drained, ready, waiting, or blocked state with retryable,
  exhausted, leased, published, and dead-lettered record ids.
- Adapter audit review: status counts, unresolved audits, warning audits, and latest
  completion time.
- Failed import remediation: import audit and import outbox remediation queue with
  retry, review, or blocked actions.
- Invariant drift alerts: projection, outbox, adapter audit, and import remediation
  drift surfaced as warning or critical alerts.
- Remediation command plan: deterministic commands derived from a report to retry
  failed outbox records, request projection rebuilds, quarantine blocked imports,
  acknowledge adapter audit failures, and create invariant drift tickets.
- Remediation command execution: records operator audit artifacts for
  acknowledgements, quarantines, and drift tickets, then rebuilds the report so
  remediated failures leave the open queues.

## Verification

The operations workflow has focused tests for empty health, happy-path import drain,
direct projection rebuild control, and blocked remediation/drift reporting.
Additional command-loop tests cover report-to-command planning, execution effects,
outbox batch retry, and projection rebuild requests.

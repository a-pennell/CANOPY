# Canopy Event Taxonomy

## Purpose

This taxonomy defines how Canopy remembers change.

Canopy modules may have their own local tables, workflows, and domain logic, but consequential changes must emit canonical events into civic memory. Without this shared event grammar, the ecosystem fragments into separate histories.

## Design Rules

1. Events are append-only.
2. Corrections are new events, not edits.
3. Every event has an actor or a declared system source.
4. Every event references a canonical object.
5. Every event declares authority when the event changes rights, obligations, governance state, resource state, ecological state, data visibility, or accounting state.
6. Events inherit data stewardship rules from affected objects unless explicitly overridden.
7. Private or sealed events may emit redacted stubs for civic-memory continuity.
8. AI may emit interpretation events, but not binding decision events.

## Canonical Event Envelope

```ts
interface CanopyEvent {
  id: string;
  type: CanopyEventType;
  occurredAt: string;
  actorRef?: ObjectRef;
  systemActor?: "scheduler" | "sensor" | "ai_assistant" | "importer" | "federation_peer";
  objectRef: ObjectRef;
  relatedRefs?: ObjectRef[];
  authorityRefs?: ObjectRef[];
  orgId?: string;
  placeId?: string;
  commonsId?: string;
  livingSystemId?: string;
  sourceCapability: CanopyCapability;
  payload: Record<string, unknown>;
  schemaVersion: number;
  visibility: DataVisibility;
  dataState?: DataState;
  supersedesEventId?: string;
}
```

## Event Namespaces

| Namespace | Purpose |
| --- | --- |
| `identity.*` | Persons, accounts, organizations, memberships |
| `authority.*` | Roles, mandates, delegations, guardians |
| `object.*` | Canonical object lifecycle and relationship changes |
| `claim.*` | Claim creation, review, contestation, supersession |
| `evidence.*` | Evidence/source ingestion and linking |
| `governance.*` | Issues, proposals, decisions, policies, appeals |
| `stewardship.*` | Resources, use rights, assignments, routines, maintenance |
| `ecology.*` | Living systems, indicators, thresholds, guardian review |
| `coordination.*` | Needs, capabilities, requests, offers, commitments |
| `allocation.*` | Allocations, obligations, budgets, treasury, use rights |
| `accounting.*` | Ledger accounts, ledger entries, settlement records |
| `flow.*` | Food/material/energy/care/waste flow records |
| `model.*` | Models, assumptions, scenarios, audits, disputes |
| `care.*` | Support circles, care holds, repair threads, restricted care coordination |
| `federation.*` | Export, import, fork, sync, reconciliation, defederation |
| `integrity.*` | Moderation, rate limits, abuse review, data poisoning checks |
| `system.*` | Migration, schema version, module activation |

## Required Base Events

### Identity Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `identity.person.created` | Person | `displayName`, `createdByRef` |
| `identity.account.linked` | Account | `personRef`, `provider` |
| `identity.organization.created` | Organization | `name`, `type`, `slug` |
| `identity.organization.archived` | Organization | `reason`, `authorityRefs` |
| `identity.membership.invited` | Membership | `personOrEmail`, `orgRef`, `invitedByRef` |
| `identity.membership.activated` | Membership | `personRef`, `orgRef`, `authorityRefs` |
| `identity.membership.suspended` | Membership | `reason`, `reviewAt`, `authorityRefs` |
| `identity.membership.departed` | Membership | `reasonCategory`, `retentionRuleRef` |

### Authority Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `authority.role.created` | Role | `name`, `permissions`, `scope` |
| `authority.role.assigned` | RoleAssignment | `personRef`, `roleRef`, `term`, `authorityRefs` |
| `authority.role.revoked` | RoleAssignment | `reason`, `authorityRefs` |
| `authority.mandate.granted` | Mandate | `holderRef`, `scope`, `capabilities`, `expiresAt` |
| `authority.mandate.reviewed` | Mandate | `outcome`, `reviewNotesRef` |
| `authority.mandate.revoked` | Mandate | `reason`, `revocationProcessRef` |
| `authority.delegation.granted` | Delegation | `delegatorRef`, `delegateRef`, `capability`, `scope` |
| `authority.delegation.revoked` | Delegation | `reason`, `revokedByRef` |
| `authority.guardian.appointed` | Guardian | `representedRef`, `basis`, `challengePathRef` |
| `authority.guardian.challenged` | Guardian | `challengeClaimRef`, `processRef` |

### Object Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `object.created` | Any root object | `objectType`, `createdByRef`, `initialState` |
| `object.updated` | Any root object | `changedFields`, `reason` |
| `object.archived` | Any root object | `reason`, `authorityRefs` |
| `object.restored` | Any root object | `reason`, `authorityRefs` |
| `object.relationship.linked` | ObjectRelationship | `fromRef`, `toRef`, `relationshipType` |
| `object.relationship.unlinked` | ObjectRelationship | `fromRef`, `toRef`, `relationshipType`, `reason` |
| `object.taxonomy.mapped` | CanonicalMapping | `localTerm`, `canonicalType`, `scopeRef` |

### Claims And Evidence Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `claim.created` | Claim | `claimantRef`, `aboutRefs`, `claimType`, `dataState` |
| `claim.reviewed` | Claim | `reviewStatus`, `reviewedByRef`, `reason` |
| `claim.contested` | Claim | `counterclaimRef`, `contestedByRef` |
| `claim.superseded` | Claim | `supersededByClaimRef`, `reason` |
| `evidence.source.ingested` | Source | `sourceType`, `submittedByRef`, `visibility` |
| `evidence.created` | Evidence | `evidenceType`, `submittedByRef`, `dataState` |
| `evidence.linked_to_claim` | EvidenceLink | `claimRef`, `evidenceRef`, `relation` |
| `evidence.redacted` | Evidence | `redactionReason`, `dataStewardshipAgreementRef` |

### Governance Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `governance.issue.created` | Issue | `title`, `scope`, `createdByRef` |
| `governance.issue.scoped` | Issue | `affectedRefs`, `scopeRationale` |
| `governance.issue.reopened` | Issue | `reason`, `reopenedByRef` |
| `governance.perspective.submitted` | Perspective | `issueRef`, `authorRef`, `taxonomyType` |
| `governance.proposal.created` | Proposal | `issueRef`, `proposalType`, `createdByRef` |
| `governance.proposal.opened` | Proposal | `deliberationWindow`, `decisionMethod` |
| `governance.objection.raised` | Perspective | `proposalRef`, `objectionType`, `authorRef` |
| `governance.amendment.submitted` | Proposal | `parentProposalRef`, `createdByRef` |
| `governance.decision.recorded` | Decision | `proposalRef`, `outcome`, `method`, `authorityRefs` |
| `governance.policy.created` | Policy | `policyType`, `ruleLevel`, `decisionRef` |
| `governance.policy.versioned` | PolicyVersion | `policyRef`, `decisionRef`, `summaryOfChanges` |
| `governance.appeal.opened` | Appeal | `targetRef`, `grounds`, `openedByRef` |
| `governance.conflict.opened` | Conflict | `conflictType`, `affectedRefs`, `visibility` |
| `governance.conflict.resolved` | Conflict | `resolutionRef`, `remedyRefs` |

### Stewardship Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `stewardship.resource.created` | Resource | `resourceType`, `stewardRef`, `scopeRef` |
| `stewardship.resource.condition_updated` | Resource | `previousStatus`, `newStatus`, `claimRef` |
| `stewardship.resource.document_added` | Evidence | `resourceRef`, `documentType` |
| `stewardship.use_right.granted` | UseRight | `holderRef`, `resourceRef`, `conditions`, `authorityRefs` |
| `stewardship.use_right.suspended` | UseRight | `reason`, `reviewAt`, `authorityRefs` |
| `stewardship.use_right.revoked` | UseRight | `reason`, `authorityRefs` |
| `stewardship.assignment.created` | Mandate | `holderRef`, `resourceRef`, `scope`, `term` |
| `stewardship.routine.created` | Routine | `resourceRef`, `cycle`, `responsibleRefs` |
| `stewardship.task.created` | Task | `routineOrProjectRef`, `priority`, `dueAt` |
| `stewardship.task.completed` | Task | `completedByRef`, `evidenceRefs`, `outcomeRef` |
| `stewardship.contribution.logged` | Contribution | `contributorRef`, `contributionType`, `linkedRefs` |

### Ecology Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `ecology.living_system.created` | LivingSystem | `livingSystemType`, `boundaryRef`, `guardianRefs` |
| `ecology.indicator.recorded` | Indicator | `livingSystemRef`, `value`, `dataState`, `evidenceRefs` |
| `ecology.threshold.created` | Threshold | `indicatorRef`, `thresholdClass`, `authorityRefs` |
| `ecology.threshold.breached` | Threshold | `indicatorRef`, `readingRef`, `severity` |
| `ecology.guardian.review_requested` | GuardianReview | `proposalRef`, `livingSystemRef`, `guardianRefs` |
| `ecology.guardian.review_completed` | GuardianReview | `recommendation`, `claimRefs`, `evidenceRefs` |
| `ecology.annotation.added` | Evidence/Perspective | `targetRef`, `submittedByRef`, `basis` |

### Coordination And Allocation Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `coordination.need.created` | Need | `expressedByRef`, `urgency`, `scopeRef` |
| `coordination.capability.created` | Capability | `offeredByRef`, `availability`, `constraints` |
| `coordination.request.created` | Request | `needRef`, `requestedByRef`, `requestedByDate` |
| `coordination.offer.created` | Offer | `capabilityRef`, `offeredByRef`, `availabilityWindow` |
| `coordination.match.proposed` | Proposal | `requestRef`, `offerRef`, `constraints` |
| `coordination.commitment.created` | Commitment | `parties`, `fulfillsRefs`, `authorityRefs` |
| `coordination.commitment.fulfilled` | Commitment | `outcomeRef`, `fulfilledByRef` |
| `coordination.commitment.blocked` | Commitment | `blockerClaimRef`, `nextReviewAt` |
| `allocation.created` | Allocation | `allocatedRef`, `recipientRef`, `amountOrScope`, `authorityRefs` |
| `allocation.consent.recorded` | Allocation | `consentingRef`, `status`, `notes` |
| `allocation.obligation.created` | Obligation | `obligatedRef`, `owedToRef`, `dueAt` |
| `allocation.obligation.closed` | Obligation | `outcomeRef`, `closedByRef` |

### Accounting Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `accounting.ledger_account.created` | LedgerAccount | `holderRef`, `ledgerType`, `rulesRef` |
| `accounting.ledger_entry.posted` | LedgerEntry | `ledgerAccountRef`, `amount`, `unit`, `counterpartyRefs` |
| `accounting.ledger_entry.reversed` | LedgerEntry | `originalEntryRef`, `reversalEntryRef`, `reason` |
| `accounting.statement.generated` | AccountingReport | `scopeRef`, `period`, `contentHash` |
| `accounting.limit.changed` | UseRight | `holderRef`, `oldLimit`, `newLimit`, `authorityRefs` |

### Flow Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `flow.recorded` | Flow | `sourceRef`, `destinationRef`, `resourceRef`, `quantity`, `unit` |
| `flow.food.recorded` | Flow | `foodItemRef`, `fromActorRef`, `toActorRef`, `flowType`, `quantity` |
| `flow.waste.recorded` | Flow | `resourceRef`, `wasteReason`, `destination`, `quantity` |
| `flow.transport.recorded` | Flow | `mode`, `distance`, `emissionsClaimRef` |
| `flow.intervention.created` | Policy/Allocation | `interventionType`, `targetRefs`, `ecologicalRationale` |

### Model And Simulation Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `model.created` | Model | `purpose`, `stewardRefs`, `datasetRefs` |
| `model.assumption.added` | Assumption | `modelRef`, `claimRef`, `dataState` |
| `model.scenario.created` | Scenario | `modelRef`, `proposalRef`, `assumptionRefs` |
| `model.output.generated` | Evidence | `scenarioRef`, `confidence`, `limitations` |
| `model.audit.completed` | Audit | `modelRef`, `auditOutcome`, `reviewerRefs` |
| `model.dispute.opened` | Conflict | `modelRef`, `contestedAssumptionRefs`, `openedByRef` |
| `model.retired` | Model | `reason`, `authorityRefs` |

### Care Events

Care events are restricted by default. Many emit only aggregate or sealed civic-memory stubs.

| Event type | Object | Required payload |
| --- | --- | --- |
| `care.hold.created` | CareHold | `visibility`, `coordinatorRef`, `dataStewardshipAgreementRef` |
| `care.support_circle.created` | SupportCircle | `visibility`, `coordinatorRef`, `sealedDetails` |
| `care.support_circle.closed` | SupportCircle | `closureCategory`, `retentionRuleRef` |
| `care.repair_thread.opened` | RepairThread | `visibility`, `facilitatorRef`, `dataStewardshipAgreementRef` |
| `care.repair_thread.closed` | RepairThread | `closureCategory`, `retentionRuleRef` |
| `care.load_signal.updated` | Indicator | `aggregateScopeRef`, `signal`, `dataState` |

### Federation Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `federation.export.created` | ExportEnvelope | `scopeRef`, `includes`, `contentHash`, `redactionSummary` |
| `federation.import.received` | ImportEnvelope | `sourceRef`, `contentHash`, `schemaVersion` |
| `federation.sync.completed` | FederationRule | `localScopeRef`, `remoteScopeRef`, `eventCount` |
| `federation.conflict.detected` | Conflict | `localRef`, `remoteRef`, `conflictPolicy` |
| `federation.reconciliation.recorded` | Decision/Agreement | `conflictRef`, `resolution` |
| `federation.defederation.initiated` | FederationRule | `reason`, `authorityRefs` |
| `federation.defederation.completed` | FederationRule | `preservedRefs`, `exportRef` |

### Integrity Events

| Event type | Object | Required payload |
| --- | --- | --- |
| `integrity.rate_limit.triggered` | IntegrityControl | `actorRef`, `action`, `scopeRef` |
| `integrity.moderation.action_recorded` | ModerationAction | `targetRef`, `action`, `authorityRefs` |
| `integrity.data_poisoning.flagged` | Claim/Model | `targetRef`, `reason`, `reviewPathRef` |
| `integrity.coordinated_activity.flagged` | Audit | `scopeRef`, `signal`, `reviewPathRef` |
| `integrity.audit.completed` | Audit | `targetRef`, `outcome`, `reviewerRefs` |

## Event-To-Cybernetic Phase Map

| Phase | Primary event families |
| --- | --- |
| Observe | `object.*`, `stewardship.resource.*`, `ecology.indicator.*`, `flow.*`, `evidence.source.*` |
| Understand | `claim.*`, `evidence.*`, `governance.perspective.*`, `model.assumption.*` |
| Simulate | `model.*`, `ecology.threshold.*`, `flow.intervention.*` |
| Deliberate | `governance.issue.*`, `governance.proposal.*`, `governance.objection.*`, `ecology.guardian.*` |
| Coordinate | `coordination.*`, `allocation.*`, `authority.*`, `stewardship.use_right.*` |
| Act | `stewardship.task.*`, `coordination.commitment.*`, `accounting.*`, `flow.*` |
| Learn | `governance.decision.*`, `governance.policy.versioned`, `model.audit.*`, `integrity.audit.*`, `federation.reconciliation.*` |

## First Stable Event Set

The first implementation should stabilize these before expanding:

1. `identity.organization.created`
2. `identity.membership.activated`
3. `authority.delegation.granted`
4. `authority.delegation.revoked`
5. `object.created`
6. `claim.created`
7. `claim.reviewed`
8. `evidence.source.ingested`
9. `evidence.linked_to_claim`
10. `governance.issue.created`
11. `governance.perspective.submitted`
12. `governance.proposal.created`
13. `governance.decision.recorded`
14. `governance.policy.versioned`
15. `stewardship.resource.created`
16. `stewardship.resource.condition_updated`
17. `stewardship.use_right.granted`
18. `coordination.need.created`
19. `coordination.offer.created`
20. `coordination.commitment.created`
21. `allocation.created`
22. `flow.recorded`
23. `ecology.indicator.recorded`
24. `ecology.threshold.breached`
25. `federation.export.created`

## Validation Checklist

For any proposed new event:

- Does it use a namespace?
- Does it reference a canonical object?
- Does it declare actor or system actor?
- Does it preserve authority when rights/obligations change?
- Does it preserve data stewardship and visibility?
- Does it support replay or audit?
- Does it belong in civic memory, or is it merely local UI telemetry?
- Does it avoid hidden scoring?
- Does it connect to at least one cybernetic phase?


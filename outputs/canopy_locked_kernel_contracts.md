# Canopy Locked Kernel Contracts

## 1. Contract Lock Thesis

Status: Locked v0 decision record  
Scope: Contract meaning, identifiers, event shape, module obligations, and implementation acceptance criteria  
Source artifacts: PRD, kernel contract draft, ontology map, contract package spec, database adapter strategy, first vertical slice spec

Canopy v0 is a contract-first cybernetic commons kernel, not a bundle of applications. CommonCredit, ICOS, Sensemaking, and Stewardship are folded capabilities inside Canopy. They may contribute domain patterns, adapters, fixtures, and UI histories, but they must not carry forward separate ontologies for identity, authority, object references, claims, evidence, events, stewardship, accounting, governance, data rights, or federation.

The locked v0 thesis is:

- The canonical product is a governed, versioned, contestable object graph with append-only civic memory.
- Every consequential module action must resolve to canonical objects, authority, claims or evidence where relevant, data stewardship rules, and a canonical event envelope.
- Modules may own domain workflow. They may not redefine kernel meaning.
- AI, model output, imported records, sensor readings, and legacy app rows are inputs to Canopy memory. They are not authority by themselves.
- Ecological context is part of the kernel contract whenever material resources, land, water, energy, food, waste, infrastructure, procurement, transport, or living systems are affected.
- Forkability, export, consent, redaction, revocation, challenge, and review are baseline contract rights, not later features.

This record locks v0 for implementation. Changes to these contracts require an explicit kernel amendment record.

## 2. Canonical Kernel Objects And Identifiers

### 2.1 Canonical Object Families

The v0 canonical object graph is organized by the cybernetic loop, not by apps.

Actors and authority:

- `Person`
- `Account`
- `Organization`
- `Membership`
- `Role`
- `RoleAssignment`
- `Mandate`
- `Delegation`
- `Guardian`
- `Credential`

Reality, commons, and ecology:

- `Place`
- `Commons`
- `LivingSystem`
- `Resource`
- `Stock`
- `Flow`
- `Indicator`
- `Threshold`

Claims, evidence, and sensemaking:

- `Claim`
- `Counterclaim`
- `Evidence`
- `Source`
- `EvidenceLink`
- `Perspective`
- `AffectedGroup`
- `Model`
- `Assumption`
- `Scenario`

Governance and memory:

- `Issue`
- `Proposal`
- `Decision`
- `Agreement`
- `Policy`
- `Appeal`
- `Conflict`
- `Audit`
- `Retrospective`

Coordination, allocation, and action:

- `Need`
- `Capability`
- `Request`
- `Offer`
- `Commitment`
- `Allocation`
- `Obligation`
- `UseRight`
- `Project`
- `Routine`
- `Task`
- `Contribution`
- `Outcome`
- `LedgerAccount`
- `LedgerEntry`
- `Budget`
- `Treasury`

Data, federation, and local language:

- `DataStewardshipAgreement`
- `AccessRule`
- `FederationRule`
- `Taxonomy`
- `LocalTerm`
- `CanonicalMapping`

### 2.2 Canonical Artifacts

These are canonical artifacts, packets, process records, or subtypes. They may have stable IDs and events, but they do not define new root ontology unless later promoted by kernel amendment:

- `DecisionPacket`
- `ExportEnvelope`
- `PolicyVersion`
- `Vote`
- `ConsentSignal`
- `QuorumState`
- `Theme`
- `Digest`
- `Notification`
- `Invoice`
- `Transaction`
- `AccountingReport`
- `GuardianReview`
- `ModelOutput`
- `ModelAudit`
- `CareHold`
- `SupportCircle`
- `RepairThread`

### 2.3 Identifier Rules

All cross-module references must use `ObjectRef`.

```ts
interface ObjectRef {
  id: string;
  type: CanopyObjectType;
  orgId?: string;
  placeId?: string;
  commonsId?: string;
  livingSystemId?: string;
  module?: CanopyCapability;
  schemaVersion: number;
}
```

Locked rules:

- `id` is stable, globally unique within a Canopy instance, and never recycled.
- `type` must be canonical or mapped through `CanonicalMapping`.
- `schemaVersion` is required for every object ref, event, export, and adapter mapping.
- Legacy IDs, provider IDs, database IDs, and local slugs may persist, but they are not cross-module identity.
- `Person`, identity `Account`, `Membership`, and `LedgerAccount` are distinct and must never be collapsed.
- Local aliases such as Community, Space, Neighborhood, Member, Producer, AccessRight, CreditAccount, DecisionRecord, TimelineEvent, and Dispute must map to canonical objects or artifacts.

## 3. Canonical Event Envelope And Minimum Event Taxonomy

### 3.1 Event Envelope

Every consequential mutation must emit a canonical append-only event.

```ts
interface CanopyEvent {
  id: string;
  type: string;
  occurredAt: string;
  actorRef?: ObjectRef;
  systemActor?: string;
  objectRef: ObjectRef;
  relatedRefs: ObjectRef[];
  authorityRefs: ObjectRef[];
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

Locked rules:

- Civic memory is append-only. Corrections, reversals, redactions, and supersessions are new events.
- Module-local logs are insufficient for consequential changes.
- Events must reference canonical objects and source capability.
- Binding events must include authority references.
- Private or sealed records preserve envelope continuity through redacted stubs.
- Event rows should receive database-level append-only enforcement where possible.

### 3.2 Event Namespaces

The minimum v0 namespace set is locked:

- `identity.*`
- `authority.*`
- `object.*`
- `evidence.*`
- `claim.*`
- `governance.*`
- `stewardship.*`
- `ecology.*`
- `coordination.*`
- `allocation.*`
- `accounting.*`
- `flow.*`
- `model.*`
- `learning.*`
- `federation.*`
- `system.*`

### 3.3 Minimum Event Taxonomy

The first implementation must support at least these event types:

```text
identity.person.created
identity.account.linked
identity.organization.created
identity.membership.activated
authority.role.assigned
authority.role.revoked
authority.mandate.granted
authority.mandate.revoked
authority.delegation.granted
authority.delegation.revoked
authority.guardian.appointed
object.created
object.relationship.created
object.relationship.superseded
evidence.source.ingested
evidence.created
evidence.linked_to_claim
evidence.redacted
claim.created
claim.reviewed
claim.contested
claim.superseded
governance.issue.created
governance.issue.scoped
governance.perspective.submitted
governance.proposal.created
governance.proposal.opened
governance.objection.raised
governance.amendment.submitted
governance.decision.recorded
governance.policy.versioned
governance.appeal.opened
stewardship.resource.created
stewardship.use_right.granted
stewardship.use_right.revoked
stewardship.task.created
stewardship.task.completed
stewardship.contribution.logged
ecology.living_system.created
ecology.indicator.recorded
ecology.threshold.created
ecology.threshold.breached
ecology.guardian.review_requested
ecology.guardian.review_completed
coordination.need.created
coordination.request.created
coordination.capability.created
coordination.offer.created
coordination.match.proposed
coordination.commitment.created
coordination.commitment.fulfilled
allocation.created
allocation.consent.recorded
allocation.obligation.created
accounting.ledger_entry.posted
accounting.ledger_entry.reversed
flow.food.recorded
flow.transport.recorded
flow.waste.recorded
model.created
model.assumption.added
model.scenario.created
model.output.generated
model.audit.completed
learning.outcome.recorded
learning.retrospective.completed
federation.export.created
federation.import.received
federation.reconciliation.completed
system.redaction.applied
```

## 4. Identity, Membership, Authority, And Delegation Contract

Identity is split into four separate concepts:

- `Person`: a human being.
- `Account`: an authentication handle linked to a person.
- `Organization`: a formal or informal collective actor.
- `Membership`: a person's relation to an organization.

Authority never attaches directly to an auth account. Authority must flow through one or more of:

- active membership
- role assignment
- mandate
- delegation
- guardian appointment
- policy
- agreement
- use right
- emergency authority with sunset and review

Locked rules:

- A person may have multiple accounts, memberships, roles, mandates, delegations, and guardianships.
- A membership alone is not permission to decide.
- `Role` is a named bundle of possible responsibilities; `RoleAssignment` records who holds it, for what scope, and for what term.
- `Mandate` is bounded authority to decide, act, represent, steward, or review.
- `Delegation` is scoped, inspectable where allowed, and always revocable.
- `Guardian` is representational authority for a living system, future generation, vulnerable interest, or non-participating affected party. It is not sovereignty.
- Every consequential decision, allocation, use-right grant, delegation, policy change, federation change, data disclosure change, model adoption, threshold change, or stewardship change must cite authority.
- Permission denial must be explainable unless explanation would reveal protected information.

All permission checks use the common request/result shape:

```ts
interface PermissionCheckRequest {
  actorRef: ObjectRef;
  permission: PermissionAtom;
  targetRef: ObjectRef;
  context?: {
    purpose?: string;
    emergency?: boolean;
    actingMandateRef?: ObjectRef;
  };
}

interface PermissionCheckResult {
  allowed: boolean;
  sourceRefs: ObjectRef[];
  reason?: string;
  requiredAppealPathRef?: ObjectRef;
}
```

## 5. Object Ref And Relationship Contract

Object relationships are first-class graph edges, not ad hoc foreign keys hidden in module tables.

Minimum relationship record:

```ts
interface ObjectRelationship {
  id: string;
  subjectRef: ObjectRef;
  predicate: string;
  objectRef: ObjectRef;
  sourceRef?: ObjectRef;
  authorityRefs: ObjectRef[];
  evidenceRefs: ObjectRef[];
  startsAt?: string;
  endsAt?: string;
  dataState: DataState;
  visibility: DataVisibility;
  schemaVersion: number;
}
```

Locked relationship grammar:

- `Person` is member of `Organization` through `Membership`.
- `Organization` stewards `Commons`, `Resource`, `Place`, or `LivingSystem` through `Mandate`, `RoleAssignment`, `Agreement`, or `Policy`.
- `Place` contains or overlaps `Commons`, `Resource`, and `LivingSystem`.
- `LivingSystem` has `Guardian`, `Indicator`, `Threshold`, and ecological needs.
- `Need` may create `Request`.
- `Capability` may create `Offer`.
- `Request` and `Offer` may become `Commitment`.
- `Proposal` may cite `Claim`, `Evidence`, `Perspective`, `Scenario`, and `EcologicalHooks`.
- `Decision` may create or change `Agreement`, `Policy`, `Allocation`, `UseRight`, `Obligation`, or `FederationRule`.
- `Agreement` creates `Commitment` and `Obligation`.
- `Project` and `Routine` contain `Task` and produce `Outcome`.
- `Outcome` updates `Indicator` and may create a new `Claim`, `Issue`, `Audit`, or `Retrospective`.

Modules may add domain predicates, but they must be documented, typed, and mapped to canonical refs.

## 6. Claim, Evidence, And Review Contract

A `Claim` is a contestable assertion about an object, condition, cause, need, capability, value, risk, assumption, forecast, impact, model, or outcome. Decision-relevant assertions must be claims.

Locked rules:

- Claims, sources, evidence, evidence links, counterclaims, perspectives, model outputs, and decisions are separate concepts.
- Evidence supports, challenges, contextualizes, qualifies, or supersedes claims through `EvidenceLink`.
- A claim can be accepted for a purpose without becoming universal truth.
- AI-generated assertions must be marked as `machine_inferred` or `ai_interpretation`.
- Sensor readings must be marked as `sensor_derived`.
- Model outputs must be marked as `model_derived` and treated as evidence, not decision authority.
- Counterclaims and objections must be preserved according to stewardship rules; they are not erased by accepted decisions.
- Human review is required before imported, AI-extracted, or model-derived claims become decision-ready.

Minimum review states:

- `pending`
- `accepted`
- `rejected`
- `contested`
- `superseded`
- `preserved`

Minimum evidence types:

- `testimony`
- `measurement`
- `sensor_reading`
- `local_knowledge`
- `scientific_study`
- `institutional_record`
- `media_artifact`
- `model_output`
- `ai_interpretation`
- `legal_document`
- `financial_record`
- `field_note`

## 7. Resource, Stewardship, And Access-Right Contract

Canopy treats stewardship as more fundamental than ownership. Ownership records may exist, but no module may make ownership the only legitimate relation to a resource.

Locked objects:

- `Resource`: material, energetic, spatial, infrastructural, informational, cultural, or productive capacity.
- `Commons`: shared resource system with boundaries, participants, and governance rules.
- `UseRight`: governed right to access, withdraw, occupy, modify, steward, maintain, benefit from, or restrict a resource.
- `AccessRule`: rule determining who can view, create, edit, verify, challenge, grant use, revoke use, export, or federate.
- `Routine`: recurring care, maintenance, restoration, monitoring, or reproductive practice.
- `Task`: unit of work under a project or routine.
- `Contribution`: logged labor, care, knowledge, material, funds, or support.

Locked rules:

- Use rights must be scoped by holder, resource, permission, conditions, authority, review path, start, and optional end.
- Use rights are revocable through a defined process.
- Access rights from Stewardship map to `UseRight` plus `AccessRule`.
- Resource events emit to civic memory.
- Maintenance and care records must not become productivity rankings.
- Contributions must not create portable reputation, hidden eligibility, social credit, or generalized person scores.
- Material resource workflows must expose ecological hooks where relevant.

## 8. Allocation And Accounting Contract

Allocation and accounting are folded Canopy capabilities. Mutual credit is one accounting method, not the economic ontology.

Locked objects:

- `Need`
- `Capability`
- `Request`
- `Offer`
- `Commitment`
- `Allocation`
- `Obligation`
- `LedgerAccount`
- `LedgerEntry`
- `Budget`
- `Treasury`

Locked rules:

- A need or offer may be visible without becoming a binding commitment.
- A request or offer can become a match proposal, allocation, commitment, obligation, task, flow, and outcome.
- Allocation requires authority and must cite the decision, policy, agreement, mandate, or emergency authority that authorized it.
- Commitments must cite parties, fulfilled request and offer refs where applicable, obligations, due dates, authority refs, and fulfillment state.
- `LedgerAccount` is an accounting account, not an auth account.
- `LedgerEntry` is append-only. Reversals are new entries and events, never edits.
- Settlement is subordinate to commitments, allocations, obligations, and governance.
- Credit limits and access to debit capacity are governed `UseRight` or allocation changes.
- No accounting or contribution process may create hidden eligibility scoring.

## 9. Governance And Decision Packet Contract

Governance is the spine that makes decisions legitimate, inspectable, contestable, and learnable.

Locked governance objects:

- `Issue`
- `Proposal`
- `Perspective`
- `Decision`
- `Agreement`
- `Policy`
- `Appeal`
- `Conflict`

Locked process artifacts:

- `DecisionPacket`
- `PolicyVersion`
- `Vote`
- `ConsentSignal`
- `QuorumState`
- `Amendment`
- `Objection`

Decision rules:

- A decision must cite at least one proposal or issue.
- A binding decision must cite authority refs.
- A decision that changes rights, obligations, policy, data visibility, federation, threshold, allocation, mandate, delegation, or use rights must cite authority.
- Votes and consent signals are process artifacts, not decisions.
- Unresolved objections remain visible according to their data stewardship rules.
- Appeals and conflicts preserve target refs and cannot erase the original decision trail.

Minimum decision packet contents:

- decision ref
- proposal or issue refs
- authority refs
- decision method
- scope and affected refs
- claims and evidence considered
- perspectives and unresolved objections
- scenario and model refs where used
- guardian review where required
- rationale
- conditions
- obligations created
- policy or agreement changes
- review date
- appeal path
- data stewardship and redaction summary
- event trail and schema versions

## 10. Data Stewardship, Consent, Retention, And Auditability Contract

Data stewardship is a kernel object, not a privacy footnote.

Minimum visibility values:

- `public`
- `federation`
- `organization`
- `commons`
- `role_restricted`
- `guardian_restricted`
- `private`
- `embargoed`
- `sealed`

Minimum data states:

- `unverified`
- `locally_verified`
- `expert_reviewed`
- `institutionally_certified`
- `contested`
- `outdated`
- `sensitive`
- `archived`
- `machine_inferred`
- `sensor_derived`
- `testimony_derived`
- `model_derived`

Locked rules:

- Every sensitive object must declare visibility, data state, allowed uses, prohibited uses, consent requirements, retention rule where applicable, export rule where applicable, and federation rule where applicable.
- Data stewardship agreements travel with exported and federated data.
- AI summaries inherit the most restrictive relevant visibility.
- Crisis sharing requires authority, scope, duration, and post-crisis review.
- Redaction preserves event continuity through stubs and redaction events.
- Sensitive ecological data may be restricted to protect living systems.
- Vulnerable-community and care data may be restricted without erasing institutional accountability.
- Auditability means a reviewer can trace authority, evidence, data state, visibility, changes, redactions, decisions, outcomes, and export history.

## 11. Federation And Forkability Contract

Federation is a governed relationship. Forkability and exit must be testable from v0.

Locked export envelope:

```ts
interface CanopyExportEnvelope {
  id: string;
  exportedAt: string;
  exportedByRef: ObjectRef;
  scopeRef: ObjectRef;
  format: "json" | "jsonl" | "csv_bundle";
  schemaVersion: number;
  includes: CanopyObjectType[];
  dataStewardshipAgreements: DataStewardshipAgreement[];
  contentHash: string;
  redactionSummary?: string;
}
```

Locked federation rule:

```ts
interface FederationRule {
  id: string;
  localScopeRef: ObjectRef;
  remoteScopeRef: ObjectRef;
  allowedObjectTypes: CanopyObjectType[];
  allowedEventTypes: string[];
  syncMode: "manual" | "scheduled" | "near_real_time";
  conflictPolicy: "preserve_both" | "local_wins" | "remote_wins" | "governance_required";
  reviewAt?: string;
}
```

Rules:

- Export must include object refs, schema versions, event trail, data stewardship agreements, content hash, and redaction summary.
- Local terms must travel with canonical mappings so federation does not erase local language.
- Defederation preserves local records.
- Import reconciliation must preserve both records or require governance when conflict policy says so.
- Cross-scale coordination must not erase local autonomy.

## 12. Ecological Context And Model Packet Contract

Living systems are first-class Canopy objects. Ecological context is required when material coordination can affect living systems, thresholds, resources, land, water, energy, food, waste, infrastructure, procurement, or transport.

Minimum ecological hook:

```ts
interface EcologicalHooks {
  affectedLivingSystemRefs: ObjectRef[];
  indicatorRefs: ObjectRef[];
  thresholdRefs: ObjectRef[];
  guardianReviewRequired: boolean;
  ecologicalClaimRefs: ObjectRef[];
  impactModelRefs: ObjectRef[];
}
```

Threshold classes:

- `advisory`: visible in issue, proposal, scenario, and decision context.
- `governance_trigger`: creates issue, review, or escalation.
- `binding`: blocks or constrains action only when adopted by legitimate policy or agreement.

Model packet requirements:

- `Model` is a governed object with purpose, steward refs, dataset refs, assumptions, known failure modes, validation status, and review date.
- `Assumption` is contestable and linked to evidence where possible.
- `Scenario` cites model or method, assumptions, inputs, limitations, uncertainty, and affected refs.
- `ModelOutput` is evidence for deliberation, not a decision.
- Affected communities and guardians can contest model assumptions and outputs.
- Scenario and flow records must expose ecological claims and limitations where relevant.

## 13. Module Compliance Rules

Every module must import and use shared Canopy contracts instead of redefining them.

Required imports or equivalents from contract packages:

- `ObjectRef`
- canonical object type enum
- capability enum and capability manifest
- identity and membership schemas
- role, role assignment, mandate, delegation, guardian schemas
- permission atom and permission check request/result
- access rule and data stewardship schemas
- claim, counterclaim, source, evidence, and evidence link schemas
- event envelope and event taxonomy
- governance hooks and ecological hooks
- export envelope and federation rule
- local taxonomy and canonical mapping schemas

Every capability must declare:

- capability name
- cybernetic phases: observe, understand, simulate, deliberate, coordinate, act, learn
- owned object types
- consumed object types
- emitted event types
- governance hooks
- ecological hooks
- export support

Modules must not redefine:

- person/account/member/membership semantics
- authority, mandate, delegation, or guardian semantics
- object references or cross-module IDs
- claim/evidence/review semantics
- decision packet shape
- event envelope or event namespace rules
- access rules, visibility, data state, retention, consent, export, or redaction rules
- use rights and stewardship semantics
- ledger immutability and reversal semantics
- ecological hook semantics
- federation and forkability semantics

Legacy project mappings are locked:

- CommonCredit maps to allocation, accounting, flows, and deliberation capabilities. Its `Account` maps to `LedgerAccount`, not identity `Account`.
- ICOS maps to deliberation, civic memory, federation, living systems, flows, and care coordination capabilities.
- Sensemaking maps to claims, evidence, deliberation, and learning capabilities. AI extraction remains non-binding until reviewed.
- Stewardship maps to commons registry, agreements, policies, flows, learning, and living systems capabilities.

## 14. Explicit Deferrals And Open Decisions

Deferred from v0:

- Full implementation of all domain services.
- Full municipal, regional, or bioregional federation network.
- Complete mutual-credit settlement UI and tax/export workflows.
- Reputation systems, generalized endorsements, or portable person scoring. These are not merely deferred as features; hidden or generalized scores are prohibited unless a future kernel amendment reverses that prohibition.
- Full ecological modeling framework.
- Full watershed, foodshed, energy, housing, care, and procurement domain models.
- Automated decision-making by AI.
- Final provider choices for auth, ORM, queues, storage, geospatial, time-series, vector, and event infrastructure.
- Complete policy language and decision method library.
- Legal enforceability model for all agreements and mandates.
- Complete schema for confidential care coordination objects.

Open decisions requiring later records:

- Canonical ID generation format: UUID, ULID, CUID, DID, or hybrid.
- Exact package names and SemVer release process.
- Whether `DecisionPacket`, `GuardianReview`, `ModelOutput`, and `CareHold` remain artifacts forever or become root object types.
- Exact payload schemas for each event type.
- Minimum database-level enforcement pattern for non-Postgres stores.
- Federation reconciliation protocol and cryptographic signing approach.
- Retention and deletion policy by jurisdiction.
- Emergency authority profile and crisis data-sharing template.
- Canonical geospatial boundary representation.
- Model validation levels and audit cadence.
- Governance amendment process for changing this locked contract.

## 15. Implementation Acceptance Criteria

Kernel contract package acceptance:

- Shared Zod and TypeScript contracts exist for the locked kernel objects, event envelope, permission checks, data stewardship, claims/evidence, governance hooks, ecological hooks, export envelope, and federation rule.
- Contract packages import no app code, ORM clients, auth SDKs, UI frameworks, queue clients, or provider SDKs.
- Domain packages depend inward on kernel contracts.
- Adapter contracts depend on contracts; contracts never depend on adapters.

Adapter acceptance:

- Each legacy adapter maps local rows to stable `ObjectRef` values.
- Round-trip tests resolve local row to object ref and object ref back to local row.
- Consequential writes go through command adapters.
- Authority is checked before persistence.
- Local row and canonical event are written transactionally where possible, or through an outbox with reconciliation where not possible.
- Unknown local subtypes are reported for review, not silently guessed.

Event and memory acceptance:

- Every consequential mutation emits a canonical event.
- Event rows cannot be updated or deleted where database enforcement is available.
- Corrections, redactions, reversals, and supersessions create new events.
- Events can replay the first vertical slice from observe through learn.
- Redacted stubs preserve continuity.

Authority acceptance:

- No decision, allocation, use-right grant, delegation, mandate, policy version, data disclosure, federation change, or commitment is created without authority refs.
- Delegations are scoped and revocable.
- Permission checks return allowed or denied, source refs, reason where safe, and appeal path where applicable.

Claim and evidence acceptance:

- Surplus, need, ecological state, model assumptions, and outcomes can be represented as claims with evidence.
- AI, sensor, and model outputs are visibly typed and cannot record binding decisions.
- Counterclaims, objections, and unresolved disagreement can be preserved.

Governance acceptance:

- Decision packets include authority, method, rationale, evidence, perspectives, scenarios, guardian review where required, unresolved objections, conditions, review date, appeal path, and event trail.
- Policy versions cite policy and decision source.
- Appeals and conflicts can target decision, model, evidence, allocation, use right, or process.

Stewardship and allocation acceptance:

- Need and offer can become request, match proposal, allocation, commitment, obligation, task, flow, outcome, and retrospective.
- Use rights are scoped, revocable, authority-backed, and linked to access rules.
- Ledger entries are append-only and reversible only through reversal entries.
- Contributions cannot create rankings, hidden scores, or portable status.

Ecological acceptance:

- A watershed, forest, aquifer, habitat, species, soil system, airshed, or bioregion can be represented as `LivingSystem`.
- Living systems can have guardians, indicators, thresholds, claims, evidence, reviews, and civic memory.
- Threshold breach can create or scope an issue.
- Guardian review is visible and contestable.
- Ecological context can alter coordination through review, constraints, conditions, policy triggers, or learning signals.

Data stewardship and federation acceptance:

- Sensitive objects carry visibility, data state, allowed uses, consent requirements, retention rules where applicable, export rules where applicable, and redaction behavior.
- Exports include object refs, schema versions, content hash, data stewardship agreements, event trail, local term mappings, and redaction summary.
- Imported or federated records preserve canonical mappings and local language.
- Forkability is tested with at least one exported decision packet and related event trail.

First vertical slice acceptance:

- The watershed-aware food resilience path can be implemented without introducing app-specific variants of identity, claims, events, governance, stewardship, allocation, or ecological context.
- A reviewer can start from threshold breach, school need, farm offer, decision, allocation, commitment, flow, or retrospective and trace the same canonical object graph and event trail.
- CommonCredit, ICOS, Sensemaking, and Stewardship appear only as source capabilities, legacy adapters, fixtures, or folded domain capabilities inside Canopy.

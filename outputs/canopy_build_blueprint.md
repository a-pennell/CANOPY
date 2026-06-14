# Canopy Build Blueprint

## 1. Executive Thesis

Canopy is a full cybernetic commons ecosystem: a governed, scoped, contestable object environment for observing reality, understanding claims, simulating tradeoffs, deliberating legitimately, coordinating commitments, acting within ecological limits, and learning from outcomes.

Canopy is not a stitched-together portfolio of CommonCredit, ICOS, Sensemaking, and Stewardship. Those projects become source bodies. They contribute proven concepts, code patterns, schemas, fixtures, and adapters. They do not survive as separate products, navigation worlds, ontology worlds, permission worlds, event logs, dashboards, or user-facing app identities.

The governing architecture is contract-first:

- One kernel contract for identity, authority, object references, claims, evidence, governance hooks, stewardship, allocation, data rights, civic memory, federation, and ecological context.
- One canonical object graph with stable `ObjectRef`s.
- One append-only civic memory for consequential change.
- One shell that exposes scopes, objects, attention, memory, decision packets, and capability surfaces.
- Multiple Canopy capabilities that operate on shared contracts rather than inheriting old project boundaries.
- Edge adapters for old projects, ORMs, providers, storage systems, imports, and federation partners.

The first build epoch proves the whole loop through a watershed-aware food resilience path:

```text
observe -> understand -> simulate -> deliberate -> coordinate -> act -> learn -> observe
```

The first slice is small in path length, not small in architectural ambition. It must prove that a farm surplus, a school procurement need, a watershed threshold breach, evidence review, guardian review, scenario comparison, a decision packet, allocation, commitments, food flow, outcome, retrospective, and export all operate as one Canopy system.

## 2. Non-Negotiable Principles

1. Canopy is the product. CommonCredit, ICOS, Sensemaking, and Stewardship are folded capability sources.
2. The kernel owns meaning. No module, adapter, ORM schema, UI route, or legacy project may redefine identity, authority, object references, claims, evidence, events, stewardship, allocation, governance, data rights, ecological hooks, or federation.
3. Every user-visible consequential object resolves to a canonical `ObjectRef`.
4. Every consequential mutation emits a canonical append-only `CanopyEvent`.
5. Every binding action cites authority through membership, role assignment, mandate, delegation, guardian appointment, policy, agreement, use right, or emergency authority with sunset and review.
6. Decision-relevant assertions are claims linked to evidence. AI output, model output, sensor data, imported records, and summaries are inputs to memory, not authority by themselves.
7. Stewardship is more fundamental than ownership. Ownership may be represented, but it cannot be the only legitimate relation to land, resources, data, infrastructure, or living systems.
8. Ecological context is mandatory when material coordination affects land, water, energy, food, waste, transport, procurement, infrastructure, or living systems.
9. Federation, export, forkability, consent, revocation, retention, redaction continuity, challenge, appeal, and review are baseline rights.
10. Contributions, care history, endorsements, credit behavior, and participation records must never become hidden eligibility, generalized reputation, social credit, or portable person scores.
11. Local language is preserved through `LocalTerm` and `CanonicalMapping`; local ontology fragmentation is not preserved.
12. Projections are read models. Authority comes from contracts, command handlers, object refs, events, decisions, policies, evidence, and data stewardship agreements.
13. The shell never asks users to know which old project a capability came from.
14. Corrections, reversals, redactions, revocations, appeals, and supersessions create new records and events. They do not destructively edit civic memory.
15. Canopy must remain replayable. A reviewer must be able to reconstruct a decision, allocation, use right, flow, outcome, export, or redaction from canonical refs and events.

## 3. System Architecture Overview

Canopy is a contract-enforced modular monolith with adapter boundaries and rebuildable projections.

The core layers are:

1. **Contracts**
   Serializable TypeScript and validation schemas for kernel objects, governance objects, domain objects, UI view models, adapter interfaces, events, fixtures, and test helpers. Contracts have no provider, ORM, UI framework, queue, storage, or legacy imports.

2. **Kernel Services**
   Canopy-native enforcement for identity, authority, object registry, permission evaluation, civic memory, data stewardship, relationship graph, federation, export, redaction, and replay.

3. **Capability Services**
   Domain services for claims and evidence, governance, commons registry, living systems, stewardship, allocation and accounting, flows, simulation and models, care coordination, and learning accountability. Capabilities own workflow logic; they do not own kernel meaning.

4. **Adapters**
   Translation boundaries for auth providers, databases, event stores, storage providers, geospatial systems, time-series systems, vector systems, document stores, federation transport, and legacy projects.

5. **Canonical Stores**
   Stable object-ref mappings, canonical mappings, append-only events, outbox, projection state, adapter audits, and source/import reports.

6. **Read Projections**
   Rebuildable views for object pages, civic memory, search, attention, authority, decision packets, resource stewardship, claims/evidence, accounting, federation export, and scope consoles.

7. **Workflows**
   Jobs, agents, schedulers, outbox dispatchers, import runners, replay workers, projection rebuilds, model audits, threshold checks, export builders, and reconciliation workers.

8. **Shells**
   User-facing surfaces: the main Canopy shell, an admin console, and a public export viewer. Shells are surfaces over shared contracts and projections, not independent apps.

The intended dependency direction is inward:

```text
apps/*
  -> ui packages
  -> projections
  -> capabilities
  -> kernel
  -> contracts

workflows
  -> capabilities
  -> kernel
  -> adapters
  -> contracts

adapters
  -> contracts
  -> provider SDKs or legacy clients
```

Forbidden dependencies:

- Contracts importing app code, ORM clients, auth SDKs, storage SDKs, UI frameworks, queues, provider clients, or legacy adapters.
- Kernel services importing legacy project implementations.
- Capabilities importing each other's private persistence models.
- Shell code writing directly to local ORM tables for consequential mutations.
- Legacy IDs crossing capability boundaries as authority.

## 4. Kernel Contracts Summary And Implementation Authority

The implementation authority is:

1. `outputs/canopy_locked_kernel_contracts.md`
2. `outputs/canopy_kernel_contract.md`
3. `outputs/canopy_contract_package_spec.md`
4. `outputs/canopy_ontology_map.md`
5. This build blueprint as the execution synthesis

Where artifacts overlap, the locked kernel contracts govern v0 meaning. This blueprint governs order of build and integration discipline.

The locked kernel includes these canonical object families:

- Actors and authority: `Person`, `Account`, `Organization`, `Membership`, `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`, `Credential`.
- Reality, commons, and ecology: `Place`, `Commons`, `LivingSystem`, `Resource`, `Stock`, `Flow`, `Indicator`, `Threshold`.
- Claims, evidence, and sensemaking: `Claim`, `Counterclaim`, `Evidence`, `Source`, `EvidenceLink`, `Perspective`, `AffectedGroup`, `Model`, `Assumption`, `Scenario`.
- Governance and memory: `Issue`, `Proposal`, `Decision`, `Agreement`, `Policy`, `Appeal`, `Conflict`, `Audit`, `Retrospective`.
- Coordination, allocation, and action: `Need`, `Capability`, `Request`, `Offer`, `Commitment`, `Allocation`, `Obligation`, `UseRight`, `Project`, `Routine`, `Task`, `Contribution`, `Outcome`, `LedgerAccount`, `LedgerEntry`, `Budget`, `Treasury`.
- Data, federation, and local language: `DataStewardshipAgreement`, `AccessRule`, `FederationRule`, `Taxonomy`, `LocalTerm`, `CanonicalMapping`.

The canonical cross-module reference is `ObjectRef`. Legacy IDs, database IDs, provider IDs, local slugs, and route params may exist, but they are not cross-module identity.

The canonical event envelope is `CanopyEvent`. It must include object refs, related refs, authority refs, source capability, schema version, visibility, data state when relevant, and redaction or supersession continuity.

The minimum event namespaces are:

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

Permission checks use a common request/result shape and must be explainable where safe. No decision, allocation, use-right grant, delegation, mandate, policy version, data disclosure, federation change, threshold change, model adoption, stewardship change, or binding commitment validates without authority refs.

## 5. Monorepo And Package Architecture Summary

The monorepo exists to enforce Canopy coherence in code.

Authoritative package layout:

```text
apps/
  canopy-shell/
  admin-console/
  public-export-viewer/

packages/
  contracts/
    kernel/
    governance/
    domain/
    ui/
    adapters/
    testing/

  kernel/
    identity-authority/
    object-registry/
    permission-evaluator/
    civic-memory/
    data-stewardship/
    federation/

  capabilities/
    claims-evidence/
    governance/
    commons-registry/
    living-systems/
    stewardship/
    allocation-accounting/
    flows/
    simulation-models/
    care-coordination/
    learning-accountability/

  projections/
    object-page/
    civic-memory/
    authority/
    claim-evidence/
    decision-packet/
    resource-stewardship/
    accounting/
    federation-export/
    search/

  adapters/
    auth/
    database/
    event-store/
    storage/
    legacy/

  database/
    schema-contracts/
    migrations/
    seeds/
    import-plans/
    migration-runners/

  workflows/
    agents/
    jobs/
    schedulers/
    outbox/

  ui/
    design-system/
    object-page/
    governance/
    commons/
    claims-evidence/
    allocation-accounting/
    flows/
    living-systems/

  evaluation/
    contract-fixtures/
    adapter-conformance/
    migration-fixtures/
    replay-tests/
    architecture-rules/

tools/
  codegen/
  dependency-checks/
  migration-audits/
  fixture-builders/

docs/
  architecture/
  decisions/
  migration/
  capability-manifests/
```

Package authority:

- `packages/contracts/*` defines meaning and validation.
- `packages/kernel/*` enforces shared Canopy behavior.
- `packages/capabilities/*` implements domain workflows over kernel contracts.
- `packages/adapters/*` translates external systems and old projects.
- `packages/projections/*` produces rebuildable shell views.
- `packages/workflows/*` executes jobs, agents, replay, imports, audits, and exports.
- `packages/ui/*` implements reusable shell components and capability surfaces.
- `packages/evaluation/*` proves conformance, replay, migration parity, and anti-fragmentation rules.

## 6. Unified Shell And Product Architecture Summary

The first Canopy shell is the user-facing expression of the kernel. It is a scoped civic and ecological operating surface, not a dashboard wrapper and not a module launcher.

The shell has these invariants:

- One global identity and authority model.
- One global scope switcher.
- One global object search.
- One attention inbox.
- One civic memory surface.
- One universal object page grammar.
- One permission explanation pattern.
- One data stewardship pattern.
- One federation and export pattern.
- No old product names in primary navigation, object categories, roles, or capability labels.
- No consequential action without authority context, data stewardship context, and civic memory result.

Primary shell modes:

- Home
- Search
- Attention
- Map
- Graph
- Lists
- Civic Memory
- Capabilities

Capability entry points:

- Reality Map
- Commons Registry
- Living Systems
- Needs and Capabilities
- Claims and Evidence
- Deliberation
- Agreements and Policies
- Allocation and Accounting
- Flows
- Simulation and Models
- Care Coordination
- Learning and Accountability
- Federation

Universal object pages must show:

- Object identity, canonical type, local term, scope chips, lifecycle state, visibility, data state, federation state, and primary actions.
- Relationships and authority.
- Claims, evidence, counterclaims, perspectives, and review status.
- Governance hooks, issues, proposals, decisions, agreements, policies, appeals, and conflicts.
- Commitments, obligations, allocations, use rights, tasks, flows, outcomes, and learning.
- Ecological context when relevant.
- Civic memory events, including redacted stubs.
- Data stewardship, export, federation, retention, consent, and redaction rules.

The shell starts from scope:

```text
Where am I acting?
With whom?
Under which authority?
Under which data rules?
Which objects, claims, decisions, commitments, thresholds, and outcomes require attention?
```

## 7. Capability Architecture

Capabilities are Canopy organs. Each capability must declare cybernetic phases, owned object types, consumed object types, emitted event types, governance hooks, ecological hooks, export support, and adapter dependencies.

### Stewardship

Purpose: Govern resources, commons, use rights, access rules, routines, tasks, contributions, maintenance, policies, and care of shared capacities.

Primary objects:

- `Commons`
- `Resource`
- `UseRight`
- `AccessRule`
- `Routine`
- `Task`
- `Contribution`
- `Policy`
- `Flow`
- `Outcome`

Rules:

- Stewardship does not mean ownership.
- Use rights are scoped, revocable, authority-backed, condition-aware, and reviewable.
- Maintenance and contribution records preserve care and accountability without ranking people.
- Material resource actions expose ecological hooks.

### Sensemaking

Purpose: Make decision-relevant knowledge explicit, contestable, sourced, reviewable, and connected to action.

Primary objects:

- `Source`
- `Evidence`
- `EvidenceLink`
- `Claim`
- `Counterclaim`
- `Perspective`
- `AffectedGroup`
- `Issue`
- `Assumption`

Rules:

- Claims can be accepted for a purpose without becoming universal truth.
- Evidence supports, challenges, contextualizes, qualifies, or supersedes claims.
- AI, imported, model-derived, and sensor-derived claims require human review before becoming decision-ready.
- Disagreement is preserved through counterclaims, objections, appeals, and data stewardship rules.

### Allocation

Purpose: Coordinate needs, capabilities, requests, offers, commitments, allocations, obligations, budgets, treasury, and optional accounting.

Primary objects:

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

Rules:

- Mutual credit is one accounting method, not the economic ontology.
- Allocation requires authority and cites decision, policy, agreement, mandate, or emergency authority.
- Ledger entries are append-only and reversed by new entries.
- Settlement is subordinate to commitments, obligations, allocation, and governance.

### Governance

Purpose: Make decisions legitimate, inspectable, contestable, reversible where appropriate, and learnable.

Primary objects:

- `Issue`
- `Proposal`
- `Decision`
- `Agreement`
- `Policy`
- `Appeal`
- `Conflict`
- `DecisionPacket`
- `Vote`
- `ConsentSignal`
- `QuorumState`

Rules:

- Votes and consent signals are process artifacts, not decisions.
- Decisions cite issues or proposals, authority refs, claims/evidence, perspectives, unresolved objections, rationale, conditions, obligations, review date, appeal path, data stewardship, and event trail.
- Policy versions are authorized through decisions.
- Guardian review is visible and contestable.

### Ecological Modeling

Purpose: Represent living systems, indicators, thresholds, model assumptions, scenarios, ecological constraints, and learning from material outcomes.

Primary objects:

- `LivingSystem`
- `Indicator`
- `Threshold`
- `Guardian`
- `Model`
- `Assumption`
- `Scenario`
- `ModelOutput`
- `Flow`
- `Outcome`

Rules:

- Living systems are first-class objects.
- Thresholds are classified as advisory, governance-triggering, or binding.
- Binding thresholds constrain action only when adopted through legitimate policy or agreement.
- Scenarios and model outputs are evidence for deliberation, not decisions.
- Material coordination must expose ecological claims, limitations, affected living systems, and guardian review requirements.

### Federation

Purpose: Support governed export, forkability, shared records, local autonomy, conflict-aware reconciliation, and exit.

Primary objects:

- `FederationRule`
- `ExportEnvelope`
- `CanonicalMapping`
- `LocalTerm`
- `DataStewardshipAgreement`
- `CanopyEvent`

Rules:

- Exports include object refs, schema versions, event trail, data stewardship agreements, local mappings, content hash, and redaction summary.
- Local terms travel with canonical mappings.
- Defederation preserves local records.
- Conflicting imports preserve both records or require governance according to the federation rule.

### AI Assistance

Purpose: Assist with extraction, summarization, scenario drafting, review preparation, translation, search, and memory navigation without becoming authority.

Allowed AI roles:

- Draft claims from sources.
- Suggest evidence links.
- Summarize civic memory with visibility inheritance.
- Compare scenarios and surface assumptions.
- Draft decision packet sections for human review.
- Identify missing perspectives or stale evidence.
- Help users search, navigate, translate local terms, and prepare exports.

Hard boundaries:

- AI cannot record binding decisions.
- AI cannot grant use rights, allocations, mandates, delegations, memberships, data disclosures, or federation changes.
- AI cannot mark its own claim as accepted.
- AI cannot produce hidden scores, rankings, eligibility lists, or reputation profiles.
- AI outputs inherit the most restrictive relevant visibility and must carry provenance, limitations, and review state.

## 8. Data Architecture And Adapter Approach

Canopy data architecture distinguishes canonical meaning, local persistence, civic memory, projections, documents, and import evidence.

Core stores or equivalents:

- Object registry and `ObjectRefMap`.
- Canonical mappings and local terms.
- Append-only `canopy_events`.
- Outbox and reconciliation records.
- Projection state.
- Adapter audit records.
- Relational workflow tables.
- Document and object storage.
- Geospatial boundaries.
- Time-series indicators and flows.
- Search and optional vector indexes.

Adapters do four jobs:

1. Map local ORM rows to canonical Canopy objects.
2. Emit canonical events for consequential changes.
3. Maintain object-reference mappings between local IDs and `ObjectRef`s.
4. Hydrate projections so shell views query canonical views without preserving old app surfaces.

The adapter interface must support:

- `resolveObjectRef(local)`
- `resolveLocalObject(ref)`
- `readCanonicalObject(ref)`
- `writeCommand(command)`
- `appendEvent(event)`
- `listEvents(query)`
- `rebuildProjection(projection, scope)`
- `validateMappings(scope)`

Adapter rules:

- Contracts are above ORMs.
- Prisma and Drizzle may persist different local shapes, but they must not define competing meanings.
- Consequential writes use command adapters.
- Authority is checked before persistence.
- Local row and canonical event are written transactionally where possible.
- Cross-store writes use an outbox.
- Undispatched consequential events are reconciliation failures.
- Unknown local subtypes are reported for review, not guessed.
- Sensitive imports default restrictive until reviewed.
- Legacy events import as canonical events with importer metadata.

Local ORMs may own draft workflow state, implementation artifacts, caches, processing state, and domain-specific status machines. They may not alone own identity, authority, canonical object identity, binding decisions, claims/evidence, allocations, use rights, ledger entries, civic memory, data stewardship, export, or federation.

## 9. Event Architecture And Cybernetic Feedback Loops

The event architecture is the nervous system of Canopy. It makes the ecosystem replayable, auditable, exportable, contestable, and capable of learning.

Every consequential mutation produces a canonical event. Civic memory is append-only. Corrections, reversals, redactions, revocations, supersessions, imports, reconciliations, and appeals are new events.

The feedback loop is:

```text
Observe
  Source ingestion, condition updates, ledger postings, flow records, sensor readings, and field notes become claims, evidence, indicators, flows, or events.

Understand
  Claims, counterclaims, evidence, perspectives, affected groups, local terms, model assumptions, and data states become reviewable.

Simulate
  Models, assumptions, scenarios, and outputs are generated as evidence with limitations, uncertainty, affected refs, and contestability.

Deliberate
  Issues, proposals, objections, amendments, guardian reviews, affected-party analysis, and decision packets become governance records.

Coordinate
  Requests, offers, matches, commitments, allocations, obligations, tasks, use rights, budgets, and agreements cite authority and policies.

Act
  Resource updates, food flows, transport flows, waste flows, maintenance, contributions, ledger entries, and task completions write civic memory.

Learn
  Outcomes, audits, retrospectives, model audits, threshold updates, policy reviews, appeals, supersessions, and exports feed back into object state.
```

The first slice must emit an event chain that includes identity, authority, stewardship, ecology, evidence, claims, coordination, governance, model, allocation, flow, learning, and federation families.

Minimum memory guarantees:

- Events reference canonical objects.
- Binding events include authority refs.
- Private or sealed records preserve envelope continuity through redacted stubs.
- Redactions preserve the existence, timing, type, authority, and continuity of events where safe.
- Event replay rebuilds the first build epoch projections.
- Export bundles carry event trails and data stewardship agreements.

## 10. Fold-In Strategy For CommonCredit, ICOS, Sensemaking, And Stewardship

The fold-in strategy is extract, wrap, rewrite, retire, and defer.

### CommonCredit

Canopy destination: Allocation, Accounting, Coordination, and conflict support.

Extract:

- Double-entry ledger invariants.
- Append-only ledger entries and reversal-by-offset.
- Offers and needs.
- Commitments, invoices, transactions, treasury allocations, project tasks, and disputes.
- Credit-limit governance patterns.

Wrap:

- `Offer` to `Offer` and sometimes `Capability`.
- `Need` to `Need` and sometimes `Request`.
- `Invoice` to settlement request.
- `Transaction` to fulfillment or settlement artifact.
- `LedgerEntry` to canonical `LedgerEntry`.
- `CreditLimitRequest` to governed use-right change request.
- `Dispute` to `Conflict` with linked claims, evidence, decision, and ledger refs.

Rewrite later:

- Native ledger service.
- Mutual-credit accounting policy configuration.
- Settlement workflow.
- Accounting reports as learning artifacts.

Retire or block:

- Reputation as root object.
- Portable endorsement or hidden eligibility surfaces.
- Direct credit-limit mutation without governance.
- Identity `Account` and accounting `LedgerAccount` confusion.

### ICOS

Canopy destination: Governance, civic memory, federation, living systems, flows, and protocol reference.

Extract:

- Attention -> perspecting -> integration -> decision -> memory protocol.
- Revocable delegation schema.
- Decision records with rationale, unresolved objections, review dates, and supersession.
- Append-only civic memory enforcement pattern.
- Export bundle and content hash pattern.
- Guardian, ecological annotation, surplus/shortage, allocation consent, forkability, exit, due process, and non-capture principles.

Wrap:

- `Issue` to `Issue`.
- `Perspective` to `Perspective`.
- `Delegation` to `Delegation`.
- `DecisionRecord` to `Decision` plus `DecisionPacket`.
- `TimelineEvent` to `CanopyEvent`.
- `Space` to `Organization`, `Commons`, or governance scope.
- `Neighborhood` to `Place`.
- `SurplusShortageDeclaration` to `Offer` or `Request` plus `Claim`.
- `AllocationProposal` to `Proposal` plus candidate `Allocation`.

Rewrite later:

- Native governance service.
- Decision packet service.
- Delegation service.
- Export/federation service.
- Guardian review workflow.

Retire or defer:

- ICOS as a universal product surface.
- Municipal-scale workflows before the first domain loop works.
- Hard-coded constitutional rules except kernel invariants.

### Sensemaking

Canopy destination: Claims, evidence, issue interpretation, review, and learning.

Extract:

- Claim lifecycle: pending, accepted, rejected, contested, superseded, preserved.
- Claim types: fact, causal, value, assumption, preference, risk, impact, need, capability.
- Source ingestion structure.
- Human acceptance rule.
- Stakeholder affectedness model as `AffectedGroup`.

Wrap:

- `Issue` to `Issue`.
- `Source` to `Source` and extracted `Evidence`.
- `Claim` to `Claim`.
- `StakeholderGroup` to `AffectedGroup`.
- `Theme` to artifact.
- `Contribution` to `Perspective`, `EvidenceLink`, or `Contribution` depending on content.

Rewrite later:

- Native evidence ingestion.
- Native claim review.
- Counterclaim and contestability workflow.
- AI extraction with provenance, confidence, limitations, visibility, and review.

Retire or block:

- Ungoverned AI extraction as canonical truth.
- Theme clusters as root kernel objects.
- Simplistic source credibility as person or institution score.
- Issue-only claims.

### Stewardship

Canopy destination: Commons registry, resources, use rights, access rules, policies, routines, tasks, contributions, and flows.

Extract:

- Resource registry.
- Resource condition updates.
- Access/use-right schema.
- `can(actorRef, action, objectRef, context)` rights shape.
- Policy and policy-version model.
- Maintenance tasks and recurrence.
- Stewardship assignments.
- Food-flow chain.
- RLS-oriented community context rule.

Wrap:

- `Community` to `Organization`, `Commons`, or `Place`.
- `Resource` to `Resource`, `Commons`, or `LivingSystem`.
- `AccessRight` to `UseRight` plus `AccessRule`.
- `ResourceConditionUpdate` to `Claim`, `Indicator`, and event.
- `ResourceDocument` to `Source` or `Evidence`.
- `PolicyVersion` to policy artifact tied to `Policy` and `Decision`.
- `MaintenanceTask` to `Task` under `Routine` or `Project`.
- `FoodFlow` to `Flow`.

Rewrite later:

- Native commons/resource service.
- Native use-right/access-rule service.
- Routine and maintenance service.
- Policy versioning service.
- Food-flow service.

Retire or block:

- SaaS tenant ontology as product ontology.
- Contribution dashboards that imply ranking.
- Permission-only rights model.
- Policy changes without decision linkage.

## 11. First Vertical Slice And Why It Proves The Ecosystem

The first vertical slice is a watershed-aware food resilience path.

Working path:

```text
Riverbend Foodshed Commons coordinates surplus produce from Green Acre Farm to Northside School Kitchen during a summer meal shortage. The route crosses the Mill Creek Watershed, where a nitrate threshold breach has been recorded. The commons has a standing policy requiring guardian review and an explicit decision record for food-flow interventions affected by the breach.
```

The slice proves Canopy because it exercises:

- Identity, membership, roles, mandates, delegation, and guardian appointment.
- Commons, place, living system, resource, stock, flow, indicator, and threshold objects.
- Claims and evidence for surplus, need, ecological state, assumptions, and outcomes.
- Scenario generation with ecological constraints.
- Governance through issue, perspective, proposal, guardian review, decision packet, decision, appeal path, and policy review.
- Coordination through need, request, offer, allocation, commitment, obligation, use right, task, contribution, flow, and outcome.
- Event replay from observation through learning.
- Data stewardship and redacted continuity.
- Export and forkability with content hash, schema versions, event trail, local mappings, and stewardship rules.
- A single shell surface with object pages and no legacy app navigation.

Minimum happy-path event chain:

```text
identity.organization.created
identity.membership.activated
authority.role.assigned
authority.mandate.granted
authority.guardian.appointed
stewardship.resource.created
ecology.living_system.created
ecology.threshold.created
evidence.source.ingested
evidence.created
claim.created
claim.reviewed
coordination.need.created
coordination.request.created
coordination.capability.created
coordination.offer.created
ecology.indicator.recorded
ecology.threshold.breached
governance.issue.created
governance.issue.scoped
governance.perspective.submitted
model.assumption.added
model.scenario.created
model.output.generated
governance.proposal.created
governance.proposal.opened
ecology.guardian.review_requested
ecology.guardian.review_completed
governance.decision.recorded
allocation.created
coordination.commitment.created
allocation.obligation.created
stewardship.use_right.granted
stewardship.task.created
stewardship.task.completed
flow.food.recorded
coordination.commitment.fulfilled
learning.outcome.recorded
learning.retrospective.completed
federation.export.created
```

The slice is complete only if non-happy paths also write events: contested surplus, restricted school need, outdated sensor reading, guardian objection, proposal amendment, decision appeal, partial fulfillment, excess waste, incorrect model assumption, and redacted federation export.

## 12. Implementation Phases For The Full Ecosystem

These phases describe full-system build order. They are not product-minimization phases.

### Phase 1: Contract Lock And Guardrails

Build the monorepo skeleton, contract packages, architecture rules, schema validators, golden fixtures, and versioning rules. Contracts must compile and test without app, ORM, provider, queue, storage, or legacy imports.

### Phase 2: Kernel Services And Canonical Stores

Implement identity/authority, object registry, permission evaluator, data stewardship, civic memory, event append, relationship graph, federation envelope, redaction continuity, and replay primitives.

### Phase 3: Adapter Foundation And Migration Evidence

Implement adapter contracts, conformance harnesses, canonical database shapes, import-plan templates, object-ref mapping runner, outbox, adapter audit records, and source noun classification for all four projects.

### Phase 4: Claims, Stewardship, Governance, And Ecology Core

Build the first native services for claims/evidence, commons/resource/use rights, governance/decision packets, living systems/indicators/thresholds, and model/scenario packets. Activate only through Canopy contracts.

### Phase 5: Shell Core And Universal Object Pages

Build the Canopy shell frame, scope switcher, object search, attention inbox, civic memory, command palette, object page grammar, decision packet views, permission explanations, data stewardship UI, federation/export UI, and local-term rendering.

### Phase 6: Legacy Capability Wrappers

Wrap Stewardship and Sensemaking first for resources, use rights, policies, food flows, sources, claims, issues, perspectives, and review. Then wrap ICOS for decision packets, delegation, civic memory, export, guardian review, and surplus/shortage. Then wrap CommonCredit for needs, offers, commitments, ledger invariants, disputes, treasury, and accounting artifacts.

### Phase 7: First Full Cybernetic Slice

Run the Riverbend Foodshed Commons path through contracts, services, adapters, projections, shell, events, data stewardship, and export. Prove replay from observe through learn.

### Phase 8: Native Service Rewrite And Legacy Retirement

Rewrite wrapped behavior into native Canopy services after mapping coverage, event parity, authority enforcement, data stewardship, projection replay, and shell integration are proven. Retire legacy concepts and route surfaces as soon as they no longer carry necessary implementation value.

### Phase 9: Federation, Learning, And Multi-Scope Expansion

Expand governed federation, export/import reconciliation, model audits, learning loops, policy review automation, ecological domains, care coordination safeguards, cross-scope coordination, and bioregional planning.

### Phase 10: Ecosystem Hardening

Harden privacy, redaction, append-only enforcement, replay performance, adapter conformance, accessibility, auditability, governance amendment process, emergency authority profiles, retention policies, security, and operational maintenance.

## 13. Ordered First 60 Implementation Tasks

1. Create the monorepo skeleton with workspace config, TypeScript base config, test config, dependency rules, and package exports.
2. Scaffold `packages/contracts/kernel`, `governance`, `domain`, `ui`, `adapters`, and `testing`.
3. Add dependency checks blocking provider, ORM, app, UI framework, queue, storage, and legacy imports from contracts.
4. Implement contract versioning primitives, schema version fields, validation error contracts, and canonical package export rules.
5. Implement `ObjectRef`, canonical object type enum, capability enum, lifecycle status, and local-source pointer contracts.
6. Implement identity contracts: `Person`, `Account`, `Organization`, `Membership`, `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`, `Credential`.
7. Implement permission contracts: `PermissionAtom`, `AccessRule`, `PermissionCheckRequest`, `PermissionCheckResult`, denial reason, and appeal path refs.
8. Implement data stewardship contracts: visibility, data state, allowed uses, prohibited uses, consent, retention, export rules, federation rules, redaction metadata.
9. Implement claims/evidence contracts: `Claim`, `Counterclaim`, `Source`, `Evidence`, `EvidenceLink`, review states, evidence types, provenance, and contestability.
10. Implement event contracts: `CanopyEvent`, event namespace constants, minimum event type constants, authority validation, redaction continuity, and supersession pointers.
11. Implement federation and export contracts: `CanopyExportEnvelope`, `FederationRule`, content hash fields, local mappings, and redaction summary.
12. Implement governance contracts for issues, perspectives, proposals, amendments, objections, decisions, decision packets, agreements, policies, policy versions, appeals, conflicts, votes, consent signals, and quorum state.
13. Implement domain contracts for places, commons, living systems, resources, stocks, flows, indicators, thresholds, guardian reviews, ecological hooks, models, assumptions, scenarios, and model outputs.
14. Implement coordination contracts for needs, capabilities, requests, offers, commitments, allocations, obligations, use rights, ledger accounts, ledger entries, budgets, treasuries, routines, tasks, contributions, outcomes, audits, and retrospectives.
15. Implement taxonomy contracts for `Taxonomy`, `LocalTerm`, `CanonicalMapping`, alias disposition, and local label rendering.
16. Add golden fixtures for identity, authority, claims/evidence, governance, stewardship, allocation/accounting, ecology, event, export, redaction, and federation.
17. Add invariant tests for identity/account separation, membership/authority separation, ledger account/auth account separation, use-right scope, event append rules, and AI non-authority.
18. Implement adapter contracts for auth, persistence, event store, object graph, document storage, object storage, geospatial, time-series, vector, federation transport, and legacy projects.
19. Implement adapter conformance harness for object-ref round trip, command write, event append, projection rebuild, mapping validation, unknown subtype reporting, and outbox reconciliation.
20. Create canonical database shapes for `canopy_object_ref_map`, `canopy_canonical_mappings`, `canopy_events`, `canopy_outbox`, `canopy_projection_state`, and `canopy_adapter_audit`.
21. Implement append-only event-store adapter with database-level insert/select-only enforcement where available.
22. Implement outbox dispatcher contracts, reconciliation records, failed-event handling, and replay idempotency checks.
23. Create import-plan templates for CommonCredit, ICOS, Sensemaking, and Stewardship.
24. Inventory and classify source nouns from all four projects as `KEEP`, `MERGE`, `SUBTYPE`, `ALIAS`, `ARTIFACT`, `RETIRE`, or `VALUE`.
25. Define data stewardship defaults for each source table and sensitive field class.
26. Build the object-ref mapping runner with stable ID generation, source pointers, supersession, and idempotency tests.
27. Implement kernel object registry service and relationship graph service.
28. Implement identity and authority service with role assignment, mandate, delegation, guardian, revocation, and authority trace support.
29. Implement permission evaluator with explainable results and safe denial behavior.
30. Implement civic memory service for event validation, append, read, redaction stub, supersession, and replay.
31. Implement data stewardship service for visibility inheritance, consent checks, retention metadata, export rules, and redaction previews.
32. Implement projection infrastructure with rebuild state, replay cursor, fixture snapshots, and stale-projection warnings.
33. Implement object-page projection for universal object headers, relationships, claims, governance, stewardship, commitments, ecology, memory, data rules, and federation.
34. Implement civic-memory projection with filters by scope, object, actor, event family, visibility, redaction, and export readiness.
35. Implement authority projection showing membership, roles, mandates, delegations, guardianship, policies, use rights, and appeal paths.
36. Implement claims/evidence service for source ingestion, claim creation, evidence linking, review, contestation, counterclaim, and AI draft status.
37. Implement claim/evidence projection for object pages, issue packets, decision packets, and search.
38. Implement stewardship service for commons, resources, use rights, access rules, policies, routines, tasks, contributions, and condition updates.
39. Implement resource-stewardship projection for resource pages, commons pages, routines, use-right state, policies, tasks, flows, and memory.
40. Implement governance service for issue scoping, proposal creation, amendment, objection, guardian review, decision recording, policy versioning, appeal, and conflict.
41. Implement decision-packet projection with authority refs, claims/evidence, scenarios, guardian review, rationale, objections, conditions, obligations, appeal path, data rules, and event trail.
42. Implement living-systems service for living system objects, indicators, thresholds, threshold classes, guardian review requirements, and ecological hooks.
43. Implement model/scenario service for model packets, assumptions, scenarios, outputs, limitations, uncertainty, and model-derived evidence.
44. Implement allocation/accounting contracts service surface for needs, offers, requests, commitments, allocations, obligations, and ledger entry validation.
45. Implement flow service for food, transport, waste, water-use, material, and outcome-linked flow records.
46. Implement learning service for outcomes, audits, retrospectives, policy review triggers, model audit records, and issue reopen events.
47. Build the Canopy shell frame with global header, scope switcher, object search, attention inbox trigger, civic memory trigger, command palette trigger, and user/session menu.
48. Build universal object page UI against projections, including local terms, authority, data state, visibility, federation state, and memory result previews.
49. Build command preview UI that shows object mutation, authority source, data visibility effect, claims/evidence touched, event to be written, appeal/review path, and federation/export impact.
50. Build attention inbox for role-required work, review-required work, stewardship work, governance work, ecological threshold work, data stewardship work, and learning work.
51. Build map/graph/list triad over the same object query model.
52. Build decision packet UI and governance workspaces for issue, proposal, guardian review, decision, appeal, and conflict.
53. Build data stewardship and redaction UI patterns for visibility, consent, retention, redacted stubs, export preview, and restricted evidence.
54. Build federation/export UI for envelope preview, content hash, local mappings, data stewardship agreements, event trail, redaction summary, and import warnings.
55. Implement Stewardship legacy adapter fixtures for community, resource, access right, policy, policy version, maintenance task, contribution, decision, and food-flow rows.
56. Implement Sensemaking legacy adapter fixtures for issue, source, claim, stakeholder group, theme, contribution, review state, and AI extraction rows.
57. Implement ICOS legacy adapter fixtures for issue, perspective, delegation, decision record, timeline event, referendum, export bundle, guardian review, and surplus/shortage declaration rows.
58. Implement CommonCredit legacy adapter fixtures for organization, member, ledger account, ledger entry, offer, need, invoice, credit-limit request, dispute, treasury allocation, and project task rows.
59. Run the Riverbend Foodshed Commons path end to end through threshold breach, need, offer, claim/evidence, scenario, proposal, guardian review, decision, allocation, use right, commitment, task, flow, outcome, retrospective, and export.
60. Produce the first fold-in validation report covering mapping coverage, event coverage, authority coverage, data stewardship coverage, replay parity, shell leakage, ecological hooks, federation readiness, and unresolved risks.

## 14. Decision Log And Open Decisions

### Locked Decisions

1. Canopy is contract-first and Canopy-first.
2. Existing projects become folded capability sources, not product surfaces.
3. The v0 canonical object graph is organized by the cybernetic loop.
4. Cross-module references use `ObjectRef`.
5. Consequential mutations emit canonical append-only `CanopyEvent`s.
6. Identity `Account` and accounting `LedgerAccount` are distinct.
7. Authority flows through membership, role assignment, mandate, delegation, guardian appointment, policy, agreement, use right, or bounded emergency authority.
8. Decision-relevant assertions are claims linked to evidence.
9. AI, model, sensor, and imported outputs are non-binding until reviewed.
10. Living systems, indicators, thresholds, and guardian review are kernel concerns where material coordination is involved.
11. Federation, export, forkability, redaction continuity, retention, consent, challenge, and review are baseline contract rights.
12. Contributions and accounting history cannot become hidden scores or generalized reputation.
13. Old project names are allowed in adapters, fixtures, migration reports, source notes, and documentation history only.

### Open Decisions

1. Canonical ID generation format: UUID, ULID, CUID, DID, or hybrid.
2. Exact package names, npm scope, and SemVer release process.
3. Exact payload schema for every event type.
4. Whether `DecisionPacket`, `GuardianReview`, `ModelOutput`, and `CareHold` remain artifacts or become root object types.
5. Minimum database-level append-only enforcement for non-Postgres stores.
6. Provider choices for auth, ORM, queues, object storage, document storage, geospatial, time-series, vector, and search.
7. Federation reconciliation protocol and cryptographic signing approach.
8. Retention and deletion policy by jurisdiction.
9. Emergency authority profile and crisis data-sharing template.
10. Canonical geospatial boundary representation.
11. Model validation levels and audit cadence.
12. Governance amendment process for changing locked kernel contracts.
13. Exact shell routing framework and deployment topology.
14. Legal enforceability model for agreements, mandates, use rights, and data stewardship agreements.
15. Confidential care coordination schema and sealed-event handling.

## 15. Risks And Anti-Fragmentation Safeguards

| Risk | Failure mode | Safeguard |
| --- | --- | --- |
| Four apps inside one shell | Old route groups, nav tabs, dashboards, and permissions survive | Primary shell uses Canopy modes, object pages, and capability labels only |
| Product ontology survives | `Member`, `Community`, `Space`, `Account`, or `Role` reappear as canonical roots | Noun disposition and canonical mapping required before projection |
| ORM schemas define meaning | Prisma or Drizzle models become de facto contracts | Contracts live only in contract packages; ORMs sit behind adapters |
| Event memory fragments | Local audit logs remain authoritative | Every consequential mutation writes canonical civic memory |
| Governance bypass | Admin tools mutate rights, policy, allocations, credit limits, or data visibility | Command handlers require permission result and authority refs |
| AI becomes authority | Summaries, extracted claims, or model outputs drive decisions directly | AI output remains draft, evidence, or model-derived until reviewed |
| Reputation leakage | Contributions, endorsements, credit behavior, or task history become rankings | Preserve contextual records only; prohibit generalized scores |
| Stewardship becomes SaaS tenant app | Community naming and active-org metrics drive product ontology | Map to organization, commons, place, scope, and local terms |
| ICOS constitutional overreach | One governance profile becomes universal law | Keep profiles configurable; hard-code only kernel invariants |
| Ecology becomes decoration | Indicators are shown but do not affect governance or coordination | Material workflows require ecological hooks and threshold behavior |
| Accounting dominates coordination | Mutual credit becomes the economic ontology | Accounting remains one method under commitment, allocation, and governance |
| Projections become authority | Cached views enable direct writes | Writes route through command services and cite source refs |
| Sensitive data leaks | Search, export, AI summary, or memory view reveals protected data | Visibility inheritance, redacted stubs, export previews, stewardship agreements |
| Federation fragments meaning | Remote systems exchange records without mappings | Exports include schema versions, local mappings, and data stewardship rules |
| Complexity stalls execution | The full ecosystem becomes too broad to build coherently | First build epoch proves one whole loop with contract enforcement |

## 16. Definition Of Done For The First Build Epoch

The first build epoch is done when a reviewer can verify all of the following:

1. Contract packages build and validate without app, ORM, auth, provider, UI, queue, storage, or legacy imports.
2. Architecture rules prevent forbidden dependencies.
3. The locked kernel objects, event envelope, permission checks, data stewardship, claims/evidence, governance hooks, ecological hooks, export envelope, and federation rule exist as shared contracts.
4. Legacy source nouns are classified and mapped with dispositions.
5. Every source project has an adapter home, import plan, mapping report, and data stewardship defaults.
6. Source rows can resolve to stable `ObjectRef`s and back to local rows in tests.
7. Unknown local subtypes are reported for review.
8. Consequential command adapters validate authority, data stewardship, object refs, and event emission.
9. Canonical event store supports append-only memory and redaction continuity.
10. Civic memory can replay the Riverbend path from observe through learn.
11. Universal object pages hydrate from Canopy projections, not legacy pages.
12. The shell contains no primary navigation, route names, object categories, permission names, or role names from CommonCredit, ICOS, Sensemaking, or Stewardship.
13. A user can start from the Mill Creek threshold breach and find the food allocation decision it affected.
14. A user can start from the school meal need and find claims, evidence, proposal, allocation, commitments, tasks, food flows, and outcome.
15. A user can start from the farm surplus offer and see what was allocated, what remained, and what evidence supported it.
16. A user can inspect the authority behind the decision, allocation, use rights, commitments, and export.
17. The watershed guardian recommendation is visible, contestable, and connected to the decision packet.
18. Unresolved objections are preserved according to data stewardship rules.
19. Sensitive surplus, school need, ecological site, contribution, and retrospective data have explicit visibility, data state, consent, retention, export, and redaction behavior.
20. The decision packet and event trail can be exported with schema versions, content hash, local mappings, data stewardship agreements, and redaction summary.
21. Non-happy paths create new events rather than destructive edits.
22. The fold-in validation report shows mapping coverage, event coverage, authority coverage, data stewardship coverage, replay parity, shell leakage status, ecological hook coverage, and federation readiness.

## 17. Appendix: Artifact Map And How To Use Each Source Document

### `outputs/cybernetic_commons_prd.md`

Use as the full ecosystem scope document. It defines the ambition, user types, modules, workflows, data principles, governance architecture, ecological architecture, simulation architecture, economic coordination, commons lifecycle, risks, roadmap, and acceptance criteria. It is the source for the overall Canopy purpose and cybernetic loop.

### `outputs/canopy_ecosystem_unification_plan.md`

Use as the Canopy-first integration doctrine. It establishes that old projects become organs of one system, not adjacent apps. It supplies the shared capability labels, shell requirements, event/memory unification, and anti-fragmentation direction.

### `outputs/project_integration_analysis.md`

Use as the evidence base for what to extract, adapt, and defer from CommonCredit, ICOS, Sensemaking, and Stewardship. It identifies reusable assets and major integration risks.

### `outputs/canopy_kernel_contract.md`

Use as the expanded kernel draft and design reference for identity, authority, permission, claims, events, loop participation, capability registry, existing project translation, federation, ecology, model governance, and decision packets.

### `outputs/canopy_ontology_map.md`

Use as the noun disposition and mapping guide. It explains canonical object families and maps old project nouns into `KEEP`, `MERGE`, `SUBTYPE`, `ALIAS`, `ARTIFACT`, `RETIRE`, or `VALUE`.

### `outputs/canopy_contract_package_spec.md`

Use as the contract implementation spec. It defines package responsibilities, dependency direction, ORM/auth/framework/storage neutrality, schema authoring rules, event strategy, manifests, versioning, validation, fixtures, and acceptance criteria.

### `outputs/canopy_database_adapter_strategy.md`

Use as the persistence boundary and adapter strategy. It governs how Prisma, Drizzle, SQL, legacy schemas, object refs, append-only events, projections, and migrations coexist while Canopy contracts remain authoritative.

### `outputs/canopy_migration_fold_in_plan.md`

Use as the migration planning companion. It informs staged data movement, table classification, object-ref backfills, validation reports, and progressive retirement.

### `outputs/canopy_unified_shell_ia.md`

Use as the shell information architecture source. It defines the scoped object environment, global header, scope rail, workspace modes, context panel, capability surfaces, memory, search, map/graph/list triad, decision packets, data stewardship, and federation controls.

### `outputs/canopy_first_vertical_slice_spec.md`

Use as the first full-system proof path. It defines the Riverbend Foodshed Commons example, canonical objects, object pages, phase walkthrough, event chain, governance hooks, ecological hooks, data stewardship requirements, source project contributions, implementation shape, acceptance criteria, failure paths, and definition of done.

### `outputs/canopy_locked_kernel_contracts.md`

Use as the highest-authority v0 contract lock. It governs canonical object families, identifiers, event envelope, minimum taxonomy, identity, authority, relationship grammar, claims/evidence, stewardship, allocation, governance, data stewardship, federation, ecological hooks, module compliance, deferrals, open decisions, and acceptance criteria.

### `outputs/canopy_monorepo_package_architecture.md`

Use as the code organization authority. It defines the package layout, dependency graph, forbidden dependencies, package responsibilities, contract locations, adapter locations, capability packages, shell packages, workflows, database organization, evaluation packages, build tooling, first implementation sequence, and repo skeleton acceptance criteria.

### `outputs/canopy_first_shell_model.md`

Use as the implementation-ready shell model. It defines the first screen, global navigation, scope switcher, object page anatomy, civic memory, attention inbox, search and command palette, capability surfaces, map/graph/list triad, decision packet UX, data stewardship UI, federation UI, AI boundaries, responsive rules, states, components, and acceptance criteria.

### `outputs/canopy_fold_in_execution_plan.md`

Use as the execution authority for folding old projects into Canopy. It defines non-negotiables, per-project disposition, extract/wrap/rewrite/retire/defer rules, dependency sequence, object/event mappings, data import strategy, adapter strategy, shell integration rules, cybernetic loop preservation, risks, verification checklist, first tasks, and acceptance criteria.

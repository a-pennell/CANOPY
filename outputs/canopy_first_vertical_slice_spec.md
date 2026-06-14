# Canopy First Vertical Slice Spec

## 1. Purpose

This document defines the first full-system proof path for Canopy.

It is not an MVP. It is the smallest coherent path that exercises the whole cybernetic loop using real Canopy contracts:

```text
observe -> understand -> simulate -> deliberate -> coordinate -> act -> learn
```

The slice proves that Canopy can behave as one cybernetic commons infrastructure rather than a bundle of legacy applications.

## 2. Slice Choice

The first vertical slice is a **watershed-aware food resilience path**:

```text
A producer declares a verified surplus.
An institution declares a procurement need.
A watershed indicator breach constrains route and source options.
Canopy generates scenarios.
Affected parties deliberate and decide on an allocation.
Commitments and use rights are created.
Food moves.
Outcomes update food, resource, ecological, and governance memory.
```

Food is the right first domain because existing projects already supply producer declarations, procurement needs, food flows, stewardship resources, policies, decisions, offers, needs, and claims. The watershed constraint is included because Canopy must prove that ecological hooks are not decorative. The ecological layer must be able to alter coordination by triggering review, adding constraints, and creating learning signals.

## 3. Non-Goals

- Build the whole food system.
- Build the whole watershed model.
- Build a marketplace.
- Build full mutual-credit settlement.
- Build municipal-scale federation.
- Replace community deliberation with AI ranking.
- Treat scenarios as decisions.
- Treat ecological indicators as binding unless a legitimate policy or agreement makes them binding.

## 4. Example Path

Working example:

**Riverbend Foodshed Commons** coordinates surplus produce from **Green Acre Farm** to **Northside School Kitchen** during a summer meal shortage. The route crosses the **Mill Creek Watershed**, where a nitrate threshold breach has been recorded after heavy rain. The commons has a standing policy that any food-flow intervention increasing farm runoff or cold-chain water use during a watershed breach requires guardian review and an explicit decision record.

The slice begins when Green Acre Farm declares 400 pounds of surplus greens and Northside School Kitchen declares a need for 300 pounds of produce by Friday.

The slice ends when the delivery is fulfilled, food and waste flows are recorded, a watershed indicator is updated, a retrospective is completed, and the next procurement policy review is triggered.

## 5. Canonical Objects Involved

### Actors And Authority

| Object | Example |
| --- | --- |
| `Person` | Farm steward, school food lead, commons facilitator, watershed guardian |
| `Account` | Auth handle for each participating person |
| `Organization` | Riverbend Foodshed Commons, Green Acre Farm, Northside School Kitchen |
| `Membership` | Active memberships in the commons |
| `Role` | Food Flow Steward, Evidence Steward, Decision Steward, Watershed Guardian |
| `RoleAssignment` | Named people holding slice roles |
| `Mandate` | Food Flow Steward mandate to propose matches; Decision Steward mandate to record decisions |
| `Delegation` | Optional temporary delegation from school food lead to procurement coordinator |
| `Guardian` | Guardian representing Mill Creek Watershed |

### Reality, Commons, And Ecology

| Object | Example |
| --- | --- |
| `Place` | Riverbend neighborhood, Northside school district, Mill Creek catchment |
| `Commons` | Riverbend Foodshed Commons |
| `LivingSystem` | Mill Creek Watershed |
| `Resource` | Surplus greens, school kitchen receiving capacity, cold storage, delivery vehicle |
| `Stock` | Available produce quantity; current cold-storage capacity |
| `Flow` | Farm -> aggregation point -> school kitchen food movement |
| `Indicator` | Mill Creek nitrate reading; local food-shortage indicator; food waste indicator |
| `Threshold` | Nitrate governance-trigger threshold |

### Epistemics And Governance

| Object | Example |
| --- | --- |
| `Source` | Producer declaration, school procurement request, sensor reading, rainfall report |
| `Evidence` | Produce availability evidence, need evidence, watershed reading evidence |
| `Claim` | "400 pounds of greens are available"; "school needs 300 pounds"; "threshold is breached" |
| `Counterclaim` | Optional challenge to quantity, quality, timing, or ecological implication |
| `Perspective` | Farm, school, guardian, logistics steward, affected community input |
| `Model` | Food routing and ecological constraint model |
| `Scenario` | Candidate allocation and route options |
| `Issue` | Food need under watershed constraint |
| `Proposal` | Allocate 300 pounds from farm to school with route and handling conditions |
| `Decision` | Approved allocation and conditions |
| `Agreement` | Delivery, handling, and reporting agreement |
| `Policy` | Watershed-sensitive food flow policy |
| `Appeal` | Optional appeal if process or evidence is challenged |
| `Conflict` | Optional dispute over allocation, claim, model, or use right |

### Coordination, Action, And Learning

| Object | Example |
| --- | --- |
| `Need` | School meal produce need |
| `Capability` | Farm surplus capacity; vehicle capacity; volunteer delivery capacity |
| `Request` | Procurement request for 300 pounds of produce |
| `Offer` | Farm offer of 400 pounds of greens |
| `Commitment` | Farm harvest, driver pickup, school receipt, steward reporting |
| `Allocation` | Authorized assignment of 300 pounds and delivery resources |
| `Obligation` | Delivery by Friday; condition reporting; waste reporting |
| `UseRight` | Temporary use of cold storage or vehicle |
| `Project` | Summer meal resilience response |
| `Routine` | Recurring school food procurement cycle |
| `Task` | Harvest, inspect, pack, pick up, deliver, record outcome |
| `Contribution` | Logged labor/material contribution without ranking people |
| `Outcome` | Delivered quantity, accepted quantity, waste quantity, unmet need |
| `Audit` | Model/process/data audit if triggered |
| `Retrospective` | Learning record after delivery |

## 6. Object Pages Touched

The slice must prove that one object can be touched by multiple capabilities without becoming multiple app-specific objects.

| Object page | Required panels or sections |
| --- | --- |
| Organization page | Memberships, activated capabilities, mandates, civic memory |
| Commons page | Resources, policies, routines, active issues, flows, indicators |
| LivingSystem page | Boundary, guardians, indicators, thresholds, evidence, review history |
| Resource page | Stock/condition, use rights, claims/evidence, flows, stewardship events |
| Issue page | Scope, claims, evidence, perspectives, scenarios, proposals |
| Proposal page | Linked issue, affected refs, assumptions, guardian review, decision method |
| Decision page | Authority refs, method, rationale, unresolved objections, review date |
| Commitment page | Parties, obligations, tasks, fulfillment state, linked allocation |
| Flow page | Source, destination, resource, quantity, route, ecological claims, outcomes |
| Policy page | Current version, decision source, threshold class, review/sunset |
| Civic memory page | Append-only events, redacted stubs, export readiness |

## 7. Phase Walkthrough

### 7.1 Observe

Inputs:

- Producer submits surplus declaration.
- School submits procurement need.
- Watershed sensor or trusted importer records nitrate indicator.
- Existing policy states the nitrate threshold is governance-triggering.

Objects created or updated:

- `Source`
- `Evidence`
- `Claim`
- `Need`
- `Request`
- `Capability`
- `Offer`
- `Indicator`
- `Threshold`
- `Issue`

Required events:

- `evidence.source.ingested`
- `evidence.created`
- `claim.created`
- `coordination.need.created`
- `coordination.request.created`
- `coordination.capability.created`
- `coordination.offer.created`
- `ecology.indicator.recorded`
- `ecology.threshold.breached`
- `governance.issue.created`

Acceptance notes:

- Producer and school declarations are claims with evidence, not unreviewed facts.
- Sensor or importer readings are marked `sensor_derived` or `institutionally_certified`.
- Threshold breach creates or scopes an issue; it does not silently block action unless linked policy makes it binding.

### 7.2 Understand

Inputs:

- Evidence steward reviews surplus and need claims.
- Guardian reviews watershed evidence.
- Affected parties submit perspectives.
- AI may summarize claims, but the summary is not authority.

Objects created or updated:

- `Claim`
- `EvidenceLink`
- `Counterclaim`
- `Perspective`
- `GuardianReview`
- `Issue`

Required events:

- `evidence.linked_to_claim`
- `claim.reviewed`
- `claim.contested` if applicable
- `governance.issue.scoped`
- `governance.perspective.submitted`
- `ecology.guardian.review_requested`

Acceptance notes:

- Every decision-relevant assertion is reachable as a reviewed, contested, or explicitly unverified claim.
- Missing voices can be recorded as affected groups or perspectives needed before decision.
- Data visibility is inherited from declarations, evidence, and stewardship agreements.

### 7.3 Simulate

Inputs:

- Reviewed claims about surplus, need, timing, route, capacity, and watershed state.
- Existing food-flow policy and threshold class.
- Route and storage constraints.

Objects created or updated:

- `Model`
- `Assumption`
- `Scenario`
- `Evidence` for model output
- `Proposal` draft

Required events:

- `model.created` or reuse of active model with visible version.
- `model.assumption.added`
- `model.scenario.created`
- `model.output.generated`
- `flow.intervention.created`

Minimum scenarios:

1. Direct farm-to-school delivery.
2. Farm-to-aggregation-point-to-school delivery using existing cold storage.
3. Partial allocation from Green Acre plus secondary source.
4. No-action or delayed-action baseline.

Acceptance notes:

- Scenarios show assumptions, limitations, and confidence.
- Scenario output is evidence for deliberation, not a decision.
- Ecological effects are visible where material resource movement, waste, water use, or transport is involved.

### 7.4 Deliberate

Inputs:

- Issue packet.
- Reviewed claims and evidence.
- Scenario outputs.
- Guardian recommendation.
- Affected perspectives.

Objects created or updated:

- `Proposal`
- `Perspective`
- `Decision`
- `PolicyVersion` if a policy change is part of the decision
- `Appeal` or `Conflict` if triggered

Required events:

- `governance.proposal.created`
- `governance.proposal.opened`
- `ecology.guardian.review_completed`
- `governance.objection.raised` if applicable
- `governance.amendment.submitted` if applicable
- `governance.decision.recorded`

Decision packet must include:

- Proposal reference.
- Authority references.
- Decision method.
- Claims and evidence considered.
- Scenario references.
- Guardian review.
- Rationale.
- Conditions.
- Unresolved objections.
- Review date.

Acceptance notes:

- A decision cannot be recorded without authority.
- Guardian review is contestable and visible.
- The system can record consent, objection, amendment, or appeal without erasing minority positions.

### 7.5 Coordinate

Inputs:

- Approved decision.
- Allocation conditions.
- Available offers, requests, use rights, roles, and mandates.

Objects created or updated:

- `Agreement`
- `Allocation`
- `Commitment`
- `Obligation`
- `UseRight`
- `Task`
- `AccessRule`

Required events:

- `allocation.created`
- `allocation.consent.recorded` where consent is required.
- `coordination.match.proposed` if the match was proposed before decision.
- `coordination.commitment.created`
- `allocation.obligation.created`
- `stewardship.use_right.granted`
- `stewardship.task.created`

Acceptance notes:

- Allocation cites the decision or standing mandate that authorized it.
- Commitments cite parties, fulfilled request/offer refs, obligations, due dates, and authority refs.
- Use rights are scoped, revocable, and linked to policy or decision.

### 7.6 Act

Inputs:

- Commitments and tasks.
- Use rights for storage, vehicle, or handling resource.
- Flow recording requirements.

Objects created or updated:

- `Task`
- `Contribution`
- `Flow`
- `LedgerEntry` only if a settlement method is chosen.
- `Outcome`
- `Indicator`

Required events:

- `stewardship.task.completed`
- `stewardship.contribution.logged`
- `flow.food.recorded`
- `flow.transport.recorded` where route impact matters.
- `flow.waste.recorded` if any quantity is lost or discarded.
- `coordination.commitment.fulfilled`
- `accounting.ledger_entry.posted` only if settlement is in scope.

Acceptance notes:

- Flow records include source, destination, resource, quantity, unit, and linked commitment/allocation.
- Contributions record work or material support without creating rankings or eligibility scores.
- Settlement, if present, is subordinate to commitment and allocation, not the center of the slice.

### 7.7 Learn

Inputs:

- Delivered quantity.
- Waste/loss quantity.
- School need fulfilled or unmet.
- Watershed indicator follow-up.
- Participant feedback.
- Model prediction versus outcome.

Objects created or updated:

- `Outcome`
- `Indicator`
- `Claim`
- `Audit`
- `Retrospective`
- `Policy`
- `Issue` reopened or closed

Required events:

- `learning.outcome.recorded`
- `ecology.indicator.recorded`
- `claim.created` for outcome assertions.
- `model.audit.completed` if model performance is evaluated.
- `learning.retrospective.completed`
- `governance.policy.versioned` if policy changes.
- `governance.issue.reopened` if outcome creates a new concern.
- `federation.export.created` if a partner commons or institution receives the packet.

Acceptance notes:

- Learning updates reality state and can create new issues.
- Policy review is triggered if actual outcomes diverge from scenario assumptions or threshold behavior.
- Civic memory preserves the decision trail and outcome trail without destructive edits.

## 8. Event Chain Summary

The happy path should produce at least this canonical chain:

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

The implementation may emit additional events, but it must not skip the event families needed to reconstruct the path.

## 9. Governance Hooks

The slice must exercise these governance hooks:

- Role assignment and mandate inspection.
- Guardian appointment and challenge path.
- Threshold adoption as advisory, governance-triggering, or binding.
- Issue scoping with affected refs.
- Proposal opening with decision method.
- Objection and amendment path.
- Decision record with authority refs.
- Allocation approval.
- Use-right grant.
- Appeal path for decision, evidence, model, or allocation.
- Policy review after outcome.
- Export/fork of decision packet and event trail.

Minimum governance rule:

```text
When a food-flow proposal is linked to a breached watershed threshold,
guardian review is required before decision, and the decision packet must
state whether the threshold is advisory, governance-triggering, or binding.
```

## 10. Ecological Hooks

The slice must prove that ecological context can affect material coordination.

Required ecological hooks:

- Food resources and routes link to `Place` and `LivingSystem`.
- Mill Creek Watershed has a `Guardian`, `Indicator`, and `Threshold`.
- Threshold breach creates or scopes an `Issue`.
- Guardian review is required for the proposal.
- Scenario output includes ecological assumptions and limitations.
- Flow records can link to transport, waste, water-use, or runoff claims.
- Outcome updates at least one ecological or food-system indicator.
- Policy review can be triggered by ecological outcome or threshold behavior.

Threshold classes:

| Class | Slice behavior |
| --- | --- |
| Advisory indicator | Must appear in issue/proposal context. |
| Governance trigger | Must create review, issue, or escalation. |
| Binding threshold | Must block or constrain action only if adopted by legitimate policy/agreement. |

## 11. Data Stewardship

Data stewardship is part of the proof path, not an afterthought.

Required data stewardship agreements:

| Governed data | Default visibility | Notes |
| --- | --- | --- |
| Producer surplus declaration | `commons` or `organization` | May reveal business-sensitive yield/capacity. |
| School need declaration | `organization` or `role_restricted` | May reveal vulnerable population or procurement sensitivity. |
| Watershed sensor reading | `public` or `federation` | Sensitive ecological site details may be restricted. |
| Guardian review | `commons` with public summary | Full notes may be restricted if they reveal sensitive ecological data. |
| Decision packet | `commons` or `public` | Redact private evidence while preserving rationale. |
| Flow record | `commons` or `federation` | Quantity and route can be shared according to agreement. |
| Contribution record | `private`, `organization`, or `commons` | Must not become ranking or social credit. |
| Retrospective | `commons` with optional redactions | Protect people while preserving institutional learning. |

Rules:

- Data stewardship agreements travel with exported data.
- Redacted civic-memory stubs preserve event continuity.
- Crisis sharing requires authority, scope, duration, and post-crisis review.
- AI summaries inherit the most restrictive relevant visibility.
- No hidden eligibility score may be derived from producer, school, contribution, or household data.

## 12. Existing Projects Supply

### CommonCredit

Supplies:

- Seed identity/event envelope concepts.
- Needs/offers vocabulary.
- Commitment and settlement thinking.
- Ledger invariants and reversal model for later settlement.
- Dispute ladder patterns.

Use in this slice:

- `Need`, `Offer`, `Commitment`, optional `LedgerEntry`, and conflict/dispute patterns.

Do not import yet:

- Full mutual-credit network UI.
- Reputation scoring.
- Tax/export workflows.

### ICOS

Supplies:

- CommonGround protocol: attention, perspecting, integration, decision, memory.
- Revocable delegation model.
- Decision records with rationale, objections, review dates, and supersession.
- Append-only civic memory enforcement pattern.
- Export bundle and content-hash pattern.
- Synapse/Flow concepts: surplus/shortage declarations, allocation proposals, allocation consent.
- EIL concepts: guardians, ecological annotations, threshold-aware review.

Use in this slice:

- Governance protocol, delegation, decision packet, civic memory, guardian review, allocation consent, export.

### Sensemaking

Supplies:

- Issue, source, claim, review status, theme, and stakeholder/affectedness concepts.
- AI-assisted extraction pattern where nothing becomes canonical until reviewed.

Use in this slice:

- Source ingestion, claims about surplus/need/ecological state, evidence review, perspectives, model assumptions.

### Stewardship

Supplies:

- Resource registry.
- Use/access rights patterns.
- Policies and policy versions.
- Proposals, decisions, maintenance/action tasks.
- Event log concepts.
- Food-flow schema: field, harvest, process, store, transport, distribute, institution, table/waste.
- Procurement needs and production capacities.

Use in this slice:

- Resource, UseRight, Policy, Proposal, Decision, Task, Contribution, FoodFlow, procurement need, production capacity.

## 13. Implementation Shape

The preferred implementation shape is a contract-enforced modular monolith with adapters where needed.

Required services or modules:

- Identity and Authority service.
- Permission service.
- Object Graph service.
- Data Stewardship service.
- Claims and Evidence service.
- Governance service.
- Living Systems service.
- Allocation and Accounting service.
- Flow service.
- Model service.
- Civic Memory service.
- Learning service.
- Federation/export service.

Required stores:

- Graph store for object refs and relationships.
- Relational store for workflow, policy, decision, allocation, and ledger rows.
- Event store for append-only civic memory.
- Geospatial store for places and watershed boundaries.
- Time-series store for indicators and flows.
- Document store for sources, evidence, and decision packets.
- Object storage for exports and bundles.

## 14. Acceptance Criteria

### Whole-Loop Acceptance

- The path can be replayed from append-only events from observation through learning.
- Every consequential mutation emits a canonical event.
- Every event references a canonical object and source capability.
- Every object touched can render through a universal object page.
- The final retrospective can point back to issue, proposal, decision, commitments, flows, outcomes, and indicators.

### Authority Acceptance

- No decision, allocation, use-right grant, or commitment is created without authority refs.
- Delegations are revocable and scoped.
- Permission checks return allowed/denied, source refs, and appeal path where applicable.

### Epistemic Acceptance

- Surplus, need, ecological state, model assumptions, and outcomes are represented as claims with evidence.
- AI output, if used, is stored as claim/evidence/model output and cannot record binding decisions.
- Counterclaims or objections can be added without deleting the original claim.

### Governance Acceptance

- The issue page shows affected refs, perspectives, evidence, scenarios, guardian review, proposal, and decision.
- Decision packet records method, authority, rationale, unresolved objections, and review date.
- Appeal or conflict can be opened against decision, model, evidence, or allocation.

### Ecological Acceptance

- The watershed is a first-class `LivingSystem`, not a note on a food object.
- Threshold breach triggers governance behavior.
- Guardian review is visible and contestable.
- Scenario and flow records expose ecological claims or limitations.
- Learning can revise policy or create a new issue from ecological outcomes.

### Coordination Acceptance

- Need and offer can become a request, match proposal, allocation, commitment, obligation, task, and fulfilled flow.
- Use rights are scoped to resource, holder, conditions, authority, and review path.
- Contributions do not create rankings, hidden scores, or portable status.

### Data Stewardship Acceptance

- Each sensitive object has visibility, data state, allowed uses, export rule, and retention rule where applicable.
- Exports include data stewardship agreements and redaction summaries.
- Redacted event stubs preserve memory continuity.

### Federation Acceptance

- A decision packet and related event trail can be exported with content hash.
- Export includes object refs, schema versions, data stewardship rules, and redaction summary.
- Imported or federated records can preserve local terms mapped to canonical types.

## 15. Failure And Contestation Paths

The slice is not complete unless it handles non-happy paths:

- Producer surplus claim is contested.
- School need visibility is restricted.
- Sensor reading is outdated or disputed.
- Guardian review recommends against direct route.
- Proposal is amended.
- Decision is appealed.
- Delivery is partially fulfilled.
- Waste exceeds expected amount.
- Model assumptions are wrong.
- Federation export redacts sensitive route or ecological site data.

Each failure must create new events rather than destructive edits.

## 16. Definition Of Done

The vertical slice is done when a reviewer can answer yes to all of these:

1. Can I start from the Mill Creek threshold breach and find the food allocation decision it affected?
2. Can I start from the school meal need and find the claims, evidence, proposal, allocation, commitments, tasks, food flows, and outcome?
3. Can I start from the farm surplus offer and see what was allocated, what remained, and what evidence supported it?
4. Can I inspect the authority behind the decision, allocation, use rights, and commitments?
5. Can I see what the watershed guardian recommended and how the decision handled it?
6. Can I see unresolved objections without treating them as erased?
7. Can I export the decision packet and event trail with stewardship rules intact?
8. Can I replay the path as observe, understand, simulate, deliberate, coordinate, act, and learn?

If all eight are true, Canopy has proven its first full-system path.

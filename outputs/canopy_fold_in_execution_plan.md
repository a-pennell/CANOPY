# Canopy Fold-In Execution Plan

## 1. Fold-In Thesis And Non-Negotiables

Canopy is the product. CommonCredit, ICOS, Sensemaking, and Stewardship are source bodies that contribute proven patterns, schemas, protocols, fixtures, and migration adapters. They do not become separate applications, route groups, package boundaries, permissions worlds, event logs, search indexes, or user-facing modules inside Canopy.

The execution thesis is:

- Stabilize the Canopy kernel before moving consequential behavior.
- Translate old project nouns into canonical Canopy objects before exposing them in the shell.
- Wrap useful legacy behavior at the edge while Canopy services mature.
- Project every consequential object and mutation into the shared object graph and civic memory.
- Rewrite workflows only after contracts, mappings, event parity, and shell integration prove the native shape.
- Retire concepts that would recreate product silos, hidden scoring, irreversible authority, ownership-only resource models, or unreviewed AI authority.

Non-negotiables:

1. No source project remains visible as a primary app, navigation tab, route namespace, object category, role, permission system, or search world.
2. Every user-visible consequential object resolves to canonical `ObjectRef`.
3. Every binding action carries `authorityRefs` and an explainable permission result.
4. Every consequential mutation emits a canonical append-only `CanopyEvent`.
5. Every decision-relevant assertion is represented as `Claim`, `Counterclaim`, `Evidence`, `Source`, `EvidenceLink`, or `Perspective`.
6. No local `Member`, `Account`, `Community`, `Space`, or `Role` shadows kernel identity and authority.
7. CommonCredit `Account` maps to `LedgerAccount`, never identity `Account`.
8. Access rights map to governed `UseRight` plus `AccessRule`, not raw permissions alone.
9. Contributions, care, credit, reputation, endorsement, and task history must not become hidden eligibility, portable person scores, or rankings.
10. AI, model, sensor, and imported records are evidence or draft interpretation until reviewed. They are not authority.
11. Material coordination exposes ecological hooks when land, food, water, energy, waste, infrastructure, living systems, or procurement are affected.
12. Export, forkability, redaction continuity, consent, retention, and federation rules are part of the implementation surface from the start.

## 2. Capability Disposition By Source Project

| Source project | Canopy destination | Primary disposition | First implementation value | Must not preserve |
| --- | --- | --- | --- | --- |
| CommonCredit | Allocation, Accounting, Coordination, conflict support | Extract ledger and exchange invariants; wrap workflows; rewrite later | Double-entry ledger rules, offers, needs, commitments, disputes, treasury allocation | Mutual-credit app boundary, identity account confusion, reputation scoring |
| ICOS | Governance, civic memory, federation, living systems, flows | Extract constitutional and memory primitives; wrap decision/delegation flows; rewrite selected services later | Revocable delegation, decision records, append-only memory, export bundles, CommonGround protocol | ICOS as universal constitutional app, municipal-scale scope too early |
| Sensemaking | Claims, evidence, issue interpretation, learning | Extract claim/evidence lifecycle; wrap ingestion and review; rewrite epistemic services later | Claims, sources, review states, affected groups, human acceptance rule | Ungoverned AI synthesis, issue-only claims, theme clusters as root objects |
| Stewardship | Commons registry, resources, use rights, policies, routines, flows | Wrap first as practical domain substrate; extract rights/resource/policy model; rewrite after parity | Resource registry, `can()` shape, access rights, maintenance, policy versions, food flows | SaaS tenant ontology, contribution dashboards as ranking, ownership-only resource frame |

## 3. Extract, Wrap, Rewrite, Retire, Or Defer

### Extract

Extract into Canopy contracts, kernel services, or capability contracts:

- Shared identity: `Person`, `Account`, `Organization`, `Membership`, `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`, `Credential`.
- Stable object registry and local-source mapping.
- Append-only event envelope and event namespaces.
- Claims, evidence, counterclaims, sources, perspectives, review states, affected groups.
- Governance spine: issue, proposal, decision, decision packet, agreement, policy, appeal, conflict.
- Stewardship primitives: commons, resources, use rights, access rules, routines, tasks, contributions.
- Allocation/accounting primitives: needs, capabilities, requests, offers, commitments, allocations, obligations, ledger accounts, ledger entries.
- Living systems: indicators, thresholds, guardian reviews, ecological hooks.
- Data stewardship, export envelope, federation rule, redaction continuity.

### Wrap

Wrap legacy code behind Canopy adapters when it is useful but not yet native:

- Stewardship resource, access-right, policy, maintenance, and food-flow workflows.
- Sensemaking issue, source, claim, review, affected-group, and contribution workflows.
- ICOS issue, perspective, delegation, decision-record, timeline, referendum, export, Synapse allocation, and ecological declaration workflows.
- CommonCredit offer, need, invoice, transaction, ledger, credit-limit, dispute, treasury, and project workflows.

Wrapper requirements:

- Resolve canonical actor, authority, object, scope, visibility, and data-state context.
- Validate commands against Canopy contracts.
- Write local row and canonical event transactionally where possible, otherwise through outbox reconciliation.
- Emit adapter validation reports for unknown local subtypes instead of guessing.
- Hydrate Canopy projections; never expose legacy pages as the primary surface.

### Rewrite

Rewrite into native Canopy services only after wrapper parity:

- Identity and authority resolution.
- Object graph and local taxonomy service.
- Civic memory event writer and replay service.
- Claims/evidence review service.
- Governance and decision packet service.
- Commons/resource/use-right service.
- Policy/versioning service.
- Allocation/accounting service.
- Flow/living-system/threshold service.
- Federation/export/reconciliation service.

Rewrite gates:

- Mapping coverage is known and tested.
- Events replay into equivalent projections.
- Authority and data stewardship rules are enforced.
- The shell can operate the workflow without legacy app names.
- Legacy storage no longer owns canonical meaning.

### Retire

Retire as Canopy concepts:

- Product slugs as ontology or navigation.
- Auth/session/rate-limit artifacts as root objects.
- Hidden reputation, generalized trust, portable endorsement, and eligibility scores.
- Irreversible delegation or unappealable authority.
- Ownership-only resource models.
- Unreviewed AI conclusions.
- Theme clusters as root kernel objects.
- Contribution views that rank people rather than explain contextual work.

### Defer

Defer until the kernel and first slice are stable:

- Full mutual-credit network UI.
- Tax exports, Stripe/member dues, and compliance reporting.
- Full municipal-scale ICOS/MCS workflows.
- Full AI deliberation, extraction, synthesis, recommendation, and model loops.
- Full ecological modeling framework.
- Complete care coordination detail beyond sealed-event/data-stewardship scaffolding.
- Provider consolidation across Prisma, Drizzle, Clerk, NextAuth, and custom auth.
- Full federation network automation.

## 4. Dependency Sequence

### 4.1 Contracts

1. Implement `packages/contracts/kernel` with `ObjectRef`, object types, capabilities, identity, authority, permission checks, data stewardship, claims/evidence, events, export envelope, federation rule, governance hooks, ecological hooks, and validation helpers.
2. Implement `packages/contracts/governance` for issues, perspectives, proposals, decisions, decision packets, agreements, policies, appeals, conflicts, votes, consent signals, quorum, and governance profiles.
3. Implement `packages/contracts/domain` for places, commons, living systems, resources, stocks, flows, indicators, thresholds, needs, offers, commitments, allocations, obligations, use rights, ledger accounts, ledger entries, routines, tasks, contributions, outcomes, models, scenarios, local taxonomy, and canonical mappings.
4. Implement `packages/contracts/adapters` for auth, persistence, event store, object graph, document, geospatial, time-series, vector, object storage, federation transport, and legacy project adapters.
5. Implement `packages/contracts/ui` for object page, search, navigation, attention, decision packet, civic memory, redaction, and display-label view models.

### 4.2 Adapters

1. Create provider-neutral adapter contracts.
2. Create legacy adapter homes under `packages/adapters/legacy/common-credit`, `icos`, `sensemaking`, and `stewardship`.
3. Add adapter conformance tests for object-ref resolution, local-row round trips, command writes, event append, projection rebuild, mapping validation, and unknown subtype reporting.
4. Add Prisma adapters for CommonCredit and Sensemaking source shapes.
5. Add Drizzle adapters for ICOS and Stewardship source shapes.
6. Add append-only event-store adapter with ICOS-style insert/select-only enforcement where available.

### 4.3 Data Imports

1. Inventory source tables and local nouns.
2. Create `ObjectRefMap` records for identity, authority, organizations, places, commons, resources, issues, claims, evidence, proposals, decisions, policies, flows, tasks, needs, offers, ledger accounts, and ledger entries.
3. Backfill canonical mappings idempotently.
4. Attach data stewardship defaults and visibility states.
5. Import legacy events as `systemActor: "importer"` with source metadata.
6. Generate validation reports for unmapped, ambiguous, sensitive, or conflicting records.

### 4.4 Services

1. Implement kernel command validation and permission evaluation.
2. Implement object registry and relationship services.
3. Implement civic memory append/read/replay services.
4. Implement claims/evidence command handlers.
5. Implement governance command handlers.
6. Implement stewardship, allocation/accounting, flow, living-system, and federation command handlers after wrapper parity.

### 4.5 UI Surfaces

1. Build Canopy shell scope switcher, global object search, attention inbox, civic memory, command palette, and object page grammar.
2. Hydrate object pages only through canonical projections.
3. Add capability surfaces as Canopy lenses: Claims and Evidence, Deliberation, Commons Registry, Living Systems, Allocation and Accounting, Flows, Learning and Accountability, Federation.
4. Render local language through `LocalTerm` and `CanonicalMapping`, not through old app labels.
5. Display authority, visibility, data state, federation state, and memory result before consequential commands.

### 4.6 Workflows

1. Implement outbox dispatch and reconciliation.
2. Implement projection rebuild and replay jobs.
3. Implement import validation jobs.
4. Implement export bundle and forkability jobs.
5. Implement AI extraction jobs only as draft claim/evidence generation.
6. Implement threshold checks that create governance-trigger events.
7. Implement model audit and learning review jobs after claims/evidence and governance are stable.

## 5. Per-Project Fold-In Plan

### 5.1 CommonCredit

Canopy destination: Allocation and Accounting, Coordination, and conflict support.

Extract:

- Double-entry ledger invariants.
- Append-only ledger entries and reversal-by-offset.
- Offer/need vocabulary.
- Request, invoice, transaction, fulfillment, treasury, project, and dispute patterns.
- Credit limit governance.
- Domain event envelope concepts.

Wrap:

- `Offer` to `Offer` and sometimes `Capability`.
- `Need` to `Need` and sometimes `Request`.
- `Invoice` to settlement request / `Request`.
- `Transaction` to fulfillment or settlement artifact.
- `LedgerEntry` to canonical `LedgerEntry`.
- `CreditLimitRequest` to governed use-right change request.
- `Dispute` to `Conflict` with linked claims/evidence and decision.
- `TreasuryAllocation` to `Allocation`.
- `ProjectTask` to `Task`.

Rewrite later:

- Native ledger service.
- Mutual-credit accounting policy configuration.
- Settlement workflow.
- Dispute/conflict workflow.
- Accounting reports as learning artifacts.

Retire or block:

- Reputation as root object.
- Portable endorsement or score surfaces.
- Direct credit-limit mutation without governance.
- Any confusion between identity `Account` and `LedgerAccount`.

First Canopy behavior:

- A school procurement need and farm surplus offer become request/offer, proposed match, governed allocation, commitment, flow record, optional ledger entries, outcome, and retrospective.

### 5.2 ICOS

Canopy destination: Governance, civic memory, federation, living systems, flows, and protocol reference.

Extract:

- Attention -> perspecting -> integration -> decision -> memory protocol.
- Revocable delegation schema.
- Decision record shape.
- Append-only timeline enforcement.
- Export envelope with content hash.
- Forkability, due process, exit, anti-capture, and non-capture principles.
- Guardian/proxy ecological representation.
- Synapse surplus/shortage and allocation consent patterns.

Wrap:

- `Issue` to `Issue`.
- `Perspective` to `Perspective`.
- `Delegation` to `Delegation`.
- `DecisionRecord` to `Decision` plus `DecisionPacket`.
- `TimelineEvent` to `CanopyEvent`.
- `Space` to `Organization`, `Commons`, or governance scope.
- `Neighborhood` to `Place`.
- `Referendum` to decision-process subtype.
- `SurplusShortageDeclaration` to `Offer` / `Request` plus `Claim`.
- `AllocationProposal` to `Proposal` plus candidate `Allocation`.

Rewrite later:

- Native governance service.
- Decision packet service.
- Delegation service.
- Export/federation service.
- Guardian review workflow.
- Flow allocation consent workflow.

Retire or defer:

- Full ICOS app/docs as product surface.
- Municipal-scale governance until first domain slice works.
- AI deliberation support until claim/model audit is stable.
- Constitutional profile rules that should remain community-configurable rather than kernel law.

First Canopy behavior:

- An ecological threshold breach creates an issue, gathers perspectives, requires guardian review, builds a decision packet, records a decision, writes civic memory, and supports export/fork.

### 5.3 Sensemaking

Canopy destination: Claims, evidence, issue interpretation, review, and learning.

Extract:

- Claim lifecycle: pending, accepted, rejected, contested, superseded, preserved.
- Claim types: fact, causal, value, assumption, preference, risk, impact, need, capability.
- Source ingestion structure.
- Human acceptance rule.
- Stakeholder power/affectedness model as `AffectedGroup`.
- Contribution model as perspective/evidence input.

Wrap:

- `Issue` to `Issue`.
- `Source` to `Source` and extracted `Evidence`.
- `Claim` to `Claim`.
- `StakeholderGroup` to `AffectedGroup`.
- `Theme` to artifact.
- `Contribution` to `Perspective`, `EvidenceLink`, or `Contribution` based on content.

Rewrite later:

- Native evidence ingestion service.
- Native claim review service.
- Counterclaim and contestability workflow.
- AI-assisted extraction with provenance, confidence, limitations, and review.
- Cross-object issue interpretation.

Retire or block:

- Ungoverned AI extraction as canonical knowledge.
- Theme clusters as root objects.
- Source credibility as a simplistic person or institution score.
- Issue-only claims.

First Canopy behavior:

- A resource condition update, school need, farm offer, ecological threshold reading, model assumption, and dispute statement can all become reviewed or contested claims linked to evidence.

### 5.4 Stewardship

Canopy destination: Commons registry, resources, use rights, access rules, policies, routines, tasks, contributions, and food flows.

Extract:

- Resource registry.
- Resource condition updates.
- Access/use-right schema.
- `can(actorRef, action, objectRef, context)` rights shape.
- Policy and policy-version model.
- Maintenance task and recurrence model.
- Stewardship assignment model.
- Food-flow chain.
- RLS-oriented community context rule.

Wrap first:

- `Community` to `Organization` or `Commons`.
- `Resource` to `Resource`, `Commons`, or `LivingSystem` based on semantics.
- `AccessRight` to `UseRight` plus `AccessRule`.
- `ResourceConditionUpdate` to `Claim`, `Indicator`, and `stewardship.resource.condition_updated`.
- `ResourceDocument` to `Source` / `Evidence`.
- `Policy` and `PolicyVersion` to canonical policy artifacts.
- `MaintenanceTask` to `Task` under `Routine` or `Project`.
- `StewardshipAssignment` to `Mandate` plus `RoleAssignment`.
- `FoodFlow` to `Flow`.

Rewrite later:

- Native commons/resource service.
- Native use-right/access-rule service.
- Routine and maintenance service.
- Policy versioning service.
- Food-flow service.
- Commons registry projections.

Retire or block:

- Tenant naming as ontology.
- Contribution dashboards that imply ranking.
- Simple permission-only rights model.
- Policy changes without decision linkage.

First Canopy behavior:

- A resource page shows condition, claims, evidence, use rights, policies, tasks, flow history, ecological context, authority, data stewardship, and civic memory through the Canopy object page grammar.

## 6. Canonical Object And Event Mappings

### 6.1 Object Mappings

| Legacy noun | Canonical mapping | Execution rule |
| --- | --- | --- |
| CommonCredit Organization | `Organization` | Preserve accounting configuration as policy/config artifact |
| CommonCredit Member | `Person` + `Membership` | Split auth, person, membership, and accounting profile |
| CommonCredit Account | `LedgerAccount` | Never map to identity `Account` |
| CommonCredit LedgerEntry | `LedgerEntry` | Append-only; reversals are new entries |
| CommonCredit CreditLimitRequest | `UseRight` change request | Requires governance and authority |
| CommonCredit Dispute | `Conflict` | Link claims, evidence, decision, and ledger refs |
| ICOS Space | `Organization` / `Commons` / governance scope | Resolve by source semantics, not name |
| ICOS Neighborhood | `Place` | Add parent/child scope relationships where available |
| ICOS Delegation | `Delegation` | Must remain scoped and revocable |
| ICOS DecisionRecord | `Decision` + `DecisionPacket` | Preserve rationale, objections, review date, supersession |
| ICOS TimelineEvent | `CanopyEvent` | Generalize to `objectRef` and `relatedRefs` |
| Sensemaking Source | `Source` / `Evidence` | Source is origin; evidence is linked item |
| Sensemaking Claim | `Claim` | Expand from issue-bound to object-universal |
| Sensemaking StakeholderGroup | `AffectedGroup` | Preserve affectedness carefully |
| Sensemaking Theme | `Theme` artifact | Not a root object |
| Stewardship Community | `Organization` / `Commons` / `Place` | Use local term only after canonical mapping |
| Stewardship AccessRight | `UseRight` + `AccessRule` | Preserve grant, condition, revocation, review path |
| Stewardship ResourceConditionUpdate | `Claim` / `Indicator` / event | Requires evidence or provenance |
| Stewardship PolicyVersion | `PolicyVersion` artifact | Must cite `Policy` and authorizing `Decision` |
| Stewardship MaintenanceTask | `Task` under `Routine` or `Project` | Care/maintenance is not productivity ranking |
| Stewardship FoodFlow | `Flow` | Link source, destination, resource, quantity, timing, loss/waste, commitment |

### 6.2 Event Mappings

| Source behavior | Canonical event family | Required refs |
| --- | --- | --- |
| Membership activation | `identity.membership.activated` | actor, person, org, authority where applicable |
| Role or stewardship assignment | `authority.role.assigned`, `authority.mandate.granted` | actor, holder, scope, authority |
| Delegation grant/revocation | `authority.delegation.granted`, `authority.delegation.revoked` | delegator, delegate, mandate/scope |
| Source ingestion | `evidence.source.ingested` | source, object/scope, visibility, data state |
| Claim creation/review/contest | `claim.created`, `claim.reviewed`, `claim.contested` | claimant, about refs, evidence refs |
| Proposal and decision | `governance.proposal.created`, `governance.decision.recorded` | issue/proposal, authority, affected refs |
| Policy versioning | `governance.policy.versioned` | policy, decision, authority |
| Resource creation/update | `stewardship.resource.created`, `stewardship.resource.condition_updated` | resource, steward, evidence/claim refs |
| Use-right grant/revocation | `stewardship.use_right.granted`, `stewardship.use_right.revoked` | holder, resource, authority, review path |
| Task completion/contribution | `stewardship.task.completed`, `stewardship.contribution.logged` | task/routine, contributor, outcome refs |
| Need/offer/commitment | `coordination.need.created`, `coordination.offer.created`, `coordination.commitment.created` | parties, request/offer, authority where binding |
| Allocation | `allocation.created` | allocation, decision/policy/mandate authority |
| Ledger posting/reversal | `accounting.ledger_entry.posted`, `accounting.ledger_entry.reversed` | ledger account, commitment/allocation, authority |
| Food/material flow | `flow.food.recorded`, `flow.transport.recorded`, `flow.waste.recorded` | source, destination, resource, commitment, ecological refs |
| Threshold breach | `ecology.threshold.breached` | living system, indicator, threshold, guardian refs |
| Export/import/reconcile | `federation.export.created`, `federation.import.received`, `federation.reconciliation.completed` | scope, envelope, stewardship agreements |
| Redaction | `system.redaction.applied` or specific redaction event | original event, redaction authority, stub visibility |

## 7. Data Migration And Import Strategy

Migration is incremental, idempotent, and evidence-producing. Each import run must produce a validation report and must be replayable.

Import stages:

1. Inventory source schemas, local nouns, status values, identifiers, foreign keys, event logs, sensitive fields, and workflow entry points.
2. Classify every noun as `KEEP`, `MERGE`, `SUBTYPE`, `ALIAS`, `ARTIFACT`, `RETIRE`, or `VALUE`.
3. Create source-specific mapping plans under `packages/database/import-plans/{source}`.
4. Define source-specific data stewardship defaults before importing user-visible records.
5. Import identity and authority records first.
6. Import scope records: organizations, places, commons, living systems, projects, routines, governance processes.
7. Backfill `ObjectRefMap` records with stable canonical IDs.
8. Import claims, evidence, issues, proposals, decisions, policies, resources, use rights, flows, needs, offers, ledger accounts, and ledger entries.
9. Import legacy event logs as canonical `CanopyEvent` records with `systemActor: "importer"`.
10. Rebuild projections and compare fixture snapshots.
11. Mark ambiguous, unmapped, conflicting, or sensitive records for human review.

Import rules:

- Mappings are append-friendly. Corrections use supersession pointers, not silent overwrites.
- Unknown local subtypes fail review, not import silently.
- Sensitive records import with restrictive visibility until reviewed.
- AI-generated legacy content imports as machine-inferred or draft, not accepted truth.
- Ledger balances must be reconstructed from entries, not imported as standalone authority.
- Policy versions must cite policy and decision refs or be marked incomplete.
- Export and federation metadata must preserve local terms and data stewardship agreements.

## 8. Adapter Strategy For Legacy Code And Schemas

Legacy adapters live only at the edges. They translate source rows and legacy behavior into Canopy contracts; they do not define Canopy meaning.

Adapter responsibilities:

- `resolveObjectRef(local)` and `resolveLocalObject(ref)`.
- `readCanonicalObject(ref)` for projection hydration.
- `writeCommand(command)` for consequential writes.
- `appendEvent(event)` with canonical event validation.
- `listEvents(query)` for replay and memory.
- `rebuildProjection(projection, scope)` for shell views.
- `validateMappings(scope)` for migration health.

Command adapter rules:

- Check authority before persistence.
- Resolve actor refs from `Person`, `Account`, `Membership`, role, mandate, delegation, or guardian context.
- Use local writes only for draft or implementation state.
- Write local domain row and canonical event transactionally where possible.
- Use an outbox when transaction boundaries cross stores.
- Treat undispatched consequential events as reconciliation failures.
- Reject commands that would mutate rights, obligations, governance, accounting, resource state, ecological state, data visibility, federation, or civic memory without canonical event emission.

Schema rules:

- Prisma and Drizzle schemas may remain during wrap phase.
- ORM models may not be the only source of truth for identity, authority, canonical object identity, claims/evidence, binding decisions, use rights, allocations, ledger entries, civic memory, data stewardship, export, or federation.
- Local rows can retain legacy IDs and slugs, but cross-capability references use `ObjectRef`.
- Legacy app tables are retired only after projections, events, and command behavior prove parity.

## 9. Shell Integration Rules

The shell integrates capabilities as lenses over the shared object graph.

Required shell rules:

1. Primary navigation uses Home, Search, Attention, Map, Graph, Lists, Civic Memory, and Capabilities.
2. Capability labels are Canopy labels: Reality Map, Commons Registry, Living Systems, Needs and Capabilities, Claims and Evidence, Deliberation, Agreements and Policies, Allocation and Accounting, Flows, Simulation and Models, Care Coordination, Learning and Accountability, Federation.
3. Old project names do not appear in primary navigation, user-facing route names, object categories, role names, permission names, or capability labels.
4. Every object page uses the universal object page grammar: state, relationships, claims/evidence, governance/authority, commitments/obligations, ecological context, civic memory, outcomes/learning, data stewardship, federation/export.
5. Every consequential command previews object mutation, authority source, data visibility effect, claims/evidence touched, event to be written, appeal/review path, and federation/export impact.
6. Scope switching changes authority, relevance, visibility, local language, and policies. It never changes object identity.
7. Local language appears as local terms beside canonical object types.
8. Denied actions show source refs, reason, and appeal path where safe.
9. Redacted events preserve continuity with stubs.
10. Projections are never authority. The shell must link important views back to event, object, decision, policy, or evidence refs.

First shell integration target:

- Riverbend Foodshed Commons active scope.
- Green Acre Farm surplus offer.
- Northside School Kitchen procurement need.
- Mill Creek Watershed nitrate threshold breach.
- Guardian review required.
- Food-flow issue created under watershed constraint.
- Scenario comparison ready for deliberation.
- Decision packet in progress.
- Commitments, tasks, flow records, outcomes, and retrospective visible as the path advances.

## 10. Governance And Cybernetic Feedback Loop Preservation

Fold-in is successful only if it preserves Canopy's cybernetic loop:

```text
Observe -> Understand -> Simulate -> Deliberate -> Coordinate -> Act -> Learn -> Observe
```

Preservation rules:

- Observe: source ingestion, condition updates, ledger postings, flow records, sensor readings, and field notes become claims/evidence, indicators, flows, or events with provenance.
- Understand: claims, counterclaims, evidence, perspectives, affected groups, local terms, and model assumptions remain distinct and reviewable.
- Simulate: scenarios and model outputs are evidence for deliberation, not decisions.
- Deliberate: issues, proposals, objections, amendments, affected-party analysis, guardian review, and decision packets are first-class.
- Coordinate: requests, offers, commitments, allocations, obligations, tasks, use rights, and budgets cite authority and policies.
- Act: flows, maintenance, resource updates, ledger entries, and contribution logs write civic memory and preserve data stewardship.
- Learn: outcomes, audits, retrospectives, threshold changes, policy reviews, appeals, and supersessions feed back into objects and memory.

Governance preservation rules:

- Votes and consent signals are process artifacts, not decisions.
- Decisions cite issues or proposals, authority refs, claims/evidence, perspectives, unresolved objections, rationale, conditions, obligations created, review date, appeal path, and event trail.
- Policies are versioned through decisions.
- Use-right grants, credit-limit changes, allocations, mandates, delegations, federation changes, data disclosure changes, and threshold changes require authority.
- ICOS constitutional principles become default governance profiles unless they protect kernel invariants: exit, revocability, due process, anti-capture, memory, export, and forkability.
- Guardian representation is contestable and reviewable, not sovereignty.

## 11. Risks Where Old Project Identity Could Leak Back Into Canopy

| Risk | Leak path | Prevention |
| --- | --- | --- |
| Four apps inside one shell | Routes, nav tabs, package names, dashboards | Use Canopy capability labels and object pages; legacy names only in adapters, fixtures, docs, migration reports |
| Product ontology survives | `Member`, `Community`, `Space`, `Account` reused as canonical | Require ontology disposition and canonical mappings before projection |
| ORM models define meaning | Prisma/Drizzle schemas treated as contracts | Contracts live only under `packages/contracts`; ORMs implement adapters |
| Legacy event logs fragment memory | Local audit logs remain authoritative | Canonical event emission for every consequential mutation |
| Governance bypass | Admin tools mutate rights, policy, allocations, credit limits | Command handlers require permission result and `authorityRefs` |
| AI synthesis becomes authority | Sensemaking summaries recorded as truth | AI outputs remain draft/evidence/model-derived until reviewed |
| Reputation leakage | CommonCredit/Stewardship contribution and endorsement surfaces | Retire root scores; preserve contextual evidence only |
| Stewardship becomes SaaS tenant app | Community terminology and active-org metrics drive ontology | Map to Organization/Commons/Place; keep metrics operational, not product meaning |
| ICOS constitutional overreach | One profile hard-coded as universal | Keep profiles configurable; hard-code only kernel invariants |
| Ecology becomes decoration | Thresholds and indicators shown but not connected to governance | Material workflows require ecological hooks and guardian review paths |
| Accounting dominates coordination | Mutual credit becomes the economic ontology | Treat accounting as optional method under commitments, allocations, and policies |
| Projections become authority | Shell read models allow write decisions from cached state | Link views to source refs and route writes through command services |
| Sensitive data leaks through unified memory | Search/export exposes evidence, care, or ecological locations | Visibility inheritance, redacted stubs, stewardship agreements, export previews |

## 12. Verification Checklist

Before any workflow is called folded into Canopy, verify:

- It has a Canopy capability destination.
- Its local nouns have ontology dispositions.
- All user-visible root objects have stable `ObjectRef`s.
- Cross-capability references use `ObjectRef`, not legacy IDs.
- Actor identity is split into person, auth account, membership, role, mandate, delegation, and guardian where applicable.
- Permission checks use the kernel request/result shape.
- Binding actions include `authorityRefs`.
- Decision-relevant assertions are claims linked to evidence.
- AI, model, sensor, and imported outputs are visibly typed.
- Consequential changes emit canonical events.
- Event writes are append-only or protected by equivalent enforcement.
- Corrections, reversals, redactions, and supersessions are new events.
- Data visibility, data state, consent, retention, export, and federation rules are explicit.
- Object pages render through Canopy projections.
- Search traverses canonical objects and local terms.
- Decision packets can be reconstructed from refs and events.
- Ledger entries are append-only and reversed only by reversal entries.
- Use rights are scoped, revocable, authority-backed, and reviewable.
- Contributions cannot become rankings or hidden eligibility.
- Ecological hooks appear for material resource and flow decisions.
- Export envelopes include object refs, schema versions, event trail, data stewardship agreements, content hash, local mappings, and redaction summary.
- Replay from events rebuilds projections for the workflow.
- The shell does not require the user to know the source project.

## 13. First 30 Implementation Tasks

1. Create the monorepo skeleton with workspace config, TypeScript base config, test config, dependency rules, and package exports.
2. Scaffold `packages/contracts/kernel`, `governance`, `domain`, `ui`, `adapters`, and `testing`.
3. Add architecture rules blocking provider, ORM, UI framework, app, and legacy adapter imports from contract packages.
4. Implement `ObjectRef`, `CanopyObjectType`, `CanopyCapability`, schema version, lifecycle status, and validation error contracts.
5. Implement identity contracts: `Person`, `Account`, `Organization`, `Membership`, `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`, `Credential`.
6. Implement permission contracts: `PermissionAtom`, `AccessRule`, `PermissionCheckRequest`, `PermissionCheckResult`.
7. Implement data stewardship contracts: visibility, data state, consent, retention, export rules, federation rules, redaction metadata.
8. Implement claims/evidence contracts: `Claim`, `Counterclaim`, `Source`, `Evidence`, `EvidenceLink`, review states, evidence types.
9. Implement `CanopyEvent`, event namespaces, minimum event type constants, redaction continuity, and event authority validation helpers.
10. Implement export envelope and federation rule contracts.
11. Implement governance contracts for issues, perspectives, proposals, amendments, objections, decisions, decision packets, agreements, policies, policy versions, appeals, conflicts, votes, consent signals, and quorum state.
12. Implement domain contracts for places, commons, living systems, resources, stocks, flows, indicators, thresholds, guardian reviews, ecological hooks, models, scenarios, and model outputs.
13. Implement domain contracts for needs, capabilities, requests, offers, commitments, allocations, obligations, use rights, ledger accounts, ledger entries, budgets, treasuries, routines, tasks, contributions, outcomes, audits, retrospectives, local terms, and canonical mappings.
14. Add golden fixtures for identity, authority, claims/evidence, governance, stewardship, allocation/accounting, ecology, event, export, redaction, and federation.
15. Implement adapter contracts for auth, persistence, event store, object graph, document storage, geospatial, time-series, vector, object storage, federation transport, and legacy projects.
16. Implement adapter conformance harness with object-ref round trip, command write, event append, projection rebuild, and mapping validation tests.
17. Create canonical database shapes for `canopy_object_ref_map`, `canopy_canonical_mappings`, `canopy_events`, `canopy_outbox`, `canopy_projection_state`, and `canopy_adapter_audit`.
18. Create import-plan templates for CommonCredit, ICOS, Sensemaking, and Stewardship.
19. Inventory and classify source nouns from the four projects into `KEEP`, `MERGE`, `SUBTYPE`, `ALIAS`, `ARTIFACT`, `RETIRE`, and `VALUE`.
20. Define data stewardship defaults for each source table and sensitive field class.
21. Build the object-ref mapping runner and idempotency tests.
22. Implement the Stewardship legacy adapter fixture for community, resource, access right, policy, policy version, maintenance task, contribution, decision, and food-flow rows.
23. Implement the Sensemaking legacy adapter fixture for issue, source, claim, stakeholder group, theme, and contribution rows.
24. Emit canonical fixture events from the Stewardship and Sensemaking adapters.
25. Build object-page, claim/evidence, authority, resource-stewardship, decision-packet, and civic-memory projections for those fixtures.
26. Implement the ICOS legacy adapter fixture for issue, perspective, delegation, decision record, timeline event, referendum, export bundle, and surplus/shortage declaration rows.
27. Implement the CommonCredit legacy adapter fixture for organization, member, ledger account, ledger entry, offer, need, invoice, credit-limit request, dispute, treasury allocation, and project task rows.
28. Build the first Canopy shell object page and civic memory timeline against projections, with no legacy app navigation.
29. Run the Riverbend Foodshed Commons thin slice from threshold breach, need, offer, claim/evidence, proposal, guardian review, decision, use right/allocation, commitment, flow, task, outcome, retrospective, and export.
30. Produce the first fold-in validation report covering mapping coverage, event coverage, authority coverage, data stewardship coverage, replay parity, shell leakage, and unresolved risks.

## 14. Acceptance Criteria

The fold-in execution is acceptable when:

- Canopy contracts build and validate without importing app code, ORM clients, auth SDKs, UI frameworks, queue clients, storage clients, or legacy adapters.
- Every source project has a documented disposition, mapping inventory, data stewardship default set, and legacy adapter home.
- Legacy project names appear only in adapters, fixtures, migration reports, and source notes.
- No user-facing shell route, primary navigation item, object type, permission, or role is named after CommonCredit, ICOS, Sensemaking, or Stewardship.
- Source rows can resolve to stable `ObjectRef`s and back to local rows in tests.
- Unknown local subtypes are reported for review.
- Stewardship and Sensemaking fixture adapters produce canonical objects, events, and object pages before CommonCredit accounting is activated.
- ICOS governance and memory fixtures can produce decision packets and append-only civic memory events.
- CommonCredit ledger fixtures preserve double-entry and reversal invariants while mapping `Account` to `LedgerAccount`.
- Binding decisions, policy versions, use-right grants, credit-limit changes, allocations, delegations, data disclosure changes, and federation changes fail validation without authority refs.
- AI, model, sensor, and imported records are typed as such and cannot validate as binding decisions.
- Consequential changes write canonical events; corrections, redactions, reversals, and supersessions write new events.
- Object-page, search, attention, decision-packet, civic-memory, export, and federation UI contracts hydrate from Canopy projections.
- The Riverbend Foodshed Commons thin slice can be replayed from canonical events and exported with object refs, schema versions, event trail, content hash, data stewardship agreements, local mappings, and redaction summary.
- A reviewer can start from any key object in the slice and trace authority, claims/evidence, decision, obligations, flows, outcomes, data rules, and memory without entering a legacy app.
- The implementation preserves the cybernetic loop from observation through learning.

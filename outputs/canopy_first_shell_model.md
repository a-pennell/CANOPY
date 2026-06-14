# Canopy First Shell Model

## 1. Shell Thesis

The first Canopy shell is a scoped civic and ecological operating surface over the kernel, object graph, claims and evidence layer, governance spine, civic memory, data stewardship layer, and federation contract.

It is not a landing page, dashboard wrapper, MVP shell, or set of legacy app entry points. It is the first coherent user-facing model for the full Canopy ecosystem.

The shell must make one product truth unavoidable:

```text
Canopy is a scoped object environment for observing reality, understanding claims, simulating tradeoffs, deliberating legitimately, coordinating commitments, acting within ecological limits, and learning from outcomes.
```

Users should experience Canopy through:

- Scope: where, with whom, under which authority, and under which data rules they are acting.
- Objects: places, commons, living systems, resources, claims, proposals, decisions, commitments, flows, policies, indicators, outcomes, and other canonical objects.
- Memory: append-only civic events that explain what changed, who acted, under what authority, using what evidence, and with what consequences.
- Attention: actionable review, response, stewardship, governance, ecological, data, and learning work.
- Capabilities: surfaces that help users operate on the shared object graph without becoming separate apps.

The shell succeeds when users never need to know whether an interaction descends from CommonCredit, ICOS, Sensemaking, or Stewardship. They move through Canopy objects, scopes, attention, decisions, memory, and capability surfaces.

### Shell Invariants

- One global identity and authority model.
- One global scope switcher.
- One global object search.
- One attention inbox.
- One civic memory surface.
- One universal object page grammar.
- One permission explanation pattern.
- One data stewardship pattern.
- One federation and export pattern.
- No old product names in primary navigation, object categories, roles, or user-facing capability labels.
- No consequential action without authority context, data stewardship context, and a civic memory result.

## 2. First-Screen Operating Surface

The first screen after sign-in is the user's scoped operating console. It is not a marketing home, generic dashboard, activity feed, or module launcher.

### Default First Screen

The default first screen is `Home` within the user's last active or most urgent scope.

Required regions:

1. Global header.
2. Scope rail or compact scope drawer.
3. Primary operating surface.
4. Context panel.
5. Attention and command overlays.

### First-Screen Content Model

The first screen must answer seven questions:

1. What scope am I in?
2. What is happening that requires attention?
3. Which objects are currently active, contested, blocked, or due for review?
4. Which commitments, decisions, policies, or thresholds are approaching consequence?
5. What changed recently in civic memory?
6. What actions can I legitimately take from this scope?
7. What data visibility or federation state affects what I am seeing?

### Required First-Screen Panels

| Panel | Purpose | Required behavior |
| --- | --- | --- |
| Scope summary | Shows active scope, scope type, relation, authority, and data visibility | Must show membership, mandate, stewardship, guardianship, observer, or federation relation |
| Priority attention | Shows actionable items requiring review, response, decision, care, verification, or learning | Must group by required role and consequence, not engagement |
| Active objects | Shows recently touched or currently consequential objects | Must include canonical type, local term, state, scope chips, visibility, and last memory event |
| Commitments and obligations | Shows promises, allocations, tasks, use rights, and reviews due | Must distinguish promised, blocked, overdue, fulfilled, and contested |
| Ecological context | Shows living-system indicators, breached thresholds, guardian reviews, and ecological issues relevant to the scope | Must appear where material coordination affects land, food, water, energy, infrastructure, waste, or living systems |
| Governance lane | Shows active issues, proposals, decision packets, policy reviews, appeals, and conflicts | Must show readiness and authority requirements |
| Civic memory digest | Shows recent consequential events and redacted stubs | Must link every event to object pages and affected scopes |
| Suggested commands | Shows permission-aware next actions | Must preview authority and memory result for consequential commands |

### First-Screen Food Resilience Readiness

For the first vertical slice, the first screen must be able to show:

- Riverbend Foodshed Commons as the active scope.
- Green Acre Farm surplus offer.
- Northside School Kitchen procurement need.
- Mill Creek Watershed nitrate threshold breach.
- Guardian review required.
- Food-flow issue created under watershed constraint.
- Scenario comparison ready for deliberation.
- Decision packet in progress.
- Commitments, tasks, flow records, outcomes, and retrospective as the path advances.

## 3. Global Navigation And Scope Switching Model

Canopy navigation has three layers: global operating modes, capability surfaces, and object-local navigation.

### Global Header

Required controls:

- Canopy instance identity.
- Active scope switcher.
- Global object search.
- Command palette trigger.
- Attention inbox trigger.
- Civic memory trigger.
- User/session menu.
- Data visibility indicator when relevant.
- Federation indicator when current scope or object is shared.

Header rules:

- Search is object search, not page search.
- Scope is always visible before consequential action.
- Old product names never appear as navigation tabs.
- Data visibility and federation signals are compact but inspectable.

### Global Operating Modes

Primary shell modes:

- Home.
- Search.
- Attention.
- Map.
- Graph.
- Lists.
- Civic Memory.
- Capabilities.

These are modes over the same object graph, not separate applications.

### Capability Surface Entry Points

The Capabilities mode exposes:

- Reality Map.
- Commons Registry.
- Living Systems.
- Needs and Capabilities.
- Claims and Evidence.
- Deliberation.
- Agreements and Policies.
- Allocation and Accounting.
- Flows.
- Simulation and Models.
- Care Coordination.
- Learning and Accountability.
- Federation.

Capability labels must be treated as lenses and work surfaces. They must not create separate histories, permissions, object identities, or search worlds.

### Scope Switcher Model

The scope switcher is the primary contextual control in the shell.

It must support:

- Single scope.
- Nested scope.
- Comparative scope.
- Federation scope.
- Personal work scope.

Required scope fields:

- Scope name.
- Scope type: personal, organization, place, commons, living system, project, routine, governance process, federation context.
- Parent and child scopes.
- User relation: member, steward, guardian, mandate holder, delegate, facilitator, observer, affected participant.
- Active role or mandate.
- Data visibility state.
- Federation state.
- Local terminology profile.
- Relevant policies and governance defaults.

Scope effects:

- Search ranking.
- Object visibility.
- Command availability.
- Default map extent.
- Civic memory filters.
- Attention priority.
- Local terms.
- Applicable policies.
- Permission explanations.
- Federation and export affordances.

Scope rules:

- Scope is not a folder.
- Objects may belong to many scopes.
- Switching scope changes authority, relevance, visibility, and local language, not object identity.
- Administrative and ecological scopes must coexist. Watershed, foodshed, habitat, airshed, and bioregion are first-class scope contexts.

## 4. Object Page Anatomy

Object pages are the main unifying interface. Every canonical root object must render through the same underlying grammar, with object-specific emphasis where appropriate.

### Universal Header

Required fields:

- Object name or title.
- Canonical object type.
- Local term or alias.
- Scope chips.
- Steward, guardian, authority, or owner-of-record distinction where applicable.
- Lifecycle status.
- Data state.
- Last verified or updated date.
- Visibility state.
- Federation state.
- Primary actions.

The header must never collapse stewardship into ownership. Legal ownership, if relevant, appears as one relationship among others.

### Universal Sections

Every applicable object page includes:

1. Current state.
2. Relationships.
3. Claims and evidence.
4. Governance and authority.
5. Commitments and obligations.
6. Ecological context.
7. Activity and civic memory.
8. Outcomes and learning.
9. Data stewardship and permissions.
10. Federation and export.

If a section is not applicable, the page should say why when the absence affects interpretation. For example, ecological context can be marked "No material living-system impact declared" rather than silently omitted.

### Action Zones

Object-local actions are grouped by cybernetic function:

- Observe: add observation, upload source, record condition, record indicator, record flow.
- Govern: open issue, create proposal, add perspective, request review, file appeal.
- Coordinate: create request, make offer, create commitment, assign task, log contribution, create allocation.
- Learn: record outcome, start retrospective, request audit, propose policy review.
- Federate: export object, fork scope, request sync, reconcile conflict.

Actions must appear only when permission checks allow them. Denied actions should show the source of denial and appeal path where safe.

### Required Object Page Variants

| Object | Required emphasis |
| --- | --- |
| Commons | boundaries, members, policies, resources, routines, active issues, indicators, federation |
| LivingSystem | boundary, indicators, thresholds, guardians, ecological claims, uncertainty, affected proposals, restoration obligations |
| Resource | condition, stewardship, use rights, stock, flows, maintenance routines, policies, ecological context |
| Claim | text, claimant, about objects, evidence links, counterclaims, review status, decision usage |
| Issue | scope, affected refs, claims, perspectives, scenarios, proposals, readiness, attention state |
| Proposal | affected objects, authority, evidence, perspectives, scenarios, guardian review, decision method, objections |
| Decision | authority, method, rationale, unresolved objections, created obligations, review date, supersession |
| Commitment | parties, promise, fulfilled request/offer/allocation, obligations, tasks, state, outcomes |
| Flow | source, destination, route, resource, quantity, timing, loss/waste, ecological claims, linked commitment |
| Policy | rule text, authority, versions, affected objects, review date, thresholds, obligations |
| Model | purpose, steward, inputs, assumptions, scenarios, uncertainty, audit history, affected decisions |
| Outcome | observed result, indicator effects, claims, evidence, commitments closed or reopened, learning questions |

## 5. Civic Memory Surface

Civic memory is the shell's shared historical layer. It is not a notification feed, activity stream, or per-module audit log.

### Memory Views

The shell must provide:

- Object-local memory timeline.
- Scope-level memory view.
- Cross-scope memory search.
- Decision packet history.
- Supersession history.
- Import/export/federation events.
- Redacted event stubs.
- Audit and integrity view.
- Human review digest.

### Memory Item Anatomy

Each memory item must show:

- Event type.
- What changed.
- Actor or system source.
- Affected object.
- Affected scope.
- Authority refs where applicable.
- Claims, evidence, decision packet, or policy refs where applicable.
- Visibility and data state.
- Supersession relationship where applicable.
- Federation/export relationship where applicable.
- Consequence or next review where applicable.

### Memory Behavior

- Consequential mutations write canonical events.
- Corrections and reversals are new events, not destructive edits.
- Redacted stubs preserve event continuity without exposing protected detail.
- AI-generated interpretation events are labeled and cannot stand in for decisions.
- Memory supports forgiveness by distinguishing institutional accountability from permanent personal scoring.

## 6. Attention Inbox Model

The attention inbox is Canopy's shared queue for actionable civic, ecological, stewardship, governance, coordination, care, data, and learning work.

It is not a generic notification center.

### Attention Types

Required types:

- Threshold breached.
- Claim challenged.
- Evidence requested.
- Review due.
- Proposal ready for deliberation.
- Decision blocked.
- Guardian review required.
- Commitment overdue.
- Task blocked.
- Appeal filed.
- Conflict needs facilitation.
- Model audit due.
- Policy sunset approaching.
- Federation conflict detected.
- Data access request pending.
- Care load warning.
- Outcome review due.
- Export or fork review required.

### Attention Item Anatomy

Each item must show:

- Type.
- Affected object.
- Scope.
- Severity or urgency.
- Due date or trigger.
- Required role, mandate, or relation.
- Related claims and evidence.
- Suggested next action.
- Consequence of inaction.
- Visibility and sensitivity state.
- Assignment, deferral, dismissal, and escalation affordances.

### Routing Rules

Routing is based on:

- Role assignments.
- Mandates.
- Delegations.
- Guardianship.
- Stewardship responsibility.
- Membership.
- Consent and data access.
- Object subscriptions.
- Governance participation.
- Federation agreements.

Attention generated by AI must identify basis, uncertainty, and review path. Care-related attention must preserve privacy and avoid coercive visibility.

## 7. Global Object Search And Command Palette

### Global Object Search

Search must traverse the shared object graph.

Searchable families:

- Actors and authority.
- Reality and commons.
- Epistemics and sensemaking.
- Governance and memory.
- Coordination, allocation, and accounting.
- Action, care, and stewardship.
- Data, federation, and integrity.

Each result must show:

- Object name.
- Canonical type and local term.
- Scope chips.
- Current state.
- Steward, guardian, or authority relation where applicable.
- Claim/evidence confidence or contestability signal.
- Active attention state.
- Visibility and access status.
- Federation state.
- Last significant civic memory event.

Search modes:

- Direct object lookup.
- Semantic evidence and memory search.
- Relationship search.
- Attention search.
- Authority search.
- Geographic search.
- Time-bounded memory search.
- Federation search.

Search must distinguish facts, claims, evidence, model outputs, AI summaries, decisions, and policies.

### Command Palette

The command palette is the fast path for legitimate action.

Command sources:

- Active scope.
- Current object.
- User role and mandates.
- Data stewardship rules.
- Object lifecycle state.
- Capability manifests.
- Open attention items.
- Governance processes.

Command categories:

- Create object.
- Add observation.
- Add claim or evidence.
- Challenge or request review.
- Open issue.
- Create proposal.
- Make decision packet.
- Create agreement or policy.
- Create request or offer.
- Create commitment.
- Create allocation.
- Assign task.
- Record flow.
- Record outcome.
- Start retrospective.
- Export or fork.
- Request access.

Consequential commands must preview:

- Object mutation.
- Authority source.
- Data visibility effect.
- Claims/evidence touched.
- Civic memory event to be written.
- Appeal or review path.
- Federation/export impact where applicable.

## 8. Capability Surfaces

Capability surfaces are task-oriented workspaces over the shared object graph. They expose domain behavior without becoming app silos.

Every capability surface must include:

- Scope-aware entry state.
- Relevant object set.
- Map, graph, or list view when applicable.
- Capability-specific attention.
- Common commands.
- Recent civic memory.
- Governance hooks.
- Claims/evidence hooks.
- Data stewardship state.
- Federation/export state where applicable.

### Allocation And Accounting

Purpose:

Coordinate requests, offers, commitments, allocations, obligations, use rights, budgets, and optional settlement.

Required UI:

- Request/offer matching board.
- Allocation proposal composer.
- Commitment ledger.
- Obligation tracker.
- Use-right grant panel.
- Settlement/ledger panel only when the scope has adopted an accounting method.
- Dispute and appeal path.

Rules:

- Accounting is commitment memory, not the center of social value.
- No contribution, credit, or fulfillment view may create hidden person rankings or portable eligibility scores.
- Allocations must cite authority refs.

### Sensemaking

Purpose:

Make claims, evidence, sources, counterclaims, perspectives, themes, assumptions, and review states legible across all objects.

Required UI:

- Claims table.
- Evidence room.
- Counterclaim lane.
- Review queue.
- Source ingestion workflow.
- AI extraction draft review.
- Decision usage panel.

Rules:

- Decision-relevant assertions are claims.
- Evidence supports, challenges, contextualizes, qualifies, or supersedes claims.
- AI extraction remains draft or machine-inferred until reviewed.

### Stewardship

Purpose:

Operate resources, commons, use rights, routines, tasks, maintenance cycles, contributions, policies, and obligations.

Required UI:

- Resource registry.
- Use-right matrix.
- Routine and task board.
- Maintenance/restoration cycle view.
- Policy attachment panel.
- Contribution logging with anti-ranking constraints.
- Resource condition timeline.

Rules:

- Stewardship is broader than ownership.
- Use rights are scoped, revocable, governed, and reviewable.
- Care, repair, maintenance, and restoration work are visible without becoming productivity scoring.

### Governance

Purpose:

Move issues through perspectives, evidence, proposals, amendments, objections, decisions, agreements, policies, appeals, and learning.

Required UI:

- Issue workspace.
- Proposal builder.
- Perspective map.
- Objection and amendment lane.
- Decision packet builder.
- Decision method selector.
- Appeal/conflict entry point.
- Review date and supersession tracker.

Rules:

- Decisions cannot be recorded without authority refs.
- Minority reports and unresolved objections remain visible.
- Guardian review, affected-party analysis, and ecological threshold status appear when relevant.

### Ecological Context

Purpose:

Make living systems first-class in coordination, governance, simulation, and learning.

Required UI:

- Living-system object page.
- Indicator and threshold panel.
- Guardian review queue.
- Affected proposal map.
- Ecological claim and evidence lane.
- Scenario impact comparison.
- Restoration obligation tracker.

Rules:

- Threshold classes are advisory, governance trigger, and binding.
- Binding constraints require legitimate policy or agreement.
- Sensitive ecological data must be protected without erasing accountability.

## 9. Map/Graph/List Triad

The map/graph/list triad is the shell's shared way to inspect complex object sets.

### Shared Query Model

The same result set must be viewable as:

- Map when spatial, ecological, infrastructural, or flow relationships matter.
- Graph when authority, claims, dependencies, governance, flows, or federation relationships matter.
- List when review, comparison, inventory, queue, or bulk action matters.

Switching views must not change the underlying query unless the user changes filters.

### Map

Required layers:

- Places.
- Commons.
- Living systems.
- Resources.
- Flows.
- Indicators.
- Thresholds.
- Administrative boundaries.
- Ecological boundaries.
- Federation boundaries.

Sensitive locations must honor data stewardship agreements.

### Graph

Required graph capabilities:

- Canonical relationship labels.
- Local term overlays.
- Authority path view.
- Claims/evidence view.
- Policy effect view.
- Flow dependency view.
- Need/capability match view.
- Federation link view.

Every node must resolve to an object page.

### List

Required list capabilities:

- Scope filter.
- Type filter.
- State filter.
- Authority filter.
- Attention filter.
- Visibility filter.
- Federation filter.
- Bulk review where permissions allow.

Lists must not become module-specific table worlds.

## 10. Decision Packet UX Model

A decision packet is the portable, inspectable record of a consequential choice.

### Packet Builder

The packet builder is opened from an issue, proposal, attention item, or command.

Required sections:

1. Issue and proposal.
2. Affected objects.
3. Scope and authority.
4. Claims and evidence.
5. Counterclaims and unresolved disagreements.
6. Perspectives and affected parties.
7. Ecological thresholds and guardian review.
8. Scenarios and model outputs.
9. Options considered.
10. Decision method.
11. Participation record.
12. Objections and amendments.
13. Final decision.
14. Agreements, policies, commitments, allocations, obligations, or use rights created.
15. Review date.
16. Outcome tracking plan.
17. Data stewardship and export rules.

### Packet States

- Draft.
- Evidence incomplete.
- Guardian review required.
- Deliberation open.
- Ready for decision.
- Decision recorded.
- Appealed.
- Superseded.
- Under outcome review.
- Exported or federated.

### Packet Rules

- Claims and evidence are cited, not buried in prose.
- Scenario outputs are evidence, not decisions.
- AI summaries are reviewable artifacts, not authority.
- Uncertainty and unresolved objections are preserved.
- Packets become civic memory and link from every affected object.
- Packets must be exportable with content hash, schema version, stewardship rules, and redaction summary.

## 11. Data Stewardship And Permission UI Patterns

Data stewardship is visible wherever knowledge, privacy, consent, access, export, or federation matter.

### Data Signals

Show compact signals for:

- Visibility: public, federation, organization, commons, role restricted, guardian restricted, private, embargoed, sealed.
- Data state: unverified, locally verified, expert reviewed, institutionally certified, contested, outdated, sensitive, archived, machine inferred, sensor derived, testimony derived, model derived.
- Consent state.
- Access rules.
- Allowed uses.
- Prohibited uses.
- Retention rule.
- Export rule.
- Federation rule.
- Redaction summary.

### Permission Explanation Pattern

For every consequential action, the UI must be able to show:

- Allowed or denied.
- Source refs supporting the result.
- Acting mandate or role.
- Conditions.
- Reason.
- Required appeal path where applicable.

Denied actions should remain visible as disabled affordances when doing so helps explain governance, unless visibility itself would disclose protected information.

### Data Stewardship Actions

Required actions:

- Request access.
- Challenge visibility.
- View redaction summary.
- Change or propose change to data stewardship agreement.
- Revoke or revise consent where governance allows.
- Export object.
- Fork scope.
- Appeal data access decision.

### Redaction Pattern

Redacted objects and events should show:

- That a record exists.
- Object type where safe.
- Scope where safe.
- Event type where safe.
- Reason category for redaction.
- Access request path where safe.
- Stewardship agreement ref where safe.

## 12. Federation/Forkability UI Patterns

Federation and forkability must be present in the first shell model even if full sync is not complete.

### Federation Signals

Show:

- Local object.
- Federated object.
- Shared scope.
- Imported object.
- Exportable object.
- Redacted federation object.
- Sync pending.
- Reconciliation required.
- Defederation under review.

### Federation Surface

The Federation capability surface must include:

- Shared scopes.
- Federation agreements.
- Export envelopes.
- Import queue.
- Sync status.
- Reconciliation conflicts.
- Fork requests.
- Defederation processes.
- Redaction summaries.
- Schema version status.

### Export/Fork Flow

Required steps:

1. Select scope, object set, decision packet, or memory trail.
2. Preview included objects and event types.
3. Show data stewardship agreements.
4. Show redactions and non-federating records.
5. Show schema versions.
6. Generate export envelope and content hash.
7. Write civic memory event.
8. Provide import/reconciliation instructions for receiving instance.

Rules:

- Export must preserve provenance, stewardship rules, schema versions, and memory.
- Forkability is a governed exit pattern, not a download button alone.
- Defederation preserves local records and creates visible memory.

## 13. AI Copilot/Assistant Boundaries

AI appears as assistance inside the shell, not as sovereign authority.

### Appropriate AI Surfaces

AI may:

- Summarize object state.
- Identify unresolved claims.
- Suggest related evidence.
- Extract possible claims from sources.
- Identify attention patterns.
- Match needs and capabilities.
- Surface relevant policies.
- Compare scenarios.
- Draft decision packet summaries.
- Translate or simplify participation materials.
- Flag missing perspectives or data gaps.

### Required AI Labels

Every AI output must show:

- AI assistance label.
- Inputs used.
- Sources or object refs.
- Assumptions.
- Uncertainty.
- Excluded data where known.
- Data visibility inherited.
- Challenge, hide, revise, or request review actions.

### AI Hard Boundaries

AI must not:

- Record binding decisions.
- Grant mandates.
- Grant use rights.
- Allocate resources without human or governed confirmation.
- Convert people into hidden scores.
- Replace guardian review.
- Hide minority reports or unresolved objections.
- Collapse plural values into one hidden optimization metric.
- Bypass data stewardship agreements.

Consequential AI-mediated changes must route through human-confirmed workflows and write civic memory events.

## 14. Responsive Layout Rules

The shell must preserve the same operating model across desktop, tablet, and mobile.

### Desktop

Optimized for:

- Persistent scope rail.
- Multi-pane object review.
- Map/graph/list switching.
- Context panel.
- Decision packet comparison.
- Civic memory investigation.
- Bulk stewardship work.

Layout:

- Fixed global header.
- Left scope rail.
- Center primary workspace.
- Right context panel.
- Attention and command overlays.

### Tablet

Optimized for:

- Field review.
- Map/object alternation.
- Meeting facilitation.
- Proposal review.
- Evidence capture.

Layout:

- Compact header.
- Collapsible scope drawer.
- Primary workspace full width.
- Context panel as side sheet.
- Attention as queue overlay.
- Commands as side sheet or bottom sheet depending on orientation.

### Mobile

Optimized for:

- Capture.
- Search.
- Attention response.
- Lightweight participation.
- Field observations.
- Commitment updates.

Layout:

- Compact scope switcher.
- Bottom navigation: Home, Search, Attention, Map, More.
- Object pages as stacked sections.
- Context as expandable panels.
- Commands as bottom sheet.
- Sensitive actions with authority preview.

Mobile rules:

- Do not hide authority, visibility, federation, or scope to save space.
- Do not force complex deliberation into cramped flows; offer review mode and save-for-later.
- Field capture must support draft-first behavior.
- Offline or uncertain evidence capture must clearly mark data state.

## 15. Required Shell States And Empty/Error/Contested States

### Required System States

- Signed out.
- First sign-in without memberships.
- Membership pending.
- Scope selected.
- No scope selected.
- Personal work scope.
- Active mandate.
- Mandate expired.
- Acting under delegation.
- Guardian role active.
- Observer-only access.
- Federation shared scope.
- Offline or degraded connection.

### Object States

- Draft.
- Active.
- Under review.
- Contested.
- Blocked.
- Superseded.
- Archived.
- Restricted.
- Redacted.
- Federated.
- Export pending.

### Empty States

Empty states must teach the object grammar without marketing language.

Examples:

- No active claims: "No claims have been recorded for this object."
- No commitments: "No commitments are currently linked to this object."
- No ecological context: "No living-system impact has been declared for this object."
- No attention: "No actionable attention items in this scope."
- No federation: "This scope is local only."

Each empty state should offer the smallest legitimate next action when permission allows.

### Error States

Required error patterns:

- Permission denied with explainable source refs or protected explanation.
- Data restricted with access request path where safe.
- Scope unavailable.
- Object not found.
- Object exists but redacted.
- Civic memory replay incomplete.
- Federation sync failed.
- Export failed.
- Schema version mismatch.
- Model output unavailable.
- Evidence source unavailable.

### Contested States

The shell must represent contestation as normal civic life, not as system failure.

Required contested patterns:

- Claim contested.
- Evidence challenged.
- Authority challenged.
- Guardian challenged.
- Model assumption disputed.
- Decision appealed.
- Policy under review.
- Threshold class disputed.
- Federation conflict detected.
- Data visibility challenged.

Contested states must preserve original records, counterclaims, review status, and next process.

## 16. Implementation-Ready Component Inventory

### Shell Frame

- `CanopyShellFrame`
- `GlobalHeader`
- `ScopeRail`
- `ScopeSwitcher`
- `ScopeMap`
- `PrimaryWorkspace`
- `ContextPanel`
- `ResponsiveShellLayout`
- `BottomNav`

### Scope And Authority

- `ScopeChip`
- `ScopeSummaryPanel`
- `ScopeRelationBadge`
- `MandateBadge`
- `DelegationBadge`
- `GuardianBadge`
- `AuthorityPreview`
- `PermissionExplanation`
- `AppealPathLink`

### Search And Commands

- `GlobalObjectSearch`
- `SearchResultRow`
- `SearchFilterBar`
- `SearchModeTabs`
- `CommandPalette`
- `CommandResultRow`
- `CommandPreview`
- `ConsequentialActionConfirm`

### Object Pages

- `ObjectPage`
- `ObjectHeader`
- `ObjectStatePanel`
- `RelationshipPanel`
- `ClaimsEvidencePanel`
- `GovernanceAuthorityPanel`
- `CommitmentsObligationsPanel`
- `EcologicalContextPanel`
- `CivicMemoryPanel`
- `OutcomesLearningPanel`
- `DataStewardshipPanel`
- `FederationMetadataPanel`
- `ObjectActionZones`

### Civic Memory

- `CivicMemoryView`
- `MemoryTimeline`
- `MemoryEventCard`
- `RedactedEventStub`
- `MemoryFilterBar`
- `SupersessionTrail`
- `DecisionPacketHistory`
- `MemoryDigest`

### Attention

- `AttentionInbox`
- `AttentionItemCard`
- `AttentionQueueFilters`
- `AttentionAssignmentControl`
- `AttentionDeferControl`
- `AttentionConsequencePreview`

### Capability Surfaces

- `CapabilitySurfaceFrame`
- `RealityMapSurface`
- `CommonsRegistrySurface`
- `LivingSystemsSurface`
- `NeedsCapabilitiesSurface`
- `ClaimsEvidenceSurface`
- `DeliberationSurface`
- `AgreementsPoliciesSurface`
- `AllocationAccountingSurface`
- `FlowsSurface`
- `SimulationModelsSurface`
- `CareCoordinationSurface`
- `LearningAccountabilitySurface`
- `FederationSurface`

### Map/Graph/List

- `TriadSwitcher`
- `ObjectMapView`
- `ObjectGraphView`
- `ObjectListView`
- `SharedQuerySummary`
- `LayerControl`
- `RelationshipLegend`
- `BulkReviewToolbar`

### Decision Packets

- `DecisionPacketBuilder`
- `DecisionPacketViewer`
- `PacketReadinessChecklist`
- `AffectedObjectsSection`
- `AuthorityRefsSection`
- `ClaimsEvidenceCitationSection`
- `PerspectiveSection`
- `GuardianReviewSection`
- `ScenarioComparisonSection`
- `ObjectionsAmendmentsSection`
- `DecisionRecordSection`
- `OutcomeTrackingPlanSection`
- `PacketExportPanel`

### Data Stewardship

- `VisibilityBadge`
- `DataStateBadge`
- `ConsentStateIndicator`
- `AccessRuleList`
- `DataStewardshipAgreementViewer`
- `RedactionSummary`
- `AccessRequestFlow`
- `VisibilityChallengeFlow`
- `RetentionRuleBadge`
- `ExportRuleBadge`

### Federation

- `FederationBadge`
- `ExportEnvelopePreview`
- `FederationAgreementCard`
- `SyncStatusIndicator`
- `ReconciliationQueue`
- `ForkScopeFlow`
- `DefederationFlow`
- `SchemaVersionBadge`

### AI Assistance

- `AIAssistPanel`
- `AISummaryCard`
- `AIInputsDisclosure`
- `AIUncertaintyBadge`
- `AIChallengeActions`
- `AIReviewRequiredBanner`

### State And Feedback

- `EmptyState`
- `ErrorState`
- `ContestedStateBanner`
- `BlockedStateBanner`
- `OfflineDraftBanner`
- `SensitiveActionWarning`
- `MemoryWritePreview`

## 17. Acceptance Criteria

### Shell Coherence

- The shell exposes Canopy as one environment, not a group of old apps.
- Primary navigation contains no CommonCredit, ICOS, Sensemaking, or Stewardship labels.
- Every persistent object routes to a universal object page.
- Capability surfaces read and write canonical object refs.
- Consequential actions write civic memory events.

### First-Screen Acceptance

- A user can land in a scope and immediately see attention, active objects, commitments, ecological context, governance state, civic memory, and legitimate commands.
- The first screen can represent the watershed-aware food resilience path without introducing separate app navigation.
- Scope, authority, data visibility, and federation signals are visible before action.

### Scope And Permission Acceptance

- Scope switching changes search ranking, object visibility, command availability, memory filters, local terms, policies, and permission explanations.
- Permissions are explained with allowed/denied result, source refs, mandate or role, conditions, and appeal path where applicable.
- No decision, allocation, use-right grant, commitment, export, or federation action can be completed without authority context.

### Object Page Acceptance

- Commons, LivingSystem, Resource, Claim, Issue, Proposal, Decision, Commitment, Flow, Policy, Model, and Outcome pages can render through the universal anatomy.
- Object pages distinguish claims, evidence, perspectives, model outputs, AI summaries, policies, and decisions.
- Object pages show civic memory, data stewardship, and federation metadata where applicable.

### Civic Memory Acceptance

- The shell can replay a full path from observation through learning using append-only memory events.
- Corrections, reversals, appeals, and supersessions create new memory events.
- Redacted stubs preserve continuity without exposing protected detail.
- Memory can be filtered by governance, claims/evidence, stewardship, allocation/accounting, ecology, care, flows, modeling, federation, integrity, and learning.

### Attention Acceptance

- Attention items are actionable, assignable, deferrable, dismissible, reviewable, or escalatable.
- Threshold breaches, challenged claims, guardian reviews, overdue commitments, policy sunsets, data access requests, federation conflicts, and outcome reviews appear in the same attention system.
- AI-generated attention identifies basis and uncertainty.

### Capability Acceptance

- Allocation, sensemaking, stewardship, governance, and ecological context operate as Canopy capability surfaces over the same object graph.
- A food surplus claim can become an offer, allocation proposal, decision packet, commitment, task, flow, outcome, retrospective, and policy review without leaving the shell model.
- Ecological thresholds can trigger issues, guardian review, proposal constraints, and learning signals.

### Triad Acceptance

- The same object set can be viewed as map, graph, and list without changing the query.
- Spatial, ecological, administrative, and federation boundaries can coexist.
- Graph nodes and map features resolve to object pages.

### Decision Packet Acceptance

- A decision packet can show proposal, affected objects, authority, claims, evidence, perspectives, scenarios, guardian review, decision method, unresolved objections, final decision, created obligations, review date, outcome plan, and export rules.
- Scenario outputs are treated as evidence, not decisions.
- AI summaries are labeled, reviewable, and challengeable.

### Data Stewardship Acceptance

- Sensitive objects show visibility, data state, consent, allowed uses, prohibited uses, retention, export, federation, and redaction summary where applicable.
- Users can request access, challenge visibility, view redaction summaries, revise consent where allowed, and appeal data access decisions.
- Exports include stewardship agreements and redaction summaries.

### Federation Acceptance

- Users can see whether an object is local, federated, imported, shared, exportable, redacted, pending sync, or in reconciliation.
- The shell can generate an export envelope preview with included object types, event types, schema version, content hash, data stewardship agreements, and redaction summary.
- Fork and defederation processes are visible and governed.

### AI Boundary Acceptance

- AI output never appears as final authority.
- AI outputs show inputs, assumptions, uncertainty, visibility inheritance, and challenge actions.
- AI cannot record binding decisions, allocate resources, grant mandates, grant use rights, replace guardian review, or create hidden scores.

### Responsive Acceptance

- Desktop supports persistent scope, workspace, context, attention, command, and triad workflows.
- Tablet supports field review, meeting facilitation, evidence capture, and object/context alternation.
- Mobile supports capture, search, attention response, lightweight participation, field observations, and commitment updates without hiding authority, visibility, federation, or scope.

### First Vertical Slice Acceptance

A reviewer can use the shell model to answer yes to all of these:

1. Can I start from the Mill Creek threshold breach and find the food allocation decision it affected?
2. Can I start from the school meal need and find the claims, evidence, proposal, allocation, commitments, tasks, flows, and outcome?
3. Can I start from the farm surplus offer and see what was allocated, what remained, and what evidence supported it?
4. Can I inspect the authority behind the decision, allocation, use rights, and commitments?
5. Can I see what the watershed guardian recommended and how the decision handled it?
6. Can I see unresolved objections without treating them as erased?
7. Can I export the decision packet and event trail with stewardship rules intact?
8. Can I replay the path as observe, understand, simulate, deliberate, coordinate, act, and learn?

If all eight are true, the first shell model supports the first real Canopy operating surface.

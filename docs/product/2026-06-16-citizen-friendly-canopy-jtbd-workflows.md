# Citizen-Friendly Canopy JTBD And Workflows

Date: 2026-06-16

## Product Reframe

Canopy should feel public, civic, and humane before it feels technical. The underlying system is emergent and holonic: people, places, commons, living systems, resources, claims, decisions, commitments, and federations can all contain and belong to one another depending on context.

The UI should not force users to understand that hierarchy up front. It should help people answer simple civic questions:

- What is happening near me or in a commons I care about?
- What needs attention?
- What do people know, contest, need, offer, decide, or promise?
- What can I safely do next?
- Who has authority, who is affected, and how can a decision be challenged?

The system can remain object-based and holonic underneath, but the public surface should be organized around jobs, situations, plain-language workflows, and visible consequences.

## Primary Audiences

### Citizen / Resident

Wants to understand what is happening, contribute local knowledge, make needs visible, support proposals, and hold decisions accountable without learning Canopy internals.

### Steward / Organizer

Coordinates resources, care, meetings, reviews, commitments, and follow-through across people and places.

### Guardian / Reviewer

Reviews ecological, data, safety, legal, or governance concerns before consequential action.

### Contributor / Provider

Offers resources, skills, evidence, observations, funding, equipment, space, or time.

### Public Observer

Wants trustworthy visibility into decisions, progress, outcomes, and unresolved disputes without private data exposure.

### Operator / Administrator

Maintains deployment readiness, federation, imports, provider health, data stewardship, and incident response.

## Core JTBD

### 1. Understand What Is Happening

When something changes in my place, commons, or living system, I want a plain-language summary of what happened, why it matters, what is known, what is uncertain, and what is next.

Acceptance signals:

- Users can start from a place, issue, alert, or object.
- Summaries distinguish facts, claims, model outputs, decisions, and opinions.
- Each summary has links to evidence, affected objects, and civic memory.
- Sensitive or redacted data is explained without exposing private content.

### 2. Raise A Need Or Concern

When I see a need, risk, shortage, harm, or opportunity, I want to report it in ordinary language and connect it to a place, group, resource, or living system.

Acceptance signals:

- The first form asks what happened, where, who is affected, urgency, evidence, and visibility.
- Canopy suggests matching existing objects or issues before creating duplicates.
- The user sees what will be public, restricted, or private.
- Submission creates traceable civic memory and review state.

### 3. Offer Help Or Resources

When I can help, I want to offer time, food, tools, space, funds, evidence, transport, care, or expertise and understand what commitments I am making.

Acceptance signals:

- Offers use plain categories and optional structured detail.
- The UI distinguishes offer, commitment, donation, use right, and obligation.
- The contributor sees expected follow-up and withdrawal/revision paths.
- Offers can be matched to needs without becoming separate app workflows.

### 4. Decide Together

When a group needs to choose, I want to see the issue, options, tradeoffs, authority, objections, affected people, ecological constraints, and decision method in one understandable flow.

Acceptance signals:

- Decision pages lead with the question being decided.
- Evidence, scenarios, objections, and guardian reviews are visible but progressively disclosed.
- Users can see whether the decision is draft, review, approved, appealed, superseded, or closed.
- Every decision has a challenge or appeal path where appropriate.

### 5. Follow Through

When a decision creates commitments, I want to know who promised what, what is due, what is blocked, and what changed in the world.

Acceptance signals:

- Commitments show responsible parties, due dates, status, dependencies, and evidence of completion.
- The product separates tasks, obligations, ledger entries, use rights, and outcomes in plain language.
- People can update progress without understanding event schemas.
- Outcomes feed learning and future policy review.

### 6. Steward Shared Data

When information is sensitive, I want to know who can see it, why, for how long, how it can be exported, and how redaction or consent works.

Acceptance signals:

- Visibility is plain: public, commons-visible, role-restricted, guardian-restricted, private, embargoed, sealed.
- Redaction requests and consent changes have clear status.
- Export readiness names what will cross federation boundaries.
- Data stewardship is a visible user promise, not only a backend policy.

### 7. Resolve Conflict Or Disagreement

When people disagree about facts, decisions, imports, or responsibilities, I want a guided path to compare versions, understand stakes, choose a resolution path, and preserve history.

Acceptance signals:

- Conflicts are framed as resolvable civic work, not system errors.
- The UI compares local and remote claims in plain language.
- Available actions include accept, reject, remediate, merge, defer, appeal, and request review.
- The original history remains visible.

### 8. See Whether Canopy Itself Is Trustworthy

When I rely on Canopy, I want confidence that the system is healthy, auditable, privacy-preserving, and not silently rewriting history.

Acceptance signals:

- Public/citizen users see a simple trust posture.
- Operators see Phase 10 hardening, provider readiness, replay, projection, outbox, audit, federation, and deployment evidence.
- Problems become explainable incidents with next actions.

## Citizen-Friendly Navigation

The current object/scope model should remain, but the primary navigation should become task-first:

| Public Label | User Question | Underlying Canopy Surface |
| --- | --- | --- |
| Home | What needs my attention? | scope, attention, civic memory |
| Around Me | What is happening in this place or commons? | map, graph, scopes, living systems |
| Needs & Offers | Who needs what and who can help? | needs, offers, commitments, allocation |
| Decisions | What are we deciding and why? | issues, proposals, decision packets, governance |
| Resources | What shared resources need care? | resources, use rights, stewardship, flows |
| Evidence | What do we know and how do we know it? | claims, evidence, sources, reviews |
| Commitments | What did we promise and what happened? | commitments, tasks, obligations, outcomes |
| Learning | What changed and what should we adjust? | outcomes, retrospectives, policy reviews |
| Trust & Data | Who can see what and what is safe to share? | data stewardship, redaction, federation |

Operator-only or advanced surfaces can remain available as role-based tools:

- Release readiness
- Provider health
- Federation operations
- Import review
- Migration readiness
- Audit trails

## Workflow Model

### Workflow A: Citizen Reports A Local Concern

1. Start from `Around Me` or `Home`.
2. Select `Report something`.
3. Describe the concern in plain language.
4. Attach place, photo/source/evidence, urgency, affected people, and visibility.
5. Canopy suggests existing matching objects or issues.
6. User confirms whether to add to an existing issue or create a new one.
7. Canopy shows what happens next: review owner, visibility, civic memory record, and possible decision path.

### Workflow B: Steward Coordinates Need And Offer

1. Open `Needs & Offers`.
2. Review unmatched needs and available offers.
3. Compare constraints: location, timing, eligibility, authority, data visibility, ecological limits.
4. Propose match or commitment.
5. Preview consequences: authority, obligation, outbox/federation effect, memory record.
6. Submit for review or execute if authorized.
7. Track completion and outcome.

### Workflow C: Group Makes A Decision

1. Open `Decisions`.
2. Select active issue or create issue from a concern.
3. Review options, evidence, affected scopes, objections, and constraints.
4. Request guardian or data stewardship review where required.
5. Choose decision method.
6. Record decision with rationale, unresolved objections, commitments, and review date.
7. Publish decision packet and make appeal path visible.

### Workflow D: Citizen Challenges Or Appeals

1. Open a decision, claim, policy, import, or action.
2. Select `Challenge`, `Correct`, or `Appeal`.
3. Choose reason: incorrect fact, missing voice, authority concern, ecological concern, data concern, process concern.
4. Add evidence or explanation.
5. Canopy routes to the right review body and shows expected next step.
6. The challenge becomes part of civic memory without erasing the original record.

### Workflow E: Federation Conflict Is Resolved

1. Open `Trust & Data` or operator `Federation`.
2. Review incoming records in ordinary language.
3. Compare local and remote claim/evidence/resource versions.
4. See recommended action and risk explanation.
5. Choose accept, reject, remediate, merge, defer, or request review.
6. Canopy preserves provenance, local mappings, redaction continuity, and civic memory.

### Workflow F: Operator Reviews Release Readiness

1. Open operator `Release Readiness`.
2. See local acceptance, live deployment blockers, provider readiness, migration evidence, operations health, and verification evidence.
3. Drill into failed or missing evidence.
4. Attach CI, migration, environment, or observability evidence.
5. Promote only when live deployment readiness is clear.

## Holonic UX Rules

Canopy should support nested, overlapping, and emergent systems without presenting a rigid org chart.

- Show scopes as contexts, not folders.
- Show objects as belonging to many contexts.
- Let users move by place, issue, relationship, commitment, or decision.
- Use breadcrumbs as relationship paths, not single parent paths.
- Use "lenses" for different views: place, commons, living system, governance, stewardship, federation.
- Reveal canonical object types only when useful for trust, audit, or power users.
- Prefer "related to" and "affects" over strict hierarchy language.
- Make federation feel like relationships between communities, not data plumbing.

## Plain Language Translation

| Internal Term | Citizen-Friendly Label |
| --- | --- |
| ObjectRef | Record / thing / item |
| Scope | Place, group, commons, or context |
| Projection | View / summary |
| Outbox | Pending send / pending sync |
| Adapter audit | Connection history |
| Canonical mapping | Matched record |
| Federation reconciliation | Sync review |
| Data stewardship agreement | Sharing rule |
| Governance proposal | Option / proposed action |
| Decision packet | Decision record |
| Civic memory | Public record / history |

The UI can expose internal terms in advanced detail, but the first layer should use citizen language.

## First Product Reshape

### First Screen

Replace the current capability-dense first screen with a citizen operating home:

- What needs attention now
- What changed recently
- Active decisions
- Needs and offers nearby
- Shared resources needing care
- Commitments due soon
- Trust/data warnings
- A single primary action: report, offer, review, decide, or follow up

### First Mobile Experience

Mobile should be task-short:

- Today
- Around me
- Report
- Review
- Search

Deep panels can remain available, but common tasks should not require scrolling through the whole operating console.

### First Public/Unauthenticated Experience

Public observers should be able to see:

- public scopes and places
- public issues and decisions
- public evidence and redacted records
- public commitments and outcomes
- how to participate or request access

They should not see operator-only implementation details.

## Success Metrics

- A new citizen can understand the active scope and top three attention items in under 60 seconds.
- A citizen can report a concern in under 3 minutes without knowing Canopy terminology.
- A steward can match a need and offer without leaving the shared object environment.
- A decision page can explain what was decided, why, who was affected, and how to appeal in one screen.
- Mobile users can complete report, review, search, and status-check workflows without traversing the full dashboard.
- Public users can distinguish fact, claim, decision, commitment, and outcome.
- Operators can still access full Phase 10 readiness and audit detail without exposing it as the default citizen experience.

## Recommended Build Sequence

1. Add citizen terminology layer and task-first navigation model.
2. Build `Home` as a true work queue, not a capability showcase.
3. Add report-a-concern and offer-help flows.
4. Add guided decision and appeal flows.
5. Convert federation conflict review into guided resolution.
6. Add mobile task routes.
7. Add public observer mode.
8. Add operator release-readiness panel from Phase 10 completion reports.

## Product Principle

Canopy should be deep enough for a commons to govern itself, but simple enough that a resident can say: "I know what is happening, I know what I can do, and I know how this decision can be trusted."

# Product Requirements Document: Phase 11 Citizen-Friendly Operating Surface

**Version**: 1.0
**Date**: 2026-06-16
**Status**: Draft for review

## 1. Executive Summary

**Problem Statement**: Canopy has a deep, coherent cybernetic commons architecture, but the current shell exposes too much system complexity before a citizen, steward, guardian, contributor, observer, or operator can understand what needs attention and what they can safely do. Users may also operate across many groups, levels, and roles, and the product does not yet make that multi-context participation simple.

**Proposed Solution**: Build Phase 11 as a separate Next.js prototype surface for a citizen-friendly Canopy operating experience. The prototype will organize Canopy around plain-language jobs, multi-context participation, task-first navigation, and guided workflows while preserving the holonic object/scope/authority model underneath.

**Success Criteria**:

- A first-time user can identify their active context, role, and top three attention items within 60 seconds in moderated testing.
- A user can report a concern from the prototype surface in under 3 minutes without encountering internal Canopy terms such as `ObjectRef`, projection, outbox, or canonical mapping.
- A multi-role user can switch between at least three contexts or roles and see different attention, authority, and data posture for each.
- Mobile users can complete context switch, report concern, object lookup, and review workflows without traversing the full legacy dashboard.
- The prototype achieves 100% passing acceptance tests for Phase 11 user flows and preserves existing `npm run check` status.

## 2. User Experience & Functionality

### User Personas

**Citizen / Resident**

- Wants to understand what is happening nearby, report concerns, contribute knowledge, support decisions, and trust the public record.
- Needs plain language, low-friction reporting, and clear visibility/privacy explanations.

**Steward / Organizer**

- Coordinates resources, needs, offers, tasks, commitments, follow-through, meetings, and reviews.
- Needs work queues, role-aware actions, and cross-context coordination.

**Guardian / Reviewer**

- Reviews ecological, data, safety, legal, or governance concerns before consequential action.
- Needs clear review packets, evidence, constraints, affected contexts, and decision consequences.

**Contributor / Provider**

- Offers resources, time, space, money, food, transport, care, tools, evidence, or expertise.
- Needs clarity on what they are promising and how offers become commitments.

**Public Observer**

- Wants trustworthy visibility into public issues, decisions, outcomes, and unresolved disputes without private data exposure.
- Needs public mode, redaction clarity, and confidence that records are not silently rewritten.

**Operator / Administrator**

- Maintains deployment readiness, provider health, federation, imports, data stewardship, and incident response.
- Needs release-readiness and operations views without making those the default citizen experience.

### User Stories

**Story 1: Multi-context home**

As a multi-role participant, I want to see all groups and levels where I have work so that I can choose the right context before acting.

**Acceptance Criteria**:

- Home includes a `My Contexts` area showing at least neighborhood, school, commons, watershed, federation, and operator-style contexts in fixture data.
- Each context displays active role, level, attention count, authority summary, and data posture.
- Selecting a context updates visible attention, suggested actions, and relationship path.
- Consequential actions always show active role and authority source before confirmation.

**Story 2: Citizen reports a concern**

As a citizen, I want to report a concern in plain language so that the right group can review it without me understanding Canopy internals.

**Acceptance Criteria**:

- Prototype includes a `Report something` flow accessible from `Home` and `Around Me`.
- Flow captures description, place/context, affected people or resources, urgency, optional evidence, and visibility preference.
- Flow suggests whether the concern may relate to existing objects or issues.
- Confirmation preview explains public/restricted/private visibility and expected next review step.
- Flow creates or previews a traceable civic memory event in the prototype model.

**Story 3: Steward coordinates need and offer**

As a steward, I want to match needs and offers across contexts so that resources can move responsibly.

**Acceptance Criteria**:

- `Needs & Offers` shows unmatched needs and available offers in citizen language.
- Matching preview displays timing, eligibility, authority, data posture, ecological constraints, and affected contexts.
- The UI distinguishes offer, match, commitment, task, and outcome.
- A match can be previewed without leaving the shared object environment.

**Story 4: Group makes a decision**

As a decision participant, I want to understand an issue, compare options, see authority and objections, and know how to challenge a decision.

**Acceptance Criteria**:

- `Decisions` leads with the plain-language question being decided.
- Decision page shows options, evidence, affected contexts, guardian reviews, unresolved objections, decision method, and appeal path.
- Cross-level ownership is visible, such as school kitchen, food commons, watershed guardian, and city procurement.
- Status is visible as draft, review, approved, appealed, superseded, or closed.

**Story 5: User challenges or appeals**

As an affected participant, I want to challenge a claim, decision, policy, import, or action so that disagreement is handled as civic work rather than hidden system state.

**Acceptance Criteria**:

- `Challenge`, `Correct`, or `Appeal` is available where the user has standing or where public challenge is allowed.
- User can choose reason: incorrect fact, missing voice, authority concern, ecological concern, data concern, or process concern.
- Submission preview shows routing, expected reviewer, visibility, and civic memory impact.
- Original history remains visible after challenge.

**Story 6: Federation conflict resolution**

As a steward or operator, I want to compare local and remote records in plain language so that I can resolve conflicts without reading raw event semantics.

**Acceptance Criteria**:

- `Trust & Data` exposes incoming federation conflicts as guided review items.
- UI compares local and remote claim/evidence/resource records with source, trust status, conflict reason, and proposed action.
- Available actions include accept, reject, remediate, merge, defer, and request review.
- Resolution preview preserves provenance, local mappings, redaction continuity, and civic memory.

**Story 7: Operator release readiness**

As an operator, I want to see whether Canopy is locally accepted or live-deployment ready so that I do not promote without evidence.

**Acceptance Criteria**:

- Operator-only `Release Readiness` surface consumes Phase 10 completion report data.
- Surface separates local acceptance from live deployment readiness.
- Missing provider, migration, environment, observability, and verification evidence is displayed as actionable blockers.
- Release readiness is not shown as the default public/citizen experience.

**Story 8: Public observer mode**

As a public observer, I want to view public issues, decisions, commitments, outcomes, and redacted records so that I can understand what happened without private access.

**Acceptance Criteria**:

- Prototype defines public mode navigation and access boundaries.
- Public observer can browse public contexts, issues, decisions, commitments, outcomes, and civic memory.
- Private or restricted content appears as redacted or unavailable with a plain-language explanation.
- Public observer cannot execute private or role-restricted commands.

### Non-Goals

- Replace the existing production shell in this phase.
- Build real provider infrastructure, live deployment, or external auth flows.
- Remove or simplify Canopy's underlying holonic object/scope/authority model.
- Reintroduce CommonCredit, ICOS, Sensemaking, or Stewardship as separate app surfaces.
- Build a marketing landing page as the primary deliverable.
- Implement final visual polish before workflow acceptance is proven.
- Build complete AI summarization or recommendation features unless explicitly scoped later.

## 3. AI System Requirements

AI is not required for the first Phase 11 prototype. The prototype must work with deterministic fixture data and explicit rules.

If AI assistance is later enabled for plain-language summaries, recommendations, or conflict explanations, the following requirements apply.

### Tool Requirements

- Access to canonical Canopy objects, civic memory events, decisions, evidence, commitments, and data stewardship state.
- Retrieval over public or role-authorized records only.
- Citation support back to object refs, evidence refs, decision packets, and civic memory events.
- No model output may create authority, approve actions, or silently rewrite records.

### Evaluation Strategy

- 50 benchmark prompts covering concern summaries, decision explanations, conflict explanations, and stewardship summaries.
- >= 95% citation accuracy to source records.
- 0 critical privacy leaks in restricted/redacted fixture cases.
- Human reviewer agreement >= 85% that summaries distinguish fact, claim, model output, decision, and opinion.
- All AI-generated action suggestions must include uncertainty and a challenge/review path.

## 4. Technical Specifications

### Architecture Overview

Phase 11 starts as a separate prototype surface inside the existing Next.js web workspace.

Recommended route shape:

- `/citizen` for the prototype home.
- `/citizen/contexts` for multi-context participation.
- `/citizen/around` for place/context exploration.
- `/citizen/report` for report-a-concern flow.
- `/citizen/needs-offers` for need/offer coordination.
- `/citizen/decisions` for decision workflows.
- `/citizen/trust-data` for stewardship, federation, privacy, and public trust surfaces.
- `/citizen/release-readiness` for operator-only Phase 10 readiness view.

Data flow:

1. Existing Canopy fixture/runtime data remains canonical.
2. A Phase 11 web model maps internal objects, scopes, roles, memberships, mandates, attention, and civic memory into citizen-friendly view models.
3. Prototype components render task-first surfaces without exposing internal terminology by default.
4. Acceptance tests validate workflows against deterministic fixture data.
5. Once validated, the prototype can replace or reshape the existing shell incrementally.

### Integration Points

- `@canopy/evaluation-vertical-slice` for Riverbend/Mill Creek fixture scenarios.
- `@canopy/app-shell` for shell sessions, scopes, object pages, commands, and persisted snapshots.
- `@canopy/workflows-operations` for operations readiness.
- `@canopy/evaluation-ecosystem-hardening` for Phase 10 local/live readiness reports.
- `@canopy/workflows-federation-reconciliation` for federation conflict state.
- Existing Next.js app under `apps/canopy-web`.

### Data Model Requirements

The Phase 11 web model must include:

- context id, label, level, and relationship path;
- active role and available roles;
- authority summary and denial/appeal path;
- attention grouped by context, role, urgency, and consequence;
- public/private/restricted/redacted data posture;
- task-first navigation state;
- workflow state for report, match, decision, challenge, federation resolution, and release readiness;
- plain-language labels mapped from canonical Canopy types.

### Security & Privacy

- Role and authority context must be visible before consequential actions.
- Public observer mode must not expose private, sealed, embargoed, role-restricted, or guardian-restricted payloads.
- Redaction explanations must preserve continuity without exposing redacted content.
- Federation conflict views must preserve provenance and local/remote distinction.
- Operator release readiness must be role-restricted.
- Prototype must not bypass existing permission, data stewardship, or export posture semantics.

### Testing Requirements

- Unit tests for Phase 11 view-model mapping.
- Acceptance tests for each core workflow: context switch, report concern, match need/offer, decision review, challenge/appeal, federation resolution, public observer, release readiness.
- Responsive tests for mobile task routes.
- Browser verification for desktop and mobile prototype routes.
- Existing `npm run check` must remain green.
- No primary navigation labels may use legacy project names or internal implementation terms.

## 5. Risks & Roadmap

### Phased Rollout

**MVP: Phase 11 Prototype**

- Separate `/citizen` prototype route.
- Multi-context home and `My Contexts`.
- Citizen-friendly task navigation.
- Report-a-concern flow.
- Needs/offers overview.
- Decision overview.
- Trust/data overview.
- Operator release-readiness view.
- Mobile task routes for Today, My Groups, Around Me, Report, Review, Search.

**v1.1: Guided Workflows**

- Need/offer matching preview.
- Decision packet guided review.
- Challenge/appeal submission flow.
- Federation conflict guided resolution.
- Public observer mode.
- Role-sensitive plain-language labels.

**v2.0: Replace Existing Shell Defaults**

- Promote citizen surface to default shell home.
- Move current dense operating console into advanced/operator mode.
- Add richer map/graph/list interactions.
- Add release-readiness and observability drill-downs.
- Add optional AI summaries after evaluation harness is in place.

### Technical Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Oversimplifying the holonic model | Users may get a friendly UI that hides important authority, data, or ecological consequences. | Keep active context, role, authority, data posture, and appeal path visible before consequential action. |
| Prototype diverges from canonical runtime | The new surface could become a decorative mock instead of Canopy. | Build Phase 11 view models from existing fixtures, app-shell, operations, and hardening reports. |
| All-persona scope becomes too broad | Trying to serve citizens, stewards, guardians, observers, and operators equally may dilute the first release. | Use task-first surfaces with role-specific affordances and acceptance tests per persona. |
| Mobile remains too dense | The prototype could reproduce the current long dashboard stack. | Create dedicated mobile task routes instead of only responsive stacking. |
| Public mode leaks restricted information | Public transparency could conflict with data stewardship. | Use redaction fixtures and explicit public/private/restricted acceptance tests. |
| Release readiness overwhelms citizens | Operator detail could make Canopy feel technical again. | Keep release readiness operator-only and summarize public trust posture separately. |

### Open Questions

- What should the prototype route be named publicly: `/citizen`, `/home`, `/commons`, or another term?
- Which visual design direction should guide Phase 11: civic service, neighborhood mutual aid, public-interest dashboard, or place-based commons map?
- Which workflow should be implemented first after `My Contexts`: report concern, needs/offers, or decisions?
- What fixture contexts should represent the first multi-role user beyond Riverbend/Mill Creek?

### Recommended First Implementation Tasks

1. Add Phase 11 view-model package or web model module for citizen-friendly contexts, roles, attention, and labels.
2. Add `/citizen` prototype route in `@canopy/web`.
3. Build `My Contexts` and multi-context attention from fixture data.
4. Add task-first navigation and mobile route structure.
5. Implement report-a-concern preview flow.
6. Add acceptance tests for context switching and report flow.
7. Add browser verification for desktop and mobile.
8. Iterate into needs/offers, decisions, trust/data, and release readiness.

# Feature Specification: Phase 11 Citizen-Friendly Operating Surface

## User Scenarios & Testing

### User Story 1 - Multi-context home (Priority: P1)

A multi-role participant needs one home surface that shows the groups, levels, roles, and attention items that currently matter, so they can choose the right context before taking action.

Priority reason: Without this, Canopy remains too system-facing for users who participate across neighborhoods, schools, commons, watersheds, federations, and operator contexts.

Independent Test: A user can open the Phase 11 surface, identify at least three contexts, see the active role and level for each, select one, and observe context-specific attention and suggested actions.

Acceptance Scenarios:

- Given a user with multiple contexts, when they open the Phase 11 home, then they see `My Contexts` with context label, level, role, authority summary, data posture, and attention count.
- Given a selected context, when the user switches to another context, then attention, relationship path, suggested actions, and role summary update.
- Given a consequential action preview, when the user reviews the action, then the active role and authority source are visible before confirmation.

### User Story 2 - Citizen reports a concern (Priority: P1)

A citizen needs a plain-language way to report a concern, need, risk, or opportunity without understanding Canopy internals.

Priority reason: Reporting a concern is the simplest citizen entry point and proves that Canopy can translate public participation into accountable civic memory.

Independent Test: A user can start a report, enter concern details, choose context and visibility, see matching existing objects or issues, and reach a confirmation preview.

Acceptance Scenarios:

- Given a citizen on Home or Around Me, when they select `Report something`, then they enter a guided flow using plain language.
- Given report details, when the user reaches preview, then the preview explains visibility, expected reviewer, civic memory effect, and possible decision path.
- Given possible related records, when the system shows suggestions, then the user can choose existing issue/object or create a new one.

### User Story 3 - Steward coordinates need and offer (Priority: P2)

A steward needs to compare needs and offers across contexts so resources can move responsibly.

Priority reason: Need/offer coordination is a core commons workflow and must remain one Canopy flow, not a separate app.

Independent Test: A steward can open Needs & Offers, inspect unmatched needs and available offers, preview a match, and understand constraints before submission.

Acceptance Scenarios:

- Given needs and offers in fixture data, when a steward opens Needs & Offers, then they see unmatched needs and available offers in citizen language.
- Given a proposed match, when previewed, then timing, eligibility, authority, data posture, ecological constraints, affected contexts, and follow-through states are visible.
- Given a match preview, when reviewing terms, then offer, match, commitment, task, and outcome are distinct.

### User Story 4 - Group makes a decision (Priority: P2)

A decision participant needs to understand the question, options, evidence, objections, authority, and appeal path in one guided surface.

Priority reason: Decisions are where Canopy must make legitimacy legible to public participants.

Independent Test: A user can open Decisions, select an active issue, review options and objections, see cross-level responsibility, and find the appeal path.

Acceptance Scenarios:

- Given an active issue, when the user opens Decisions, then the plain-language question being decided is primary.
- Given cross-level responsibility, when the decision is shown, then school, commons, watershed, city, or federation responsibilities are visible where applicable.
- Given a decision state, when shown, then status is draft, review, approved, appealed, superseded, or closed.

### User Story 5 - User challenges or appeals (Priority: P2)

An affected participant needs a guided way to challenge, correct, or appeal a claim, decision, policy, import, or action.

Priority reason: Contestability is a Canopy invariant and must feel like civic work rather than expert-only audit plumbing.

Independent Test: A user can start a challenge from a decision/claim/action, choose a reason, add explanation or evidence, and see routing and visibility before submission.

Acceptance Scenarios:

- Given an appealable record, when a user selects Challenge, Correct, or Appeal, then valid reasons are shown in plain language.
- Given challenge details, when previewed, then routing, reviewer, visibility, authority source, and civic memory effect are visible.
- Given a challenge preview, when submitted or cancelled, then original history remains visible.

### User Story 6 - Federation conflict resolution (Priority: P2)

A steward or operator needs guided review of local and remote records so federation conflicts can be resolved without reading raw event semantics.

Priority reason: Phase 9 made federation executable; Phase 11 must make it understandable.

Independent Test: A user can open Trust & Data, inspect an incoming conflict, compare local/remote records, choose a proposed action, and preview provenance-preserving resolution.

Acceptance Scenarios:

- Given an incoming federation conflict, when shown, then local and remote records are compared with source, trust status, conflict reason, and proposed action.
- Given available actions, when reviewing, then accept, reject, remediate, merge, defer, and request review are understandable.
- Given a resolution preview, when shown, then provenance, local mappings, redaction continuity, and civic memory effects are preserved.

### User Story 7 - Operator release readiness (Priority: P3)

An operator needs a role-restricted view of local acceptance and live deployment blockers.

Priority reason: Phase 10 readiness should guide operations without becoming the default citizen experience.

Independent Test: An operator can open Release Readiness, see local acceptance, live blockers, missing evidence, and next actions.

Acceptance Scenarios:

- Given an operator context, when Release Readiness opens, then Phase 10 local acceptance and live deployment readiness are separate.
- Given missing live evidence, when displayed, then provider, migration, environment, observability, and verification blockers are actionable.
- Given a public or citizen context, when navigating, then Release Readiness is not shown as the default experience.

### User Story 8 - Public observer mode (Priority: P3)

A public observer needs to see public issues, decisions, commitments, outcomes, and redacted records without private access.

Priority reason: Public trust depends on transparency and privacy working together.

Independent Test: A public observer can browse public records, see redaction explanations, and cannot execute restricted commands.

Acceptance Scenarios:

- Given public mode, when browsing, then public contexts, issues, decisions, commitments, outcomes, and civic memory are visible.
- Given restricted content, when displayed, then it appears as redacted or unavailable with a plain-language explanation.
- Given role-restricted commands, when in public mode, then those commands are unavailable and explain why where safe.

## Requirements

### Functional Requirements

- FR-001: System MUST provide a separate Phase 11 citizen-friendly prototype surface.
- FR-002: System MUST expose `My Contexts` with group, level, role, authority, data posture, relationship path, and attention count.
- FR-003: System MUST support users with multiple groups, levels, memberships, roles, mandates, and observer relationships.
- FR-004: System MUST group attention by context, role, urgency, and consequence.
- FR-005: System MUST use task-first citizen navigation: Home, My Contexts, Around Me, Needs & Offers, Decisions, Resources, Evidence, Commitments, Learning, Trust & Data.
- FR-006: System MUST include a plain-language report-a-concern workflow.
- FR-007: System MUST preview visibility, review owner, civic memory effect, and possible decision path before concern submission.
- FR-008: System MUST include a steward-facing need/offer coordination view.
- FR-009: System MUST include a decision review view with options, evidence, objections, authority, affected contexts, and appeal path.
- FR-010: System MUST include challenge, correction, or appeal affordances where the user has standing or public challenge is allowed.
- FR-011: System MUST include guided federation conflict review in citizen language.
- FR-012: System MUST include role-restricted operator release readiness using Phase 10 local/live readiness evidence.
- FR-013: System MUST include public observer mode boundaries for public, restricted, private, sealed, embargoed, and redacted records.
- FR-014: System MUST provide mobile task routes for Today, My Groups, Around Me, Report, Review, and Search.
- FR-015: System MUST avoid primary navigation labels from legacy project names or internal implementation terms.
- FR-016: System MUST preserve Canopy's underlying holonic object, scope, authority, data stewardship, civic memory, and federation semantics.

## Success Criteria

- SC-001: First-time users can identify active context, active role, and top three attention items within 60 seconds in moderated testing.
- SC-002: Users can complete report-a-concern flow in under 3 minutes without encountering internal terms such as `ObjectRef`, projection, outbox, or canonical mapping.
- SC-003: Multi-role users can switch between at least three contexts and observe different attention, authority, and data posture for each.
- SC-004: Mobile users can complete context switch, report concern, object lookup, and review workflows without traversing the full current dashboard.
- SC-005: Acceptance tests cover all P1 user stories before implementation expands to P2 stories.
- SC-006: Existing repo verification remains green with `npm run check`.

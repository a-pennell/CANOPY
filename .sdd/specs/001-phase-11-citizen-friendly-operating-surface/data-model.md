# Data Model: Phase 11 Citizen-Friendly Operating Surface

## Entity: CitizenContext

Represents a group, place, commons, living system, federation, or operator context where a user can observe or act.

Fields:

- `id`: stable id
- `label`: public label
- `level`: personal, household, block, neighborhood, organization, commons, living-system, city, region, federation, operator
- `activeRole`: current role in this context
- `availableRoles`: roles the user can switch into
- `relationshipPath`: broader/narrower context path
- `authoritySummary`: plain-language authority explanation
- `dataPosture`: public, commons-visible, role-restricted, guardian-restricted, private, embargoed, sealed, mixed
- `attentionCount`: number of current attention items
- `suggestedActionIds`: actions relevant in this context

## Entity: CitizenAttentionItem

Represents actionable work for the current user.

Fields:

- `id`: stable id
- `contextId`: owning or primary context
- `role`: role expected to respond
- `urgency`: low, medium, high, critical
- `consequence`: what happens if ignored
- `label`: plain-language title
- `summary`: plain-language explanation
- `route`: task route
- `relatedObjectRefs`: canonical object references hidden behind public labels

## Entity: CitizenTaskNavigationItem

Represents task-first navigation.

Fields:

- `id`: home, my-contexts, around-me, needs-offers, decisions, resources, evidence, commitments, learning, trust-data
- `label`: citizen-facing label
- `question`: user question answered by the surface
- `route`: prototype route
- `attentionCount`: optional count
- `roles`: roles for which this item is relevant

## Entity: ConcernReportDraft

Represents the report-a-concern workflow state.

Fields:

- `description`: plain-language concern
- `contextId`: selected context
- `placeLabel`: optional place
- `affectedPeopleOrResources`: list of affected parties/resources
- `urgency`: low, medium, high, critical
- `evidenceLabels`: optional uploaded/linked evidence labels
- `visibilityPreference`: public, commons-visible, role-restricted, private
- `relatedSuggestions`: possible existing objects/issues
- `preview`: review owner, civic memory effect, visibility effect, possible decision path

## Entity: NeedOfferMatchPreview

Represents a steward preview of matching a need and offer.

Fields:

- `needId`
- `offerId`
- `timing`
- `eligibility`
- `authoritySummary`
- `dataPosture`
- `ecologicalConstraints`
- `affectedContextIds`
- `followThroughStates`: offer, match, commitment, task, outcome

## Entity: CitizenDecisionSummary

Represents a decision in public/citizen language.

Fields:

- `id`
- `question`
- `status`: draft, review, approved, appealed, superseded, closed
- `options`
- `evidenceSummary`
- `affectedContextIds`
- `guardianReviewSummary`
- `unresolvedObjections`
- `decisionMethod`
- `appealPath`

## Entity: FederationConflictReview

Represents a guided federation conflict.

Fields:

- `id`
- `domain`: claim, evidence, stewardship, resource, decision
- `localRecordSummary`
- `remoteRecordSummary`
- `peerSource`
- `trustStatus`
- `conflictReason`
- `proposedAction`
- `availableActions`: accept, reject, remediate, merge, defer, request-review
- `provenanceSummary`
- `redactionContinuitySummary`

## Entity: ReleaseReadinessSummary

Represents operator-only Phase 10 readiness.

Fields:

- `localAcceptanceStatus`
- `liveDeploymentStatus`
- `providerBlockers`
- `migrationBlockers`
- `environmentBlockers`
- `observabilityBlockers`
- `verificationBlockers`
- `nextActions`

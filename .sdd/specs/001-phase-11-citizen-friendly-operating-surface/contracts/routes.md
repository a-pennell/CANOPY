# Route Contract: Phase 11 Citizen-Friendly Operating Surface

## Public Prototype Routes

### `/citizen`

Purpose: Citizen-friendly home with My Contexts, task-first navigation, and top attention.

Must show:

- active context
- active role
- top attention items
- My Contexts summary
- task-first navigation
- primary action to report something

### `/citizen/contexts`

Purpose: Multi-context participation view.

Must show:

- all fixture contexts
- roles and levels
- relationship paths
- attention grouped by context and role
- authority and data posture

### `/citizen/around`

Purpose: Place/context exploration.

Must show:

- place-based or commons-based summary
- related contexts
- current issues and resources
- report action

### `/citizen/report`

Purpose: Report-a-concern flow.

Must show:

- concern description
- selected context
- affected people/resources
- urgency
- visibility choice
- related suggestions
- preview with review owner, visibility, civic memory, possible decision path

### `/citizen/needs-offers`

Purpose: Steward coordination of needs and offers.

Must show:

- unmatched needs
- available offers
- match preview
- constraints and follow-through states

### `/citizen/decisions`

Purpose: Decision overview and guided decision review.

Must show:

- question being decided
- options
- evidence
- objections
- authority
- affected contexts
- appeal path

### `/citizen/trust-data`

Purpose: Data stewardship, federation conflict, and public trust surface.

Must show:

- visibility posture
- redaction explanations
- federation conflicts
- public trust summary

### `/citizen/release-readiness`

Purpose: Operator-only release readiness.

Must show:

- local acceptance status
- live deployment blockers
- provider readiness
- migration readiness
- operations readiness
- verification evidence

## Route Rules

- Routes must be separate from the existing default shell.
- Routes must not expose legacy project names as primary navigation.
- Routes must not expose internal implementation terms as primary navigation.
- Routes must preserve role/data restrictions in view model output.
- Mobile rendering must prioritize task routes over long stacked dashboard panels.

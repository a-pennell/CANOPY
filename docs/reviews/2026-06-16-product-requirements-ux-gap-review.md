# Canopy Product Requirements And UX Gap Review

Date: 2026-06-16

## Review Posture

This review looks for product requirement and UX gaps after Phase 10 local acceptance. It treats Canopy as one cybernetic commons ecosystem, not a bundle of separate apps or legacy project surfaces.

Inputs reviewed:

- Canopy planning and validation docs through Phase 10.
- Web model and dashboard implementation.
- Local browser pass at desktop and mobile widths against `http://localhost:3000`.

## Findings

| Priority | Gap | Why It Matters | Suggested Next Step |
| --- | --- | --- | --- |
| P1 | No explicit onboarding path for a new commons operator. | The shell demonstrates rich capability, but a first operator still needs to understand what scope they are entering, what is live, what is simulated, and what action is safe to take first. | Add an operator orientation flow that starts from scope, role, current risks, and first safe action. |
| P1 | Multi-group and multi-role participation is not yet a primary UI model. | People may act across neighborhood, school, commons, watershed, city, federation, and operator contexts with different roles and authority. A single flat scope switcher is not enough for citizen-friendly use. | Add `My Contexts` and a multi-context attention model grouped by role, urgency, and level. |
| P1 | Phase 10 hardening is not yet visible in the product surface. | The backend now knows local acceptance versus live deployment readiness, but operators cannot see those release gates in the shell. | Add a hardening/release-readiness panel fed by `buildCanopyPhase10CompletionReport()`. |
| P1 | Command preview is not yet a full command lifecycle. | Users can preview authority and persistence effects, but the product needs a clearer path from draft to submit, review, approval, execution, and appeal. | Add command lifecycle states and an operator queue for pending approvals, rejected commands, executed commands, and appeals. |
| P1 | Federation conflict resolution is visible but not yet deeply guided. | Multi-peer comparisons are powerful, but users need help choosing accept, reject, remediate, merge, or defer without reading raw event semantics. | Add decision support around quarantined imports, including recommended actions, risk explanations, and precedent links. |
| P2 | The map/graph/list surface is still a preview. | Spatial, relationship, and list views are central to commons sensemaking; the current compact panel is more proof than working tool. | Promote map, graph, and list into real interactive modes with filtering, object selection, and comparison. |
| P2 | Object pages need task-specific layouts. | Universal object pages are coherent, but decisions, resources, evidence, policies, agreements, and federation envelopes need more domain-specific affordances. | Add object-page section variants for decision packets, resources, claims/evidence, policies, agreements, and federation envelopes. |
| P2 | Data stewardship lacks an operator workbench. | Redaction, consent, retention, export restriction, and guardian review are visible but not organized as a daily workflow. | Add a stewardship workbench with queues, due dates, policy refs, and bulk review affordances. |
| P2 | Observability is summarized but not diagnosable. | Operations readiness is visible as counts and findings, but operators need drill-down when replay, projection, outbox, audit, or federation health degrades. | Add drill-down views from operations metrics to affected objects, events, commands, and remediation actions. |
| P2 | Mobile layout is responsive but not task-short. | At a 390px viewport, the shell stacks into a very long page with navigation, search, metrics, and many panels before task completion paths. This is readable but not yet ergonomic for field or meeting use. | Add mobile task routes for review queue, object lookup, command approval, federation quarantine, and stewardship review. |
| P3 | Terminology may still be too internal for some users. | Labels like projection, canonical mappings, and outbox are accurate but may slow civic operators. | Add role-sensitive labels that preserve technical traceability while offering plain-language summaries. |
| P3 | Mobile ergonomics need task-level validation. | Responsive checks exist, but dense operator workflows need touch-first validation across search, review, compare, and command confirmation. | Add mobile acceptance scenarios for command approval, federation review, object search, and stewardship queues. |

## Product Requirement Gaps

- Define operator personas and permissions beyond the current fixture actors.
- Define multi-context participation requirements: memberships, roles, mandates, observer access, cross-level attention, and role switching.
- Define first-run setup for a new commons, including scope creation, seed data, policies, roles, and provider choices.
- Define live deployment promotion requirements using the Phase 10 hardening report.
- Define incident response workflows for failed imports, projection drift, audit failures, and federation disputes.
- Define notification requirements for time-sensitive stewardship, appeals, conflicts, and threshold breaches.

## UX Gaps

- Create a clear home/work queue that tells each user what needs attention now.
- Make command execution feel like a lifecycle, not only a preview.
- Turn federation quarantine into guided resolution.
- Give map/graph/list full interaction depth.
- Add release-readiness and operations drill-down surfaces.
- Validate mobile workflows with real task paths, not only layout assertions.

## Browser Review Notes

- Desktop renders the complete operating shell and demonstrates breadth well, but the first viewport is status-heavy rather than action-guiding.
- Mobile renders without obvious overlap in the accessibility snapshot, but the page becomes extremely long, with many panels stacked before a user reaches deeper workflows.
- Navigation remains accessible, but there is no compact task-first mobile affordance for the highest-pressure workflows.
- Phase 10 release readiness is not yet visible in the product surface, despite now existing as executable evaluation data.

## Recommended Next Product Phase

The next product phase should be an operator-ready Canopy shell: onboarding, daily work queues, command lifecycle, stewardship workbench, federation resolution, release-readiness dashboard, and observability drill-downs.

Follow-up product framing:

- `docs/product/2026-06-16-citizen-friendly-canopy-jtbd-workflows.md` reframes the shell around citizen-friendly jobs, workflows, plain-language navigation, and holonic UX rules.

# Canopy Phase 5 Shell Status

Date: 2026-06-14

Phase 5 is now late-stage rather than exploratory. The shell has real Next.js routes, route-aware object selection, scope controls, object search, attention queues, command preview, permission explanation, universal object-page section grammar, data stewardship review, federation review, responsive CSS checks, and App Router acceptance tests.

## Covered

- Task 47, shell frame: implemented in `apps/canopy-web/src/components/canopy-dashboard.tsx`, with scope rail, route navigation, object search, attention, command preview, and runtime counts.
- Task 48, universal object page: route-specific object hydration is covered by `apps/canopy-web/src/app/canopy-page.test.tsx` and `apps/canopy-web/src/lib/phase5-acceptance.test.ts`. The page now renders the required section grammar as visible review cards.
- Task 49, command preview: `apps/canopy-web/src/components/command-preview.tsx` shows proposed event, authority check, outbox effect, projection impact, and an explicit cancel/confirm preview boundary.
- Task 50, attention inbox: attention is now grouped into actionable queues with native Canopy routes, next actions, and event counts.
- Task 51, map/graph/list triad: the shell renders all three views from the same civic-memory object query model.
- Task 53, data stewardship UI patterns: the shell now surfaces visibility states, data states, redaction posture, consent posture, retention posture, restricted evidence, and export restriction.
- Task 54, federation/export UI: the shell now shows envelope status, content hash, local mappings, data stewardship agreements, redaction posture, readiness warnings, and event trail.

## Native Language Rule

CommonCredit, ICOS, Sensemaking, and Stewardship remain folded source histories or internal capability names only. They must not appear as standalone web workspaces, primary route labels, or primary command identities.

The visible resource/use-right route is now `/resource-care` with label `Resource Care`. The older `stewardship` command remains a compatibility alias to the native route, but it is not a primary navigation identity.

## Deferred Beyond Phase 5

- Full legacy capability wrappers belong to Phase 6.
- The complete Riverbend/Mill Creek end-to-end cybernetic journey belongs to Phase 7.
- Real persisted mutation confirmation belongs after authority-gated command handlers are ready; Phase 5 keeps the confirm button as a preview boundary.
- Multi-object page variants beyond the Riverbend resource path should expand as the Phase 6 wrappers expose more canonical object projections.

## Verification Gates

- `npm run check`
- Browser verification of `/scope`, `/objects/resource/resource.north-pasture`, `/resource-care`, `/federation`, object search, scope switching, and command preview boundary.
- No standalone folded project names in primary web navigation identities.

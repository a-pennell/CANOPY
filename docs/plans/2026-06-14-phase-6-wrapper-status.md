# Canopy Phase 6 Wrapper Status

Date: 2026-06-14

Phase 6 is now active and has a first complete wrapper pass for all four folded source histories. These wrappers are not separate apps. They are migration and compatibility surfaces that take legacy-shaped rows and produce native Canopy mappings, events, projections, validation reports, and adapter audits.

## Covered

- Stewardship rows now wrap into native Resource Care events and projections for commons, resources, use rights, policies, policy versions, tasks, contributions, decisions, and food flows.
- Sensemaking rows now wrap into native Claims & Evidence events and projections for issues, sources, claims, stakeholder groups, themes, contributions, evidence links, review states, AI extractions, and models.
- ICOS rows now wrap into native Governance and Authority events and projections for actors, roles, mandates, issues, proposals, policies, decisions, objections, amendments, and appeals.
- CommonCredit rows now wrap into native Allocation Accounting events and projections for members, ledger accounts, allocation agreements, posted ledger entries, and reversal/correction entries.
- The combined wrapper execution runs all four folded sources into one canonical runtime and validates the resulting event graph as one Canopy graph.
- Cross-source links now prove that ICOS decisions can authorize Resource Care use-rights and CommonCredit ledger entries.
- Unknown local subtypes produce persisted `adapter-audit` review records with `review-required` metadata instead of fake canonical mappings.
- Source-row lookup helpers resolve source project/entity/id triples back to canonical refs for future import review and UI workflows.
- Wrapper-fed federation export projections now cover included objects, event types, audit trail, authority refs, and content hash.

## Native Language Rule

CommonCredit, ICOS, Sensemaking, and Stewardship may appear in source metadata, import plans, canonical source pointers, audit metadata, and internal package names. They must not appear as standalone user-facing workspaces, primary route labels, generated projection titles, command labels, or object-page summaries.

## Verification Gates

- `npm --workspace @canopy/adapters-legacy-source-wrappers exec vitest run`
- `npm run check`
- Combined wrapper validation status must be `pass`.
- Fold-in shell leakage findings must be empty.
- Unknown subtype rows must create adapter audit review records, not canonical mapping records.

## Remaining Phase 6 Work

- Expand fixture realism with larger source exports, multiple communities, duplicate-source reconciliation, and partial-review paths.
- Add persisted import-review UI surfaces over the source-row lookup helpers.
- Add federation-specific source mapping payloads so federation preview `localMappings` is populated from wrapper mapping records, not only event payloads.
- Add end-to-end route coverage that hydrates object pages directly from wrapper-fed projections.
- Decide whether canonical object labels should expose friendly slugs separate from provenance-rich canonical ids.

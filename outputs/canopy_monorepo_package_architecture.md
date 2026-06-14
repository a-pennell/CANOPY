# Canopy Monorepo / Package Architecture

## 1. Architecture Thesis

Canopy should be one coherent civic/ecological infrastructure, not a repo that preserves CommonCredit, ICOS, Sensemaking, and Stewardship as four adjacent applications.

The monorepo exists to enforce that coherence in code:

- One kernel contract for identity, authority, object references, claims, evidence, data stewardship, events, civic memory, export, and federation.
- One object graph and event memory that every capability uses.
- Multiple domain capabilities that can evolve independently while speaking the same contracts.
- Provider and legacy adapters at the edges, never in the canonical meaning layer.
- Shells, jobs, projections, and agents as Canopy surfaces over shared capability services, not product-specific app islands.

CommonCredit becomes allocation/accounting and coordination capability code. ICOS becomes governance, civic memory, federation, living-systems, flow, and constitutional reference code. Sensemaking becomes claims/evidence and interpretation capability code. Stewardship becomes commons, resource, use-right, policy, maintenance, and flow capability code.

Their ancestry should remain visible in migration adapters, fixtures, and source notes. Their boundaries should not become primary navigation, package boundaries, or ontology boundaries.

## 2. Proposed Repo Layout

```text
canopy/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  eslint.config.mjs
  vitest.workspace.ts
  dependency-cruiser.config.cjs

  apps/
    canopy-shell/
      src/
        app/
        routes/
        server/
        ui/
    admin-console/
      src/
    public-export-viewer/
      src/

  packages/
    contracts/
      kernel/
        src/
      governance/
        src/
      domain/
        src/
      ui/
        src/
      adapters/
        src/
      testing/
        src/

    kernel/
      identity-authority/
        src/
      object-registry/
        src/
      permission-evaluator/
        src/
      civic-memory/
        src/
      data-stewardship/
        src/
      federation/
        src/

    capabilities/
      claims-evidence/
        src/
      governance/
        src/
      commons-registry/
        src/
      living-systems/
        src/
      stewardship/
        src/
      allocation-accounting/
        src/
      flows/
        src/
      simulation-models/
        src/
      care-coordination/
        src/
      learning-accountability/
        src/

    projections/
      object-page/
        src/
      civic-memory/
        src/
      authority/
        src/
      claim-evidence/
        src/
      decision-packet/
        src/
      resource-stewardship/
        src/
      accounting/
        src/
      federation-export/
        src/
      search/
        src/

    adapters/
      auth/
        clerk/
          src/
        nextauth/
          src/
        magic-link/
          src/
      database/
        prisma/
          src/
        drizzle/
          src/
        postgres/
          src/
      event-store/
        postgres/
          src/
      storage/
        object-storage/
          src/
        document-store/
          src/
        vector/
          src/
        geospatial/
          src/
        time-series/
          src/
      legacy/
        common-credit/
          src/
        icos/
          src/
        sensemaking/
          src/
        stewardship/
          src/

    database/
      schema-contracts/
        src/
      migrations/
        prisma/
        drizzle/
        sql/
      seeds/
      import-plans/
      migration-runners/
        src/

    workflows/
      agents/
        src/
      jobs/
        src/
      schedulers/
        src/
      outbox/
        src/

    ui/
      design-system/
        src/
      object-page/
        src/
      governance/
        src/
      commons/
        src/
      claims-evidence/
        src/
      allocation-accounting/
        src/
      flows/
        src/
      living-systems/
        src/

    evaluation/
      contract-fixtures/
        src/
      adapter-conformance/
        src/
      migration-fixtures/
        src/
      replay-tests/
        src/
      architecture-rules/
        src/

  tools/
    codegen/
    dependency-checks/
    migration-audits/
    fixture-builders/

  docs/
    architecture/
    decisions/
    migration/
    capability-manifests/
```

### Layout Notes

- `apps/` contains deployable shells and operator surfaces only.
- `packages/contracts/` contains canonical serializable meaning.
- `packages/kernel/` contains Canopy-native services that enforce kernel behavior.
- `packages/capabilities/` contains domain services folded into Canopy capability boundaries.
- `packages/adapters/` contains provider, storage, and legacy translation code.
- `packages/projections/` contains rebuildable read models.
- `packages/workflows/` contains agents, jobs, schedulers, outbox dispatchers, and replay workers.
- `packages/database/` contains schema support, migrations, seeds, and import runners.
- `packages/evaluation/` contains tests, fixtures, architecture checks, and replay validation.
- `packages/ui/` contains reusable UI implementation packages. UI contracts remain in `packages/contracts/ui`.

## 3. Dependency Graph And Forbidden Dependencies

### Allowed Dependency Shape

```text
apps/*
  -> packages/ui/*
  -> packages/projections/*
  -> packages/capabilities/*
  -> packages/kernel/*
  -> packages/contracts/*

packages/workflows/*
  -> packages/capabilities/*
  -> packages/kernel/*
  -> packages/adapters/*
  -> packages/contracts/*

packages/capabilities/*
  -> packages/kernel/*
  -> packages/contracts/*

packages/kernel/*
  -> packages/contracts/*
  -> selected adapter contracts

packages/adapters/*
  -> packages/contracts/*
  -> provider SDKs or legacy clients

packages/projections/*
  -> packages/contracts/*
  -> packages/kernel/*
  -> packages/adapters/*

packages/evaluation/*
  -> all packages under test
```

### Contract Package Dependency Shape

```text
contracts/kernel
  <- contracts/governance
  <- contracts/domain
  <- contracts/ui

contracts/kernel
  <- contracts/adapters

contracts/*
  <- contracts/testing
```

### Forbidden Dependencies

- `packages/contracts/kernel` must not import governance, domain, UI, adapter, app, provider, ORM, or runtime code.
- No contract package may import Prisma, Drizzle, Clerk, NextAuth, React, Next.js, queue clients, cache clients, storage SDKs, vector SDKs, or database clients.
- `packages/kernel/*` must not import from `apps/*`.
- `packages/capabilities/*` must not import from `apps/*`.
- `packages/capabilities/*` must not import provider SDKs directly. They use adapter interfaces.
- `packages/ui/*` must not define authority, ontology, event, or data stewardship semantics.
- `apps/*` must not write directly to database clients for consequential changes. They call capability services or command handlers.
- Legacy adapters must not be imported by canonical contracts, kernel services, or domain contracts.
- No package may depend on another package through deep source paths unless that package explicitly exposes that entry point.
- No top-level package or route may be named `common-credit`, `icos`, `sensemaking`, or `stewardship` as a user-facing application boundary.

## 4. Package Responsibilities

### `packages/contracts/kernel`

Canonical Zod and TypeScript contracts for:

- `ObjectRef`
- `CanopyObjectType`
- `CanopyCapability`
- `Person`, `Account`, `Organization`, `Membership`
- `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`
- `PermissionAtom`, `AccessRule`, permission check request/result
- Data visibility, data state, stewardship agreements
- `Claim`, `Counterclaim`, `Source`, `Evidence`, `EvidenceLink`
- `CanopyEvent`, export envelope, federation rule
- Governance and ecological hook base shapes
- Schema version and validation error helpers

### `packages/contracts/governance`

Governance contracts above the kernel:

- `Issue`, `Perspective`, `Proposal`, `Decision`, `DecisionPacket`
- `Agreement`, `Policy`, `PolicyVersion`
- `Appeal`, `Conflict`
- Vote, consent, quorum, and decision-process artifacts
- Governance profiles and decision method configuration

### `packages/contracts/domain`

Shared domain contracts for capability modules:

- Places, commons, living systems, resources, stocks, flows
- Indicators, thresholds, guardian reviews
- Needs, capabilities, requests, offers, commitments
- Allocations, obligations, use rights
- Ledger accounts, ledger entries, budgets, treasuries
- Projects, routines, tasks, contributions, outcomes
- Models, assumptions, scenarios, model outputs, audits
- Care holds, support circles, repair threads
- Local taxonomy and canonical mappings
- Capability manifests

### `packages/contracts/ui`

Serializable UI view-model contracts:

- Object page hydration
- Object page sections
- Search result items
- Scope switcher options
- Attention items
- Decision packet view models
- Civic memory timeline view models
- Redaction display policy
- Canonical and local display labels

### `packages/contracts/adapters`

Provider-neutral adapter interfaces:

- Auth adapter
- Persistence adapter
- Event store adapter
- Object graph adapter
- Document store adapter
- Geospatial adapter
- Time-series adapter
- Vector adapter
- Object storage adapter
- Federation transport adapter
- Legacy project adapter

### `packages/contracts/testing`

Shared contract fixtures and test helpers:

- Golden object refs
- Golden identity, authority, claims/evidence, governance, resource, allocation, flow, ecology, federation, and redaction fixtures
- Event fixtures for the first stable event set
- Capability manifest examples
- Schema compatibility helpers
- Adapter conformance harness entry points

### `packages/kernel/*`

Canopy-native kernel services:

- Identity and authority resolution
- Object registry and local source mapping
- Permission evaluation
- Data stewardship policy evaluation
- Civic memory append/read APIs
- Event envelope validation and append-only enforcement hooks
- Export, import, federation, and reconciliation orchestration

### `packages/capabilities/*`

Canopy-native domain behavior. These are not apps. They expose command/query services, event payload factories, policy hooks, and capability manifests.

### `packages/adapters/*`

Provider and legacy edges. They translate between Canopy contracts and external or historical implementation details.

### `packages/projections/*`

Rebuildable read models for shell/UI, exports, search, and evaluation. Projections are never authority.

### `packages/workflows/*`

Long-running or asynchronous behavior:

- Outbox dispatch
- Projection rebuilds
- Import jobs
- Export bundle jobs
- Event replay
- AI extraction jobs
- Model audits
- Federation sync
- Scheduled threshold checks

### `packages/database/*`

Database shape, migration, and import organization without letting database models become ontology.

### `packages/ui/*`

Reusable UI implementations that consume UI contracts, projection data, and command/query clients.

## 5. Where Canonical Contracts Live

Canonical contracts live only under `packages/contracts/`.

```text
packages/contracts/
  kernel/
  governance/
  domain/
  ui/
  adapters/
  testing/
```

Rules:

- Contracts are the canonical language of Canopy.
- Zod schemas are the runtime boundary.
- TypeScript types are inferred from schemas.
- Schema versions are included for durable, exported, replayed, federated, or imported data.
- Contracts are implementation-neutral across ORM, auth provider, storage provider, runtime framework, queue, and UI library.
- Prisma and Drizzle schemas may mirror contracts, but they never define Canopy meaning.

## 6. Where Adapters Live

Adapters live under `packages/adapters/`.

```text
packages/adapters/
  auth/
    clerk/
    nextauth/
    magic-link/
  database/
    prisma/
    drizzle/
    postgres/
  event-store/
    postgres/
  storage/
    object-storage/
    document-store/
    vector/
    geospatial/
    time-series/
  legacy/
    common-credit/
    icos/
    sensemaking/
    stewardship/
```

Adapter rules:

- Provider adapters implement `packages/contracts/adapters`.
- Legacy adapters map source rows and events into `ObjectRef`, canonical snapshots, and `CanopyEvent`.
- Legacy adapters may import local generated clients, source-specific mapping tables, or provider SDKs.
- Adapters emit validation reports when mappings are unknown or ambiguous.
- Adapters may preserve legacy tables, but consequential writes must go through command adapters.
- Legacy adapters are transitional. Capability services are the long-term home for behavior.

## 7. Where Module Capabilities Live

Capabilities live under `packages/capabilities/`. They are Canopy capability modules, not folded app names.

```text
packages/capabilities/
  claims-evidence/
  governance/
  commons-registry/
  living-systems/
  stewardship/
  allocation-accounting/
  flows/
  simulation-models/
  care-coordination/
  learning-accountability/
```

### Allocation

Home:

- `packages/capabilities/allocation-accounting`
- `packages/capabilities/flows` for material and care flows
- `packages/contracts/domain` for `Need`, `Request`, `Offer`, `Commitment`, `Allocation`, `Obligation`, `LedgerAccount`, `LedgerEntry`

Source ancestry:

- CommonCredit offers, needs, invoices, ledger entries, credit limit requests, disputes, treasury allocations
- ICOS Synapse declarations and allocation proposals
- Stewardship procurement needs and production capacities

Responsibilities:

- Match needs, offers, requests, and commitments.
- Create governed allocations.
- Preserve double-entry and reversal invariants where accounting is used.
- Treat credit capacity as a governed use right.
- Emit `coordination.*`, `allocation.*`, `accounting.*`, and `flow.*` events.

### Sensemaking

Home:

- `packages/capabilities/claims-evidence`
- `packages/capabilities/governance` for issue and perspective workflows
- `packages/contracts/kernel` for claims/evidence primitives
- `packages/contracts/governance` for issue, perspective, and decision packet contracts

Source ancestry:

- Sensemaking issue, source, claim, theme, stakeholder group, and contribution schema
- ICOS perspective and memory protocol
- Stewardship resource documents and proposal evidence
- CommonCredit dispute evidence

Responsibilities:

- Attach claims to any `ObjectRef`.
- Preserve counterclaims and disagreement.
- Link evidence through explicit evidence links.
- Mark AI output as machine-inferred, model-derived, or draft until reviewed.
- Emit `claim.*` and `evidence.*` events.

### Stewardship

Home:

- `packages/capabilities/stewardship`
- `packages/capabilities/commons-registry`
- `packages/capabilities/flows`
- `packages/contracts/domain` for resources, use rights, routines, tasks, contributions, flows

Source ancestry:

- Stewardship resource registry, access rights, policies, maintenance, contribution, event log, and food-flow schemas
- ICOS Equip/shared asset lifecycle concepts
- CommonCredit commons resources and maintenance logs

Responsibilities:

- Manage resource and commons workflows.
- Evaluate use rights through kernel permissions and authority.
- Connect resource condition updates to claims, indicators, and civic memory.
- Represent maintenance as routines, tasks, and contributions without ranking.
- Emit `stewardship.*` and `flow.*` events.

### Governance

Home:

- `packages/capabilities/governance`
- `packages/kernel/identity-authority`
- `packages/kernel/civic-memory`
- `packages/contracts/governance`

Source ancestry:

- ICOS CommonGround protocol, delegations, decision records, referenda, timeline events
- Stewardship proposals, decisions, policy versions, votes, decision rules
- CommonCredit proposals, votes, disputes, treasury allocation governance
- Sensemaking issues and perspectives

Responsibilities:

- Open issues and proposals.
- Capture perspectives, objections, appeals, conflicts, and decision-process artifacts.
- Record binding decisions with authority references.
- Create decision packets.
- Version policies through decisions.
- Preserve unresolved objections and review dates.
- Emit `governance.*` and `authority.*` events.

### Ecological Modeling

Home:

- `packages/capabilities/living-systems`
- `packages/capabilities/simulation-models`
- `packages/capabilities/flows`
- `packages/contracts/domain` for `LivingSystem`, `Indicator`, `Threshold`, `Model`, `Scenario`, `ModelOutput`

Source ancestry:

- ICOS EIL concepts, ecological proxies, territory guardians, annotations, thresholds
- Stewardship food flows and resource condition updates
- Sensemaking claims/evidence about ecological effects

Responsibilities:

- Register living systems and ecological scopes.
- Manage indicators, thresholds, and guardian reviews.
- Classify thresholds as advisory, governance-triggering, or binding.
- Treat model outputs and scenarios as evidence, not decisions.
- Emit `ecology.*`, `flow.*`, and `model.*` events.

## 8. Where Shell/UI Surfaces Live

Deployable surfaces live in `apps/`.

```text
apps/
  canopy-shell/
  admin-console/
  public-export-viewer/
```

Reusable UI implementation lives in `packages/ui/`.

```text
packages/ui/
  design-system/
  object-page/
  governance/
  commons/
  claims-evidence/
  allocation-accounting/
  flows/
  living-systems/
```

UI rules:

- `apps/canopy-shell` is the primary user-facing Canopy surface.
- Navigation is by object, scope, capability, process, and memory, not by legacy project.
- The shell hydrates object pages through `packages/projections/object-page` and `packages/contracts/ui`.
- UI packages may render local language through display labels and local taxonomy mappings.
- UI packages must not redefine authority, identity, governance, stewardship, event, or ontology semantics.
- Redacted or sealed records render continuity without exposing protected payloads.

Expected first shell surfaces:

- Object page
- Scope switcher
- Civic memory timeline
- Decision packet
- Claim/evidence graph
- Resource and use-right panel
- Policy/version panel
- Flow and indicator panel
- Export/fork panel

## 9. Where Agents, Workflows, And Jobs Live

Agents and jobs live in `packages/workflows/`.

```text
packages/workflows/
  agents/
  jobs/
  schedulers/
  outbox/
```

Responsibilities:

- Import legacy source records into mapping tables.
- Backfill `ObjectRef`s.
- Dispatch outbox events.
- Rebuild projections.
- Replay event history.
- Create export bundles.
- Run federation import/reconciliation.
- Run AI source extraction as draft claim/evidence generation.
- Run model audits.
- Check ecological thresholds and create governance-trigger events.
- Generate migration validation reports.

Workflow rules:

- Jobs call capability services and adapters. They do not own canonical meaning.
- AI agents can propose claims, summaries, model outputs, extraction candidates, and review packets. They cannot record binding decisions.
- Every workflow that changes rights, obligations, governance state, resource state, ecological state, data visibility, federation state, or accounting state must emit canonical events.
- Outbox jobs treat undispatched consequential events as reconciliation failures until resolved.

## 10. Database, Migration, And Project Import Organization

Database support lives under `packages/database/`.

```text
packages/database/
  schema-contracts/
  migrations/
    prisma/
    drizzle/
    sql/
  seeds/
  import-plans/
  migration-runners/
```

### Canonical Tables Or Equivalents

Every persistence backend should support equivalent shapes for:

- `canopy_object_ref_map`
- `canopy_canonical_mappings`
- `canopy_events`
- `canopy_outbox`
- `canopy_projection_state`
- `canopy_adapter_audit`

These may be implemented through Prisma models, Drizzle tables, SQL migrations, or a compatible event-store schema. The contract shape must remain identical.

### Migration Organization

```text
packages/database/import-plans/
  common-credit/
    inventory.md
    mapping-table.md
    data-stewardship-defaults.md
  icos/
  sensemaking/
  stewardship/

packages/database/migration-runners/
  src/
    common-credit/
    icos/
    sensemaking/
    stewardship/
```

Migration rules:

- Object-ref backfills are idempotent.
- Unknown local subtypes are reported, not guessed.
- Corrections preserve superseded mapping history.
- Legacy events import with `systemActor: "importer"` and source metadata.
- Event store enforcement should follow the ICOS pattern where possible: insert/select only, no update/delete.
- Projections are rebuildable and traceable to source event offsets.

## 11. Testing And Evaluation Package Organization

Testing and evaluation live under `packages/evaluation/` and `packages/contracts/testing`.

```text
packages/evaluation/
  contract-fixtures/
  adapter-conformance/
  migration-fixtures/
  replay-tests/
  architecture-rules/
```

### Contract Fixtures

Use for:

- Golden object refs
- Golden event envelopes
- Golden decision packets
- Golden export envelopes
- Golden redacted stubs
- Capability manifests

### Adapter Conformance

Use for:

- Auth adapter conformance
- Prisma adapter conformance
- Drizzle adapter conformance
- Event-store append-only conformance
- Legacy adapter mapping conformance
- Provider-neutrality checks

### Migration Fixtures

Use for source-shaped examples from:

- CommonCredit
- ICOS
- Sensemaking
- Stewardship

### Replay Tests

Use for:

- Event replay from scratch
- Incremental projection updates
- Projection rebuild equality
- Export/fork bundle validation
- Decision packet reconstruction

### Architecture Rules

Use for static checks:

- No forbidden package imports
- No cycles
- No provider imports in contracts
- No app imports in packages that should be app-neutral
- Every public schema has an inferred type
- Every public package exports through `src/index.ts`
- No legacy project name becomes a top-level user-facing app package

## 12. Build Tooling Assumptions

Initial assumptions:

- Package manager: `pnpm` workspaces.
- Build orchestrator: Turborepo or an equivalent task runner.
- Language: TypeScript.
- Runtime validation: Zod.
- Tests: Vitest for package tests.
- Static dependency checks: dependency-cruiser, publint, or a custom rule package.
- Linting: ESLint with package-boundary rules.
- Formatting: Prettier or repo-standard formatter.
- Output format: ESM-first packages.
- Contracts target: runtime-neutral TypeScript with no framework dependency.
- Apps may use Next.js or another web runtime, but apps do not define contracts.
- Database support starts with Prisma and Drizzle adapters, plus SQL migrations for constraints neither ORM expresses well.
- CI must run build, unit tests, contract tests, architecture checks, adapter conformance tests, and migration fixture tests.

Open choices before implementation:

- Whether to publish `@canopy/contracts-*` packages externally or keep them private initially.
- Whether to use dual ESM/CJS builds.
- Whether to generate JSON Schema from Zod in v1.
- Whether branded IDs are runtime-prefixed or type-level only.
- Whether event payload registries are centralized or package-composed.

## 13. First Implementation Sequence

### Phase 1: Skeleton And Guardrails

1. Create workspace config, package manager config, base TypeScript config, test config, and dependency rule config.
2. Scaffold `packages/contracts/*` exactly enough to build.
3. Add empty `src/index.ts` exports and package metadata.
4. Add dependency checks that fail on provider, ORM, app, React, and Next.js imports in contracts.
5. Add architecture tests for forbidden dependency directions.

Exit criteria:

- All empty packages build.
- Empty tests run.
- A deliberate forbidden import fails the architecture check.

### Phase 2: Kernel Contract MVP

1. Implement `ObjectRef`, `CanopyObjectType`, `CanopyCapability`, schema versions, and validation errors.
2. Implement identity, authority, permission, data stewardship, claims/evidence, event envelope, export envelope, and federation base schemas.
3. Add golden kernel fixtures.
4. Add invariant tests for account authority, revocable delegation, event authority refs, AI output limits, export metadata, and redacted continuity.

Exit criteria:

- Kernel fixtures parse.
- First stable event constants validate.
- Kernel contracts remain provider-neutral.

### Phase 3: Governance And Domain Contracts

1. Implement governance contracts for issues, perspectives, proposals, decisions, decision packets, agreements, policies, appeals, and conflicts.
2. Implement domain contracts for commons, resources, living systems, flows, allocation, accounting, routines, tasks, contributions, models, care, and learning.
3. Implement capability manifests.
4. Add tests for decision authority, policy traceability, ecological hooks, ledger reversals, anti-score rules, and care privacy defaults.

Exit criteria:

- Governance and domain fixtures validate.
- Votes cannot validate as decisions.
- Ledger account is distinct from identity account.

### Phase 4: Adapter Contracts And Conformance Harness

1. Define auth, persistence, event-store, object-graph, document, geospatial, time-series, vector, object-storage, federation, and legacy adapter interfaces.
2. Implement adapter conformance helper package.
3. Add provider-neutrality tests.

Exit criteria:

- Provider-specific implementation packages have an obvious interface to implement.
- Contract packages still do not import provider SDKs.

### Phase 5: Database Skeleton And Object Registry

1. Add canonical migration shapes for object refs, canonical mappings, events, outbox, projection state, and adapter audit.
2. Add Prisma, Drizzle, and SQL migration homes.
3. Implement object-ref map contracts and seed fixtures.
4. Build migration inventory templates for all four source projects.

Exit criteria:

- A source row can be mapped to a stable `ObjectRef` in fixtures.
- Mapping runs are idempotent in tests.

### Phase 6: First Wrapper Pair

1. Implement Sensemaking legacy adapter for `Issue`, `Source`, and `Claim`.
2. Implement Stewardship legacy adapter for `Community`, `Resource`, `AccessRight`, `Policy`, and `Decision`.
3. Emit canonical claim/evidence, governance, stewardship, and use-right events in fixture mode.
4. Build `claim-evidence`, `resource-stewardship`, `authority`, and `object-page` projections.

Exit criteria:

- One Prisma-shaped fixture and one Drizzle-shaped fixture produce identical canonical behavior.
- A Canopy object page can show a Sensemaking issue and a Stewardship resource through the same hydration contract.

### Phase 7: First Thin Canopy Slice

1. Import one organization/community.
2. Register one commons/place and one resource.
3. Add one resource condition claim with evidence.
4. Open one issue.
5. Submit one perspective.
6. Create one proposal.
7. Record one decision with authority refs.
8. Version one policy or grant one use right.
9. Create one maintenance routine or task.
10. Log one completion or contribution.
11. Emit all canonical events.
12. Render object page, civic memory, and decision packet.
13. Export the object/event bundle.

Exit criteria:

- The slice exercises Stewardship, Sensemaking, ICOS-derived governance/memory, and the kernel without exposing legacy product boundaries.

## 14. Risks And Anti-Fragmentation Safeguards

| Risk | Why it matters | Safeguard |
| --- | --- | --- |
| Legacy apps become folders inside one repo | The user still experiences four products | Shell navigation is Canopy-first; legacy names only appear in adapters, fixtures, docs, and migration reports |
| ORM models become contracts | Canopy splits into Prisma and Drizzle meanings | Contracts live only in `packages/contracts`; ORMs implement mappings |
| Adapter layer becomes a second framework | Teams avoid using it or bypass it | Keep adapters narrow: map, persist, append events, rebuild projections, validate |
| Identity shadowing | Local `Member`, `Account`, `Community`, or `Space` carries unsafe authority | Require `Person`, `Account`, `Membership`, `RoleAssignment`, `Mandate`, and scoped `ObjectRef` resolution |
| Event fragmentation | Civic memory cannot replay or export | All consequential writes emit `CanopyEvent`; append-only enforcement is tested |
| Governance bypass | Admin actions mutate rights, policies, allocations, or credit limits | Capability command handlers require `authorityRefs` and decision packet rules |
| Claims collapse into comments or AI summaries | Decisions lose contestability | Claims, counterclaims, sources, evidence, and perspectives remain separate contracts |
| Contribution and credit become ranking | Violates anti-score and care constraints | Prohibit portable social scores and hidden eligibility; keep feedback contextual |
| Ecological consequences stay decorative | Resource and flow decisions ignore living systems | Material capabilities must expose ecological hooks, indicators, thresholds, and guardian review paths |
| Projections become authority | Cached views override civic memory | Projections are rebuildable and traceable to event offsets |
| Privacy conflicts with append-only memory | Sensitive data leaks through unified search or exports | Use sealed payloads, redacted stubs, visibility inheritance, retention rules, and stewardship agreements |
| Constitutional overreach | ICOS defaults become universal law | Kernel hard-codes only exit, revocability, due process, memory, export, and anti-capture invariants; other rules are governance profiles |
| Premature native translation | Rewrites reproduce four ontologies | Extract, wrap, project, then translate only after fixture and event parity |

## 15. Acceptance Criteria For The Repo Skeleton

The initial monorepo skeleton is acceptable when:

- Workspace config exists and all scaffolded packages build.
- `apps/canopy-shell` exists as a shell, not as a bundle of legacy app routes.
- `packages/contracts/kernel`, `governance`, `domain`, `ui`, `adapters`, and `testing` exist with package metadata and root exports.
- Contract packages have dependency rules preventing ORM, provider, UI framework, app, and adapter implementation imports.
- `packages/kernel`, `packages/capabilities`, `packages/adapters`, `packages/projections`, `packages/database`, `packages/workflows`, `packages/ui`, and `packages/evaluation` exist with README or package stubs explaining ownership.
- Legacy project code has homes only under `packages/adapters/legacy/*`, migration fixtures, or docs until translated into Canopy capability services.
- Capability packages are named for Canopy capabilities, not CommonCredit, ICOS, Sensemaking, or Stewardship.
- Database directories include migration homes for Prisma, Drizzle, and raw SQL constraints.
- Evaluation packages include architecture rule tests, contract fixture homes, adapter conformance homes, migration fixture homes, and replay test homes.
- The first stable event set has a declared fixture location.
- The object-ref map, canonical mappings, event store, outbox, projection state, and adapter audit table shapes have a declared home.
- The dependency graph makes it impossible for apps or adapters to redefine canonical contracts.
- The skeleton makes the next implementation step obvious: implement contracts first, then database/object registry, then adapters/projections, then thin Canopy slices.

## Summary

The monorepo should make the correct architecture easy and the fragmenting architecture awkward.

Canopy contracts define meaning. Kernel services enforce shared civic infrastructure. Capability packages hold domain behavior. Adapters translate providers and legacy systems. Projections serve UI and export needs. Apps render Canopy surfaces.

That structure lets CommonCredit, ICOS, Sensemaking, and Stewardship be folded in as capabilities of one system rather than preserved as separate apps with a shared logo.

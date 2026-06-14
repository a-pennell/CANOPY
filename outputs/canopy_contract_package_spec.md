# Canopy Contract Package Spec

## 1. Purpose

This spec turns the Canopy architecture documents into implementable TypeScript/Zod package boundaries.

The first implementation goal is not to build full services. It is to publish stable, provider-neutral contract packages that every Canopy module, legacy adapter, API route, event writer, object page, export job, and federation workflow can share.

Source context:

- `outputs/canopy_kernel_contract.md`
- `outputs/canopy_ontology_map.md`
- `outputs/canopy_event_taxonomy.md`
- `outputs/canopy_module_manifests.md`
- `outputs/canopy_reference_architecture.md`

## 2. Scope

This artifact specifies:

- Package names and responsibilities.
- Folder structure.
- Public TypeScript/Zod exports.
- Package dependency rules.
- Contract neutrality across Prisma, Drizzle, auth providers, queues, and runtime frameworks.
- Schema versioning and SemVer rules.
- Validation strategy.
- First implementation backlog.

This artifact does not specify:

- Database migrations.
- Prisma or Drizzle schemas.
- Runtime services.
- API route implementations.
- UI components.
- Event store infrastructure.

## 3. Design Principles

1. Contracts before implementations.
2. Kernel contracts must be implementation-neutral.
3. Zod schemas are the runtime boundary; TypeScript types are inferred from schemas.
4. Packages may define data shapes, enums, validation helpers, and contract tests.
5. Packages must not import application code, database clients, auth SDKs, UI frameworks, queue clients, or storage clients.
6. Domain packages depend inward on kernel packages.
7. Adapters depend on contracts, never the other way around.
8. Event, export, and federation contracts must remain replayable across versions.
9. AI output, model output, claims, evidence, decisions, and authority remain separate contract concepts.
10. Contracts must preserve forkability, export, data stewardship, append-only memory, revocable authority, and ecological visibility.

## 4. Proposed Monorepo Package Layout

```text
packages/
  canopy-kernel-contracts/
    package.json
    src/
      index.ts
      ids.ts
      object-ref.ts
      capabilities.ts
      identity.ts
      authority.ts
      permissions.ts
      data-stewardship.ts
      claims-evidence.ts
      events.ts
      civic-memory.ts
      federation.ts
      governance-hooks.ts
      ecological-hooks.ts
      lifecycle.ts
      errors.ts
      schema-version.ts
      testing.ts
    test/
      schema-roundtrip.test.ts
      event-envelope.test.ts
      invariants.test.ts

  canopy-governance-contracts/
    package.json
    src/
      index.ts
      issue.ts
      perspective.ts
      proposal.ts
      decision.ts
      decision-packet.ts
      agreement.ts
      policy.ts
      appeal.ts
      conflict.ts
      decision-process.ts
      governance-profile.ts
      manifest.ts
    test/
      decision-authority.test.ts
      policy-versioning.test.ts

  canopy-domain-contracts/
    package.json
    src/
      index.ts
      reality-map.ts
      commons.ts
      living-systems.ts
      coordination.ts
      allocation-accounting.ts
      flows.ts
      models.ts
      care.ts
      learning.ts
      object-relationships.ts
      local-taxonomy.ts
      manifests.ts
    test/
      ecological-hooks.test.ts
      accounting-anti-score.test.ts
      manifests.test.ts

  canopy-ui-contracts/
    package.json
    src/
      index.ts
      object-page.ts
      search.ts
      navigation.ts
      attention.ts
      decision-packet-view.ts
      civic-memory-view.ts
      redaction.ts
      display-policy.ts
    test/
      object-page-contract.test.ts
      redaction-contract.test.ts

  canopy-adapter-contracts/
    package.json
    src/
      index.ts
      auth-adapter.ts
      orm-adapter.ts
      event-store-adapter.ts
      object-graph-adapter.ts
      document-store-adapter.ts
      geospatial-adapter.ts
      time-series-adapter.ts
      vector-adapter.ts
      object-storage-adapter.ts
      federation-transport-adapter.ts
      legacy-project-adapter.ts
    test/
      adapter-conformance.test.ts
      provider-neutrality.test.ts

  canopy-contract-tests/
    package.json
    src/
      index.ts
      fixtures/
      validators/
      golden-events/
      golden-exports/
      manifest-examples/
```

## 5. Package Responsibilities

### 5.1 `@canopy/canopy-kernel-contracts`

Owns the shared substrate that every module must use.

Public export categories:

- Stable IDs and branded ID helpers.
- Canonical object references.
- Capability registry.
- Identity and membership.
- Authority, roles, mandates, delegations, guardians.
- Permission atoms, access rules, permission check request/result.
- Data visibility, data state, stewardship agreements, retention/export/federation rules.
- Claims, counterclaims, evidence, sources, evidence links.
- Event envelope, event namespace values, event payload registry hooks.
- Civic memory append-only metadata.
- Export envelope and federation rule.
- Governance hook and ecological hook shapes.
- Lifecycle status families.
- Shared validation errors and schema version helpers.

Key exports:

```ts
export const CanopyObjectTypeSchema: z.ZodEnum<[...]>;
export type CanopyObjectType = z.infer<typeof CanopyObjectTypeSchema>;

export const CanopyCapabilitySchema: z.ZodEnum<[...]>;
export type CanopyCapability = z.infer<typeof CanopyCapabilitySchema>;

export const ObjectRefSchema: z.ZodObject<...>;
export type ObjectRef = z.infer<typeof ObjectRefSchema>;

export const PersonSchema: z.ZodObject<...>;
export const AccountSchema: z.ZodObject<...>;
export const OrganizationSchema: z.ZodObject<...>;
export const MembershipSchema: z.ZodObject<...>;

export const RoleSchema: z.ZodObject<...>;
export const RoleAssignmentSchema: z.ZodObject<...>;
export const MandateSchema: z.ZodObject<...>;
export const DelegationSchema: z.ZodObject<...>;
export const GuardianSchema: z.ZodObject<...>;

export const PermissionAtomSchema: z.ZodObject<...>;
export const AccessRuleSchema: z.ZodObject<...>;
export const PermissionCheckRequestSchema: z.ZodObject<...>;
export const PermissionCheckResultSchema: z.ZodObject<...>;

export const DataVisibilitySchema: z.ZodEnum<[...]>;
export const DataStateSchema: z.ZodEnum<[...]>;
export const DataStewardshipAgreementSchema: z.ZodObject<...>;

export const ClaimSchema: z.ZodObject<...>;
export const CounterclaimSchema: z.ZodObject<...>;
export const SourceSchema: z.ZodObject<...>;
export const EvidenceSchema: z.ZodObject<...>;
export const EvidenceLinkSchema: z.ZodObject<...>;

export const CanopyEventSchema: z.ZodObject<...>;
export const CanopyEventTypeSchema: z.ZodString;
export const CanopyExportEnvelopeSchema: z.ZodObject<...>;
export const FederationRuleSchema: z.ZodObject<...>;

export const GovernanceHooksSchema: z.ZodObject<...>;
export const EcologicalHooksSchema: z.ZodObject<...>;
export const CapabilityManifestBaseSchema: z.ZodObject<...>;
```

Kernel invariants to encode as validation helpers:

- `ObjectRef.id` is required and stable.
- `ObjectRef.type` must be canonical or explicitly mapped through local taxonomy.
- `ObjectRef.schemaVersion` is required.
- Account authority is invalid; authority must flow through membership, role assignment, mandate, delegation, guardian, policy, agreement, or emergency authority.
- Delegations must be revocable.
- Binding decision events must include authority references.
- AI and model outputs must not validate as decisions.
- Decision-relevant assertions must validate as claims linked to evidence where required by governance profile.
- Export envelopes must include schema version, content hash, and data stewardship metadata.

### 5.2 `@canopy/canopy-governance-contracts`

Owns the governance spine above the kernel.

Depends on:

- `@canopy/canopy-kernel-contracts`

Public export categories:

- Issues.
- Perspectives.
- Proposals, amendments, objections.
- Decision records.
- Decision packets.
- Agreements.
- Policies and policy versions.
- Appeals.
- Conflicts and restorative process references.
- Decision process artifacts such as vote, consent signal, quorum state.
- Governance profiles and decision method configuration.
- Governance capability manifest.

Key exports:

```ts
export const IssueSchema: z.ZodObject<...>;
export const PerspectiveSchema: z.ZodObject<...>;
export const ProposalSchema: z.ZodObject<...>;
export const AmendmentSchema: z.ZodObject<...>;
export const ObjectionSchema: z.ZodObject<...>;
export const DecisionSchema: z.ZodObject<...>;
export const DecisionPacketSchema: z.ZodObject<...>;
export const AgreementSchema: z.ZodObject<...>;
export const PolicySchema: z.ZodObject<...>;
export const PolicyVersionSchema: z.ZodObject<...>;
export const AppealSchema: z.ZodObject<...>;
export const ConflictSchema: z.ZodObject<...>;
export const VoteSchema: z.ZodObject<...>;
export const ConsentSignalSchema: z.ZodObject<...>;
export const QuorumStateSchema: z.ZodObject<...>;
export const DecisionMethodConfigSchema: z.ZodDiscriminatedUnion<...>;
export const GovernanceProfileSchema: z.ZodObject<...>;
export const GovernanceManifestSchema: z.ZodObject<...>;
```

Governance validation rules:

- A decision must cite at least one proposal or issue.
- A decision that changes rights, obligations, policy, data visibility, federation, threshold, allocation, mandate, or delegation must cite authority.
- Policy versions must cite their policy and decision source.
- Appeals and conflicts must preserve target object references.
- Votes and consent signals are process artifacts, not decisions.
- Unresolved objections must remain visible according to their data stewardship rules.

### 5.3 `@canopy/canopy-domain-contracts`

Owns domain object contracts that are not kernel primitives but are still shared across capability modules.

Depends on:

- `@canopy/canopy-kernel-contracts`
- `@canopy/canopy-governance-contracts` only where a domain object directly embeds governance contract fields.

Public export categories:

- Reality map and object relationships.
- Commons, resources, use rights, routines, tasks, contributions.
- Living systems, indicators, thresholds, guardian reviews.
- Needs, capabilities, requests, offers, commitments.
- Allocations, obligations, ledger accounts, ledger entries, budgets, treasury.
- Stocks and flows.
- Models, assumptions, scenarios, model outputs, audits, disputes.
- Care holds, support circles, repair threads, care load signals.
- Outcomes, retrospectives, learning reviews.
- Local taxonomy, local term, canonical mapping.
- Capability manifests for domain modules.

Key exports:

```ts
export const PlaceSchema: z.ZodObject<...>;
export const CommonsSchema: z.ZodObject<...>;
export const LivingSystemSchema: z.ZodObject<...>;
export const ResourceSchema: z.ZodObject<...>;
export const StockSchema: z.ZodObject<...>;
export const FlowSchema: z.ZodObject<...>;
export const IndicatorSchema: z.ZodObject<...>;
export const ThresholdSchema: z.ZodObject<...>;
export const GuardianReviewSchema: z.ZodObject<...>;

export const ObjectRelationshipSchema: z.ZodObject<...>;
export const LocalTermSchema: z.ZodObject<...>;
export const CanonicalMappingSchema: z.ZodObject<...>;

export const NeedSchema: z.ZodObject<...>;
export const CapabilitySchema: z.ZodObject<...>;
export const RequestSchema: z.ZodObject<...>;
export const OfferSchema: z.ZodObject<...>;
export const CommitmentSchema: z.ZodObject<...>;
export const AllocationSchema: z.ZodObject<...>;
export const ObligationSchema: z.ZodObject<...>;
export const UseRightSchema: z.ZodObject<...>;

export const ProjectSchema: z.ZodObject<...>;
export const RoutineSchema: z.ZodObject<...>;
export const TaskSchema: z.ZodObject<...>;
export const ContributionSchema: z.ZodObject<...>;
export const OutcomeSchema: z.ZodObject<...>;

export const LedgerAccountSchema: z.ZodObject<...>;
export const LedgerEntrySchema: z.ZodObject<...>;
export const BudgetSchema: z.ZodObject<...>;
export const TreasurySchema: z.ZodObject<...>;

export const ModelSchema: z.ZodObject<...>;
export const AssumptionSchema: z.ZodObject<...>;
export const ScenarioSchema: z.ZodObject<...>;
export const ModelOutputSchema: z.ZodObject<...>;
export const ModelAuditSchema: z.ZodObject<...>;

export const CareHoldSchema: z.ZodObject<...>;
export const SupportCircleSchema: z.ZodObject<...>;
export const RepairThreadSchema: z.ZodObject<...>;
export const CareLoadSignalSchema: z.ZodObject<...>;

export const RealityMapManifestSchema: z.ZodObject<...>;
export const CommonsRegistryManifestSchema: z.ZodObject<...>;
export const LivingSystemsManifestSchema: z.ZodObject<...>;
export const AllocationAccountingManifestSchema: z.ZodObject<...>;
export const FlowsManifestSchema: z.ZodObject<...>;
export const SimulationModelsManifestSchema: z.ZodObject<...>;
export const CareCoordinationManifestSchema: z.ZodObject<...>;
export const LearningAccountabilityManifestSchema: z.ZodObject<...>;
```

Domain validation rules:

- Material objects must expose ecological hooks when they affect land, water, energy, food, waste, infrastructure, living systems, or resource extraction.
- Accounting objects must distinguish identity `Account` from `LedgerAccount`.
- Ledger entries must be append-only by contract and reversible only through reversal entries.
- Mutual credit must remain one accounting method, not the whole coordination ontology.
- Contributions must not validate into portable ranking, social credit, or hidden eligibility score structures.
- Care data must default to restricted visibility and explicit stewardship agreements.
- Scenarios and model outputs must validate as evidence or model artifacts, not decisions.

### 5.4 `@canopy/canopy-ui-contracts`

Owns data contracts for shared UI surfaces without importing React, Next.js, component libraries, or CSS frameworks.

Depends on:

- `@canopy/canopy-kernel-contracts`
- `@canopy/canopy-governance-contracts`
- `@canopy/canopy-domain-contracts`

Public export categories:

- Object page hydration contract.
- Search result contract.
- Navigation/scope switcher contract.
- Attention/notification contract.
- Decision packet view model.
- Civic memory timeline view model.
- Redaction and sealed-detail display policy.
- Display labels for canonical object types and local terms.

Key exports:

```ts
export const ObjectPageHydrationSchema: z.ZodObject<...>;
export const ObjectPageSectionSchema: z.ZodDiscriminatedUnion<...>;
export const ObjectSearchResultSchema: z.ZodObject<...>;
export const ScopeSwitcherOptionSchema: z.ZodObject<...>;
export const AttentionItemSchema: z.ZodObject<...>;
export const DecisionPacketViewSchema: z.ZodObject<...>;
export const CivicMemoryTimelineItemSchema: z.ZodObject<...>;
export const RedactionDisplayPolicySchema: z.ZodObject<...>;
export const CanonicalDisplayLabelSchema: z.ZodObject<...>;
```

UI contract rules:

- UI contracts are view-model contracts only.
- They must not declare domain authority.
- Redacted or sealed objects must render continuity without leaking protected payloads.
- Display labels may preserve local language, but must include canonical mappings where applicable.
- Object pages must be able to show identity, scope, stewardship, authority, claims/evidence, relationships, governance hooks, data stewardship, civic memory, outcomes, indicators, and federation metadata when available.

### 5.5 `@canopy/canopy-adapter-contracts`

Owns provider-neutral adapter interfaces and conformance schemas.

Depends on:

- `@canopy/canopy-kernel-contracts`
- `@canopy/canopy-governance-contracts`
- `@canopy/canopy-domain-contracts`

May not depend on:

- Prisma
- Drizzle
- Clerk
- NextAuth
- Magic Link SDKs
- Next.js
- Node-only APIs unless clearly isolated in adapter implementation packages
- Queue, cache, object storage, vector, geospatial, or time-series provider SDKs

Public export categories:

- Auth adapter contract.
- ORM/persistence adapter contract.
- Event store adapter contract.
- Object graph adapter contract.
- Document store adapter contract.
- Geospatial adapter contract.
- Time-series adapter contract.
- Vector adapter contract.
- Object storage adapter contract.
- Federation transport adapter contract.
- Legacy project adapter contract.
- Adapter conformance test helpers.

Key exports:

```ts
export const AuthIdentityProjectionSchema: z.ZodObject<...>;
export const AuthAdapterContractSchema: z.ZodObject<...>;
export type CanopyAuthAdapter = {
  resolveAccount(input: unknown): Promise<Account>;
  resolvePerson(account: Account): Promise<Person>;
  linkAccount(input: unknown): Promise<Account>;
};

export type CanopyPersistenceAdapter = {
  getObject(ref: ObjectRef): Promise<unknown>;
  putProjection(ref: ObjectRef, value: unknown): Promise<void>;
  appendEvent(event: CanopyEvent): Promise<void>;
};

export type CanopyEventStoreAdapter = {
  append(event: CanopyEvent): Promise<AppendEventResult>;
  readByObject(ref: ObjectRef, options?: EventReadOptions): Promise<CanopyEvent[]>;
  readByScope(scopeRef: ObjectRef, options?: EventReadOptions): Promise<CanopyEvent[]>;
};

export type CanopyFederationTransportAdapter = {
  exportEnvelope(input: ExportRequest): Promise<CanopyExportEnvelope>;
  importEnvelope(input: ImportRequest): Promise<ImportResult>;
  reconcile(input: ReconciliationRequest): Promise<ReconciliationResult>;
};

export type LegacyProjectAdapter = {
  sourceProject: "common_credit" | "icos" | "sensemaking" | "stewardship" | "other";
  projectVersion?: string;
  mapObject(input: unknown): Promise<ObjectRef>;
  mapEvent(input: unknown): Promise<CanopyEvent>;
  mapManifest(): CapabilityManifest;
};
```

Adapter rules:

- Provider-specific packages may implement these interfaces later, for example `@canopy/prisma-adapter`, `@canopy/drizzle-adapter`, `@canopy/clerk-auth-adapter`, or `@canopy/nextauth-adapter`.
- Provider-specific adapter implementation packages depend on `@canopy/canopy-adapter-contracts`; contract packages never depend on provider packages.
- Adapters may translate provider IDs into canonical IDs, but provider IDs must not become Canopy ontology.
- Adapters must preserve canonical `ObjectRef`, `CanopyEvent`, data stewardship metadata, and schema versions at boundaries.

### 5.6 `@canopy/canopy-contract-tests`

Owns shared fixtures, golden samples, conformance helpers, and test vectors.

Depends on:

- All contract packages.

Public export categories:

- Golden object refs.
- Golden identity and membership fixtures.
- Golden authority fixtures.
- Golden event fixtures for the first stable event set.
- Golden export envelope fixtures.
- Capability manifest examples.
- Adapter conformance runner.
- Schema compatibility runner.
- Migration compatibility fixtures from CommonCredit, ICOS, Sensemaking, and Stewardship.

## 6. Dependency Direction

Allowed dependency graph:

```text
canopy-kernel-contracts
  ^
  |
canopy-governance-contracts
  ^
  |
canopy-domain-contracts
  ^
  |
canopy-ui-contracts

canopy-kernel-contracts
  ^
  |
canopy-adapter-contracts

all contract packages
  ^
  |
canopy-contract-tests
```

More precisely:

- `canopy-kernel-contracts` depends only on `zod` and TypeScript/dev tooling.
- `canopy-governance-contracts` may import kernel contracts.
- `canopy-domain-contracts` may import kernel contracts and selected governance contracts.
- `canopy-ui-contracts` may import kernel, governance, and domain contracts.
- `canopy-adapter-contracts` may import kernel, governance, and domain contracts.
- `canopy-contract-tests` may import all contract packages.

Forbidden dependency directions:

- Kernel importing governance, domain, UI, or adapter contracts.
- Governance importing domain or UI contracts.
- Domain importing UI or adapter contracts.
- Any contract package importing app code.
- Any contract package importing provider SDKs.
- Any contract package importing Prisma or Drizzle.
- Any contract package importing Clerk, NextAuth, or other auth provider SDKs.

## 7. Implementation-Neutral Contract Rules

### 7.1 ORM Neutrality

Contracts must not contain:

- Prisma model names.
- Drizzle table builders.
- Database column annotations.
- SQL-specific defaults.
- Foreign key assumptions that only one store can satisfy.

Contracts may contain:

- Canonical IDs.
- Object references.
- ISO timestamp strings.
- Schema versions.
- Discriminated unions.
- Value object schemas.
- Adapter method signatures.
- Append-only and reversibility rules.

Implementation packages may later map contracts to:

- Prisma.
- Drizzle.
- SQL tables.
- Graph stores.
- Event stores.
- Document stores.
- Geospatial stores.
- Time-series stores.

### 7.2 Auth Provider Neutrality

Contracts must not treat Clerk, NextAuth, magic links, DIDs, or custom sessions as authority.

Rules:

- `Person` is the human participant.
- `Account` is an authentication-facing handle.
- `Membership` is a person's relationship to an organization.
- `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`, `Policy`, and `Agreement` carry authority.
- Auth providers may be values in `Account.provider`, but provider SDK shapes stay in adapter implementations.

### 7.3 Framework Neutrality

Contracts must not depend on:

- Next.js server actions.
- React.
- Edge/runtime-specific APIs.
- Queue implementations.
- Cache implementations.
- Fetch wrappers.

Contracts may define serializable request and result shapes that any runtime can use.

### 7.4 Storage Neutrality

Contracts must support the reference architecture's polyglot storage model:

- Graph store for object refs, relationships, scope graph, taxonomy mappings.
- Relational store for workflows, ledger rows, policies, decisions, assignments.
- Event store for civic memory.
- Geospatial store for places, boundaries, watersheds, habitats.
- Time-series store for indicators, sensor readings, and flow measurements.
- Document store for evidence, sources, charters, and decision packets.
- Vector index for retrieval.
- Object storage for files, exports, and bundles.

No contract may assume one physical store owns all data.

## 8. Schema Authoring Rules

1. Every public object shape must export both `FooSchema` and `Foo`.
2. `Foo` must be inferred from `FooSchema`; do not hand-write duplicate interfaces.
3. All externally serialized timestamps use ISO 8601 strings.
4. All public schemas include `schemaVersion` when the object participates in federation, replay, import/export, or durable storage.
5. Discriminated unions are preferred for variants.
6. Free-form `Record<string, unknown>` is allowed only for payload extension points with explicit stewardship and version rules.
7. Local vocabulary must be represented through local taxonomy contracts and canonical mappings.
8. Deprecated fields must remain parseable for at least one major version when used in exported or federated data.
9. Validation helpers should return structured error objects, not only strings.
10. Schemas should expose strict parsing for writes and tolerant parsing for imports where migration is expected.

Recommended export pattern:

```ts
export const FooSchema = z.object({
  id: CanopyIdSchema,
  objectRef: ObjectRefSchema,
  schemaVersion: SchemaVersionSchema,
}).strict();

export type Foo = z.infer<typeof FooSchema>;

export const parseFoo = (input: unknown): Foo => FooSchema.parse(input);
export const safeParseFoo = (input: unknown) => FooSchema.safeParse(input);
```

## 9. Event Contract Strategy

The first implementation should encode the event envelope in kernel and event-specific payload schemas in the most relevant package.

Kernel owns:

- `CanopyEventSchema`
- `CanopyEventTypeSchema`
- Namespace validation
- Shared event envelope validation
- Civic memory rules
- First stable event type constants

Domain or governance packages own:

- Payload schemas for their event families.
- Event factory validation helpers.
- Manifest event declarations.

First stable event set to implement:

1. `identity.organization.created`
2. `identity.membership.activated`
3. `authority.delegation.granted`
4. `authority.delegation.revoked`
5. `object.created`
6. `claim.created`
7. `claim.reviewed`
8. `evidence.source.ingested`
9. `evidence.linked_to_claim`
10. `governance.issue.created`
11. `governance.perspective.submitted`
12. `governance.proposal.created`
13. `governance.decision.recorded`
14. `governance.policy.versioned`
15. `stewardship.resource.created`
16. `stewardship.resource.condition_updated`
17. `stewardship.use_right.granted`
18. `coordination.need.created`
19. `coordination.offer.created`
20. `coordination.commitment.created`
21. `allocation.created`
22. `flow.recorded`
23. `ecology.indicator.recorded`
24. `ecology.threshold.breached`
25. `federation.export.created`

Event validation rules:

- Event type must be namespaced.
- Event must reference a canonical object.
- Event must include actor or system actor.
- Event must include authority references when rights, obligations, governance state, resource state, ecological state, data visibility, federation state, or accounting state changes.
- Event must declare source capability.
- Event must carry data visibility.
- Event must carry schema version.
- Corrections and redactions must be new events.
- Private or sealed events may emit redacted stubs.
- AI may emit interpretation events, not binding decision events.

## 10. Capability Manifest Strategy

The manifest base belongs in kernel. Concrete module manifests belong in domain or governance packages.

Base manifest fields:

```ts
capability: CanopyCapability;
purpose: string;
historicalSources: string[];
cyberneticPhases: CyberneticPhase[];
ownedObjectTypes: CanopyObjectType[];
consumedObjectTypes: CanopyObjectType[];
emittedEventTypes: string[];
governanceHooks: string[];
ecologicalHooks: string[];
dataStewardshipRequirements: string[];
mustNotDo: string[];
exportSupport: boolean;
schemaVersion: number;
```

Manifest validation rules:

- A capability must participate in at least one cybernetic phase.
- A capability that makes consequential changes must emit canonical events.
- A material capability must expose ecological hooks.
- A capability that changes rights, obligations, data visibility, federation, allocation, policy, or threshold state must expose governance hooks.
- A capability must declare owned and consumed canonical object types.
- A capability must declare data stewardship requirements.
- A capability must list prohibited behaviors from the relevant module manifest.

## 11. Versioning Rules

There are two version dimensions:

- Package SemVer in `package.json`.
- Schema version in serialized contracts.

### 11.1 Package SemVer

Patch release:

- Documentation improvements.
- Internal test changes.
- Validation error wording improvements that preserve error codes.
- Non-breaking helper additions.

Minor release:

- New optional fields.
- New schemas.
- New enum values that tolerant consumers can ignore.
- New event payload schemas.
- New helper functions.

Major release:

- Required field added to an existing exported schema.
- Field removed or renamed.
- Enum value removed or meaningfully redefined.
- Event envelope changed incompatibly.
- Authority, stewardship, federation, or export semantics changed incompatibly.
- Existing data can no longer parse without migration.

### 11.2 Schema Version

Schema version applies to durable serialized data:

- `ObjectRef.schemaVersion`
- `CanopyEvent.schemaVersion`
- export envelopes
- federation envelopes
- decision packets
- capability manifests
- domain objects that can be exported or replayed

Rules:

- Schema versions are positive integers.
- Initial implementation starts at `1`, even if architecture docs are draft `0.1`.
- A schema version bump requires a migration note.
- Federated imports must preserve original schema version and record any migration.
- Event replay must be able to route old schema versions through migration helpers.
- Export/fork tests must include at least one previous schema version after the first breaking change.

### 11.3 Deprecation

Deprecation requires:

- `deprecatedSince` in schema documentation or metadata.
- Replacement field or migration path.
- Contract test proving old data still parses when import compatibility is promised.
- Removal only in a major release.

## 12. Validation Strategy

### 12.1 Unit Schema Tests

Each package must test:

- Valid minimal object.
- Valid full object.
- Invalid missing required fields.
- Invalid enum values.
- Invalid cross-field combinations.
- Strict write parsing.
- Tolerant import parsing where applicable.

### 12.2 Invariant Tests

Shared invariants to test in contract packages:

- No account carries direct authority.
- Delegations are revocable.
- Decision events that bind rights or obligations include authority refs.
- Ledger entries are append-only and reversals reference original entries.
- Data stewardship agreements travel with export envelopes.
- Redacted events retain object, event, scope, schema version, and stewardship continuity.
- AI/model outputs cannot validate as decisions.
- Contributions cannot validate into generalized social scores.
- Material flows and allocations can expose ecological hooks.

### 12.3 Golden Fixtures

`canopy-contract-tests` should include:

- Golden organization creation event.
- Golden membership activation event.
- Golden delegation grant/revocation pair.
- Golden issue to proposal to decision packet.
- Golden policy version.
- Golden resource condition update with claim/evidence.
- Golden use-right grant.
- Golden need, offer, commitment, allocation sequence.
- Golden flow record linked to resource and living system.
- Golden ecological threshold breach.
- Golden export envelope with data stewardship agreements.
- Golden redacted care event stub.

### 12.4 Adapter Conformance Tests

Every future provider adapter should pass tests proving:

- It can resolve provider identity into `Account`, `Person`, and `Membership` without provider shapes leaking into kernel contracts.
- It can persist and retrieve canonical object refs.
- It appends civic memory events without update/delete behavior.
- It preserves schema versions.
- It preserves data stewardship metadata.
- It maps provider/database errors into contract error shapes.
- It can export a valid `CanopyExportEnvelope`.

### 12.5 Architecture Compliance Tests

Add static checks:

- No forbidden dependencies in contract packages.
- No imports from app folders.
- No imports from Prisma, Drizzle, Clerk, NextAuth, React, or Next.js in contract packages.
- No package dependency cycle.
- Public exports are declared from each package `src/index.ts`.
- Every exported schema has a matching inferred type.

## 13. First Implementation Backlog

### Phase 1: Package Scaffolding

1. Create the six package folders listed in this spec.
2. Add package metadata, TypeScript config, lint/test config, and build scripts.
3. Add dependency boundary checks.
4. Add `zod` as the only runtime dependency for core contract packages.
5. Add root barrel exports for empty initial modules.

Definition of done:

- Packages build.
- Empty tests run.
- Dependency boundary checks fail on forbidden provider imports.

### Phase 2: Kernel Contract MVP

1. Implement IDs, schema version helpers, and shared validation errors.
2. Implement `CanopyObjectType`, `CanopyCapability`, and `ObjectRef`.
3. Implement identity schemas: `Person`, `Account`, `Organization`, `Membership`.
4. Implement authority schemas: `Role`, `RoleAssignment`, `Mandate`, `Delegation`, `Guardian`.
5. Implement permissions: `PermissionAtom`, `AccessRule`, permission check request/result.
6. Implement data stewardship: visibility, data state, stewardship agreement, retention/export/federation rule stubs.
7. Implement claims/evidence: `Claim`, `Counterclaim`, `Source`, `Evidence`, `EvidenceLink`.
8. Implement event envelope and first stable event constants.
9. Implement export envelope and federation rule.
10. Add invariant tests for authority, delegation, event envelope, and export metadata.

Definition of done:

- Kernel package exports usable Zod schemas and inferred types.
- Golden kernel fixtures parse.
- Kernel invariants are tested.

### Phase 3: Governance Contracts

1. Implement `Issue`, `Perspective`, `Proposal`, `Decision`, `DecisionPacket`.
2. Implement `Agreement`, `Policy`, `PolicyVersion`.
3. Implement `Appeal`, `Conflict`, vote/consent/quorum artifacts.
4. Implement governance profile and decision method config.
5. Implement governance event payload schemas for the first stable event set.
6. Add tests for decision authority and policy version traceability.

Definition of done:

- Issue-to-decision-packet fixture validates.
- Policy version fixture validates.
- Votes fail validation when used as decisions.

### Phase 4: Domain Contracts

1. Implement reality map and object relationship contracts.
2. Implement commons/resource/use-right/routine/task/contribution contracts.
3. Implement living system, indicator, threshold, and guardian review contracts.
4. Implement coordination and allocation contracts.
5. Implement ledger account and ledger entry contracts with reversal semantics.
6. Implement flow and stock contracts.
7. Implement model, assumption, scenario, model output, and audit contracts.
8. Implement care coordination contracts with restricted defaults.
9. Implement domain capability manifests.
10. Add tests for ecological hooks, accounting anti-score rules, and care privacy defaults.

Definition of done:

- Domain golden fixtures validate.
- Material domain objects expose ecological hooks where required.
- Ledger/accounting schemas distinguish identity account from ledger account.

### Phase 5: Adapter Contracts

1. Define auth adapter interfaces.
2. Define persistence/object graph/event store adapter interfaces.
3. Define document/geospatial/time-series/vector/object storage adapter interfaces.
4. Define federation transport adapter interfaces.
5. Define legacy project adapter interfaces.
6. Add provider-neutrality tests.

Definition of done:

- Adapter contracts compile without provider SDK imports.
- Conformance test harness can be used by future Prisma, Drizzle, Clerk, NextAuth, and legacy adapters.

### Phase 6: UI Contracts

1. Define object page hydration contract.
2. Define object page section contracts.
3. Define search result and navigation/scope switcher contracts.
4. Define attention item contract.
5. Define decision packet and civic memory timeline view contracts.
6. Define redaction display policy.

Definition of done:

- Object page fixtures can render a Resource, Claim, Decision, and Flow using contract data only.
- Redacted event stubs preserve continuity without payload leakage.

### Phase 7: Contract Test Fixtures

1. Add golden fixtures for the first stable event set.
2. Add export/federation fixture.
3. Add migration-shaped fixtures from CommonCredit, ICOS, Sensemaking, and Stewardship.
4. Add adapter conformance helpers.
5. Add architecture compliance checks.

Definition of done:

- All contract packages consume shared fixtures.
- Legacy-shaped examples can map into canonical refs/events.

## 14. Open Decisions Before Coding

1. Package manager and workspace tool: pnpm, npm workspaces, yarn, or existing repo standard.
2. Build target: ESM-only or dual ESM/CJS.
3. Minimum TypeScript version.
4. Whether schemas should expose JSON Schema generation in v1.
5. Whether branded IDs should be purely type-level or runtime-prefixed.
6. Whether event payload registry should be centralized in kernel or composed from package registries.
7. Exact naming convention for package scopes: `@canopy/...` versus unscoped package names.
8. Import compatibility policy before the first major release.

## 15. Acceptance Criteria For The Contract Package Work

The first implementation is complete when:

- All packages build independently.
- Kernel schemas are provider-neutral and storage-neutral.
- Governance and domain schemas depend inward on kernel.
- Adapter contracts define implementation seams without provider imports.
- The first stable event set has envelope validation and payload validation.
- Capability manifests validate against the module manifest rules.
- Golden fixtures cover identity, authority, claims/evidence, governance, resources, allocation, flows, ecology, federation, and redaction.
- Dependency checks prevent Prisma, Drizzle, Clerk, NextAuth, React, Next.js, and app code imports in contract packages.
- Export/fork fixtures preserve schema versions and data stewardship agreements.
- The package boundary makes the next step obvious: implement packages first, then provider adapters and module services.

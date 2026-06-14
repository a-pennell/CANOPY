# Canopy database migration homes

This package is the canonical home for database migration artifacts in the Canopy cybernetic commons ecosystem.

The artifacts here are provider-neutral migration intent. They name the storage responsibilities that every database adapter must satisfy, describe provider-track readiness, and keep ORM/provider SDK coupling out of this package.

## Canonical homes

- `sql/` contains portable DDL intent and invariants.
- `prisma/` contains Prisma-shaped placeholders for projects that later choose Prisma.
- `drizzle/` contains Drizzle-shaped placeholders for projects that later choose Drizzle.
- `src/index.ts` exposes a small manifest and health report helper that tools can inspect without importing any ORM.
- `tests/` verifies the manifest continues to cover the expected homes, provider tracks, append-only invariants, and SDK-coupling boundaries.

## Required migration subjects

Every provider track must account for these homes:

- Object refs: durable references for every civic object, source object, projection, event, and adapter artifact.
- Canonical mappings: stable mappings from local or external identifiers to canonical Canopy object refs.
- Events: append-only domain event records with causal metadata and schema versioning.
- Outbox: pending integration messages derived from committed events.
- Projection state: replay cursors, projector checkpoints, and rebuild metadata.
- Adapter audit: adapter reads, writes, transforms, and external synchronization evidence.
- Append-only enforcement: constraints, triggers, policies, or operational controls that prevent mutation of historical facts.

## Provider-neutral rules

- Migration artifacts must describe intent before provider mechanics.
- Provider-specific migrations should live below the matching provider track once a provider is selected.
- Generated migrations should preserve append-only semantics for events, adapter audit rows, and outbox history.
- Destructive rewrites, in-place event edits, and silent remaps are outside the Canopy storage contract.
- Real ORM imports do not belong in this package until a provider-specific implementation package is introduced.

## Provider track readiness

The migration manifest currently declares these provider tracks:

- `postgres`: ready for prototype canonical runtime tables, indexes, constraints, and append-only trigger templates.
- `postgis`: ready for prototype geospatial extension tables in a provider package, keyed by canonical object refs.
- `pgvector`: ready for prototype semantic index tables in a provider package, keyed by canonical object refs and projection names.
- `s3-compatible`: external-provider intent for bucket/key/version mappings, content hashes, retention state, and adapter audit evidence.

The SQL artifact includes provider-track intent, not a directly runnable production migration. Provider packages should translate this intent into executable migrations and then pass adapter conformance and migration health checks.

## Health checks

`createMigrationHealthReport()` checks:

- every canonical migration home is present;
- every required provider track is declared;
- every append-only subject has an append-only policy;
- provider SDKs such as `pg`, `drizzle-orm`, `@prisma/client`, and `@aws-sdk/client-s3` are absent from this package.

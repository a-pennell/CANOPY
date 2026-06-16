# Phase 10: Ecosystem Hardening

Phase 10 turns the native Canopy contracts into deployment-ready operating posture without folding real provider SDKs into kernel, contract, migration, or evaluation packages.

## Ecosystem Hardening Report

`@canopy/evaluation-ecosystem-hardening` now exposes `buildCanopyEcosystemHardeningReport()`.

The report is the umbrella Phase 10 decision artifact. It combines:

- adapter provider catalog state;
- provider deployment readiness;
- migration manifest health and migration readiness evidence;
- runtime operations readiness;
- required verification commands;
- privacy and redaction-sensitive gates;
- adapter audit continuity.

The report is intentionally allowed to say `blocked`. Phase 10 should expose incomplete production posture clearly instead of treating prototypes as production readiness.

## Readiness Sidecar

`@canopy/evaluation-adapter-conformance` now exposes `createPhase10ProviderDeploymentReadinessReport()`.

The report is machine-readable evidence for:

- candidate provider targets and legacy fold-in source targets;
- required production gate evidence from `requiredBeforeProductionUse`;
- deployment environment bindings for auth, Postgres, PostGIS, TimescaleDB, pgvector, S3-compatible storage, ActivityPub federation, and legacy imports;
- provider migration track readiness supplied by the migration package;
- release blockers and next actions.

The current default report is expected to be `blocked`: provider targets are still planned or prototype, production gate evidence has not been attached, deployment environment bindings are not supplied, and migration readiness must be provided by the deployment pipeline.

## Migration Evidence

`@canopy/database-migrations` now exposes `createProviderMigrationReadinessEvidence()`.

The evidence names:

- provider migration tracks;
- canonical readiness tables;
- missing tables;
- manifest issue codes.

The migration manifest now includes a `timescaledb` provider track so every Phase 10 deployment requirement has an explicit storage-readiness anchor.

## Phase 10 Gates

Before deployment can be considered ready:

- provider targets must be promoted only after executable provider packages pass conformance;
- every `requiredBeforeProductionUse` gate must have attached evidence;
- deployment environment bindings must be declared outside source code;
- canonical migration readiness must report no missing tables or manifest issues;
- operations readiness must observe replay freshness, projection lag, outbox backlog, adapter audit health, and federation health;
- `npm run check`, `npm run check:db`, and `npm --workspace @canopy/web run check` must be attached as fresh verification evidence;
- provider SDKs must remain outside provider-neutral packages.

## Next Work

- Feed real CI/deployment environment manifests into the readiness report.
- Attach conformance artifacts as satisfied production gate evidence.
- Bind the report into operations release checks.
- Add provider package migration runners for Postgres extension tracks.
- Promote planned Postgres persistence and event-store targets once executable providers pass conformance and migration evidence.

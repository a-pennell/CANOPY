# First Build Epoch

## Purpose

Turn the Canopy blueprint into a working monorepo contract spine. This epoch
does not build a product shell yet. It establishes the provider-neutral grammar
that every service, adapter, projection, workflow, and UI surface must consume.

## Scope

- Monorepo workspace files.
- Contract package scaffold.
- Dependency boundary checks.
- Kernel primitives.
- Identity, authority, permission, data stewardship, event, federation,
  claims/evidence, governance, ecology, coordination, taxonomy, fixture, and
  invariant contract surfaces.

## Out Of Scope

- Runtime service implementation.
- Database migrations.
- Legacy project imports.
- Visual shell implementation.
- Provider selection.

## Checkpoint

This epoch is ready for the next band when:

- `npm run check` passes.
- Contract package indexes expose canonical surfaces.
- Contracts do not import apps, providers, ORMs, UI frameworks, queues,
  storage systems, or legacy project code.
- Golden fixtures and invariant cases describe the first replayable contract
  test set.

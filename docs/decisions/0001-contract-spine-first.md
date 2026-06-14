# 0001: Build The Contract Spine First

## Status

Accepted

## Decision

The first build epoch starts with provider-neutral TypeScript contract packages,
dependency guardrails, fixtures, and invariant tests before shell or legacy
adapter implementation.

## Rationale

Canopy must stay one cybernetic ecosystem. Shared contracts for identity,
authority, object references, events, stewardship, claims, governance, ecology,
allocation, and federation prevent the folded source projects from reappearing
as separate applications.

## Consequences

- Contract packages must not import app, UI framework, ORM, provider, queue,
  storage, or legacy adapter code.
- Legacy project references belong in adapters, fixtures, mappings, and source
  pointers, not in canonical domain meaning.
- UI and service packages consume contracts; they do not redefine them.

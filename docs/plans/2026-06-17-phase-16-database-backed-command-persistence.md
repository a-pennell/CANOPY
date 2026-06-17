# Implementation Plan: Phase 16 Database-Backed Command Persistence

## Overview

Phase 16 introduces the persistence boundary needed before connecting citizen commands to a real database. This phase does not add a live Postgres adapter yet; it defines the canonical storage shape and a persistent provider backed by a repository abstraction.

Source artifacts:

- `docs/plans/2026-06-17-phase-14-15-command-persistence-and-creation.md`
- `apps/canopy-web/src/lib/citizen-command-provider.ts`

## Outcomes

- Canonical command storage record shape.
- Repository interface for command persistence.
- In-memory repository implementation for deterministic tests.
- Persistent citizen command provider behind the existing provider interface.
- Conformance coverage across in-memory and persistent providers.
- Rehydration from canonical storage records.

## Storage Shape

Each stored command record contains:

- `commandId`
- `commandType`
- `status`
- `createdAt`
- `updatedAt`
- `payload`
- `statusHistory`

The payload contains the citizen-facing command fields:

- label
- context label
- review owner
- submitting role
- visibility
- civic memory effect
- review action label
- due timing

## Tasks

### Batch 1: Storage Contract

- [x] Add `CitizenCommandStorageRecord`.
- [x] Add `CitizenCommandStoragePayload`.
- [x] Add status history entries.
- [x] Add repository interface.

### Batch 2: Persistent Provider

- [x] Add memory-backed repository.
- [x] Add persistent command provider.
- [x] Map command draft inputs into canonical storage records.
- [x] Map canonical storage records back into citizen command records.

### Batch 3: Status Transitions

- [x] Persist save draft transition.
- [x] Persist submit command transition.
- [x] Persist cancel command transition.
- [x] Persist move-to-review transition.
- [x] Preserve updated timestamp and status history.

### Batch 4: Verification

- [x] Run provider conformance tests.
- [x] Run focused citizen command tests.
- [x] Run `npm --workspace @canopy/web run check`.
- [x] Run `npm run check`.

## Remaining Product Work After This Slice

- Add database-backed repository implementation.
- Add migrations for command storage.
- Connect command storage to command runtime/audit events.
- Replace query-param command creation with real client-side form submissions.

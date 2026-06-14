# SQL migration placeholders

This directory is the canonical SQL-shaped migration home.

The files here describe portable DDL intent for:

- Object refs
- Canonical mappings
- Events
- Outbox
- Projection state
- Adapter audit
- Append-only enforcement

SQL here should stay provider-neutral until a provider track is selected. Use generic table, column, key, and invariant names. Provider-specific triggers, extensions, partitioning, JSON types, generated columns, and lock behavior should be added in a later provider-specific subdirectory or implementation package.

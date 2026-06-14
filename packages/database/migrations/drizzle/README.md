# Drizzle migration placeholders

This directory is the canonical Drizzle-shaped migration home.

The placeholder module records table and invariant names without importing Drizzle or choosing a SQL dialect. A future provider implementation can translate these descriptors into `pgTable`, `sqliteTable`, `mysqlTable`, or another Drizzle dialect once a database has been selected.

Keep this directory provider-neutral until then.

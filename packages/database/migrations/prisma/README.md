# Prisma migration placeholders

This directory is the canonical Prisma-shaped migration home.

The placeholder schema names the same storage responsibilities as the SQL track while deferring:

- Datasource provider
- Generator output
- Native column types
- Relation strategy
- Migration runner
- Runtime client usage

Do not import Prisma from this package. A future provider implementation can copy these model names and invariants into a real Prisma package when Canopy chooses that path.

# Implementation Plan: Phase 21 Public Record Search

## Overview

Phase 21 turns `/citizen/search` into a public record search and detail surface. Public observers can filter records by query and visibility while keeping selected record details and redaction explanations visible.

## Outcomes

- `/citizen/search` renders public record search instead of a generic task surface.
- Query text filters labels and summaries.
- Visibility filter supports `all`, `public`, `public-summary`, and `redacted`.
- Filtered results and selected detail are both available in the model.
- Search result detail preserves redaction explanations.

## Verification

- [x] Add Phase 21 public record search acceptance test.
- [x] Run focused Phase 21 test.
- [x] Run combined Phase 21-24 tests.
- [x] Run full web and workspace checks.
- [x] Browser verify filtered search route.

# ADR-004: Store unlimited video replies as adjacency lists with root-thread pagination

## Status

Accepted

## Date

2026-11-17

## Context

Video comments need replies to replies without an artificial product limit. Recursively loading a deep tree is expensive, produces unstable mobile layouts, and makes cursor pagination difficult. TikTok-style interfaces keep the visual hierarchy compact even when a reply targets another reply.

## Decision

Each comment stores an optional `parent_id` and `root_id`. Top-level comments have both fields null. A reply stores the exact target in `parent_id` and the top-level ancestor in `root_id`. The API pages top-level comments separately and pages all descendants of one root chronologically. The mobile UI displays those descendants as a compact thread and identifies the replied-to user instead of increasing indentation at every depth.

Comments with descendants are soft-deleted so the thread remains connected. Like and reply counts are denormalized and maintained transactionally.

## Alternatives Considered

### Fixed two-level replies

- Simpler queries and UI.
- Rejected because it does not meet the requirement for unlimited replies.

### Recursive nested JSON trees

- Mirrors the logical tree exactly.
- Rejected because one response can become unbounded and deep indentation is poor mobile UX.

### Materialized path

- Efficient subtree reads.
- Rejected for the initial implementation because path updates and MySQL collation/length constraints add complexity without improving the flattened TikTok-style UI.

## Consequences

- The exact reply relationship is preserved at every depth.
- Thread loading remains bounded and cursor-pageable.
- The UI intentionally flattens descendants under their root comment.
- Counter updates and soft deletion require transactions.

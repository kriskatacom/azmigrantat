# Implementation Plan: TikTok-style video comments

## Overview

Build a safe comments system with an adjacency-list data model, flattened thread loading, cursor pagination, and a reusable mobile bottom sheet connected to all full-screen video surfaces.

## Architecture Decisions

- Preserve every reply's `parent_id`, while `root_id` makes an arbitrarily deep thread pageable without recursive database queries.
- Show descendants flattened beneath the root and label the replied-to user, matching TikTok's compact interaction model.
- Soft-delete comment text so descendants and counters remain consistent.
- Denormalize reply and like counts and update them transactionally.
- Keep the comments sheet independent from the player so opening it pauses neither upload nor server-side processing.

## Task List

### Phase 1: Persistence and API
- [x] Add comment/like schema and models.
- [x] Add paginated list, create/reply, delete, like, and replies endpoints.
- [x] Extend moderation reports to comments.

### Checkpoint: Backend
- [x] PHP syntax and migration structure are valid.
- [x] Authorization and cross-video parent checks are fail-closed.

### Phase 2: Mobile vertical slice
- [x] Add typed comments API client and contract types.
- [x] Build reusable comments sheet, rows, composer, replies expansion, and actions.
- [x] Add comment entry/count to home and full-screen video surfaces.

### Checkpoint: Mobile
- [x] TypeScript and focused lint pass.
- [x] Android production bundle exports successfully.

### Phase 3: Deployment readiness
- [x] Document migration/rollback and production file manifest.
- [x] Deploy verified additive backend release with rollback copy before mobile publication.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Unbounded recursive loading | High | Root-thread cursor pagination; never recursively hydrate all descendants |
| Orphaned or cross-video replies | High | FK plus transactional parent/video validation |
| Counter drift | Medium | Atomic increments/decrements and idempotent unique likes |
| Deleted parent hides descendants | High | Soft-delete body/status, retain tree row |
| Video gestures conflict with sheet | Medium | Modal owns touches; player list remains unchanged underneath |

## Open Questions

- Reply/like push notifications remain outside the initial production scope.

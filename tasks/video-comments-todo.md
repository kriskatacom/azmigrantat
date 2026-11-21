# Video comments tasks

## Task 1: Persist unlimited comment threads

- [x] Add `video_comments` and `video_comment_likes` migration.
- [x] Add Eloquent models and video relationships.
- Acceptance: parent/root relationships are constrained; likes are unique; video deletion cascades.
- Verify: PHP syntax and migration dry inspection.

## Task 2: Deliver the comments API

- [x] List top-level comments and root-thread descendants with cursors.
- [x] Create top-level comments and replies transactionally.
- [x] Like, unlike, and soft-delete with authorization.
- Acceptance: all endpoints require bearer auth and reject invalid cross-video parents.
- Verify: PHP syntax and route inspection.

## Task 3: Integrate comment moderation

- [x] Permit `video_comment` reports.
- [x] Resolve the reported account through the comment author.
- Acceptance: own comments cannot be reported and duplicates remain blocked.
- Verify: PHP syntax and validator inspection.

## Checkpoint: Backend

- [x] Schema, model, controller, and routes agree.
- [x] Existing video endpoints remain unchanged.

## Task 4: Add the mobile API contract

- [x] Add comment types and service methods.
- Acceptance: cursors and optimistic like/comment responses are typed.
- Verify: TypeScript.

## Task 5: Build the TikTok-style comments sheet

- [x] Bottom sheet, composer, rows, avatars, timestamps, likes, replies, actions.
- [x] Paginate top-level comments and expanded threads.
- Acceptance: arbitrary reply targets work while descendants display compactly.
- Verify: TypeScript, lint, Android bundle, manual device test.

## Task 6: Connect every video surface

- [x] Home feed comment icon and count.
- [x] Profile/public full-screen pager comment icon and count.
- Acceptance: opening/closing comments does not disturb feed position or playback URL state.
- Verify: Android bundle and manual device test.

## Checkpoint: Complete

- [x] Technical checks pass without automated functional/E2E tests.
- [x] Migration and verified backend release are active in production with rollback retained.

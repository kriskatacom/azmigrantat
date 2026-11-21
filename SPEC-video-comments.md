# Spec: Video comments and unlimited replies

## Objective

Add TikTok-style comments to every ready video. Authenticated users can open a bottom sheet, create a top-level comment, reply to any comment at any logical depth, like comments, delete comments they own, and report comments they do not own. Long threads remain fast through cursor pagination.

Success means the same comments experience is available from the home feed and every full-screen video pager without changing playback, scrubber, zoom, captions, or the standard video-processing services.

## Tech Stack

- Backend: PHP 8, Eloquent/Capsule, Phinx, MySQL
- Mobile: Expo 57, React Native, TypeScript, Expo Router
- Authentication: existing bearer-token middleware
- UI: native React Native modal/sheet; no new dependency

## Commands

- PHP syntax: `php -l <changed-php-file>`
- TypeScript: `cd app/chat-app && npx tsc --noEmit`
- Lint: `cd app/chat-app && npx eslint <changed-files>`
- Android bundle: `cd app/chat-app && npx expo export --platform android --output-dir /tmp/eto-me-video-comments-export`

## Project Structure

- `auth/database/migrations/` — comments and likes schema
- `auth/app/Models/` — comment and like persistence models
- `auth/app/Controllers/Api/` — authenticated comments API
- `auth/routes/web.php` — mobile routes
- `app/chat-app/src/services/` — typed API client
- `app/chat-app/src/types/` — API contract types
- `app/chat-app/src/components/video/` — reusable comments sheet and video entry controls

## Code Style

```ts
const response = await listVideoComments(token, videoId, { limit: 20 });
setThreads(response.data);
setNextBeforeId(response.pagination.next_before_id);
```

- PHP uses strict validation, ownership checks, database transactions, and integer IDs.
- TypeScript uses explicit API types and immutable state updates.
- User-visible copy is Bulgarian.

## Testing Strategy

No automated functional or E2E tests are added. Verification is limited to PHP syntax, migration status, TypeScript, focused lint, Android bundling, read-only API/configuration checks, and the user's manual device testing.

## Boundaries

- Always: require authentication, verify video/parent relationship, paginate lists, soft-delete comments with descendants, sanitize length, and prevent duplicate likes.
- Ask first: global rollout if a separate feature gate becomes necessary, or notification fan-out beyond the comments feature.
- Never: load an entire unbounded thread, hard-delete a parent that still has replies, expose private account data, or change video-processing services.

## API Contract

- `GET /api/mobile/videos/{videoId}/comments?limit=&before_id=` — newest top-level comments.
- `POST /api/mobile/videos/{videoId}/comments` — create comment; optional `parent_id` creates a reply.
- `GET /api/mobile/video-comments/{commentId}/replies?limit=&after_id=` — flattened descendants of the root thread in chronological order.
- `POST /api/mobile/video-comments/{commentId}/like` — idempotently like.
- `DELETE /api/mobile/video-comments/{commentId}/like` — idempotently unlike.
- `DELETE /api/mobile/video-comments/{commentId}` — soft-delete when replies exist; only author or video owner.
- Existing reports API accepts `target_type=video_comment`.

## Success Criteria

- A comment icon and accurate count appear on video overlays.
- The comments sheet opens without leaving or restarting the video.
- Users can create, reply, like/unlike, delete, report, paginate, and open an author's profile.
- Replies may target any existing comment; the backend stores parent and root IDs without a depth cap.
- Descendants remain visible after a parent is deleted, with a deleted placeholder.
- Comment APIs cannot cross video/thread boundaries.
- Existing video playback, feed pagination, gestures, captions, and processing remain unchanged.

## Open Questions

- Push notifications for replies and likes are intentionally deferred until the core comments flow is manually approved.


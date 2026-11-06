# Dedicated video upload service

Local-only upload and processing service skeleton for the OneProvider video
host. It does not deploy, modify the PHP database, or expose private files.

## TUS-compatible endpoints

- `GET /health` — liveness response.
- `POST /v1/uploads` — create a resumable upload with a short-lived signed
  bearer token, `Upload-Length`, and an allowed video MIME type.
- `HEAD /v1/uploads/{upload_id}` — authenticated offset/length inspection.
- `PATCH /v1/uploads/{upload_id}` — authenticated TUS chunk append requiring
  exact `Upload-Offset` and `application/offset+octet-stream`.
- `POST /v1/uploads/{upload_id}/complete` — authenticated atomic finalize and
  Redis enqueue; completion is rejected before the declared length is received.

The HMAC-SHA256 token binds `upload_id`, `user_id`, `video_id`, expiry, MIME
type, and maximum size. The PHP API will issue these tokens in Task 4; there is
no public token-minting endpoint here.

Temporary state and parts are kept below the configured root. Finalized
originals move atomically to `private/originals/{video_id}/`. The service has
no public file route or directory listing.

```sh
cp .env.example .env
npm install
npm test
npm run build
npm start
# In a separate process, after installing/configuring ffmpeg and ffprobe:
npm run worker
```

The worker uses a durable Redis queue with leases, retry backoff and a
dead-letter list. It selects direct publish, MP4 remux, or H.264/AAC
transcoding from FFprobe output, verifies the result, creates a thumbnail, and
persists callback events until delivery succeeds. `FFMPEG_BIN` and
`FFPROBE_BIN` may point to restricted wrapper binaries; command arguments are
passed without a shell.

## Bunny migration CLI

`npm run migrate:bunny` is dry-run by default. It reads Bunny metadata and PHP
video rows, writes an inventory report, creates a resume state and rollback
mapping, and never writes the PHP database in dry-run mode. A non-dry-run first
creates a protected JSON backup of the selected `videos` rows before downloading
or processing any asset. The CLI is intended to run on the OneProvider host so
downloads go directly into `BUNNY_MIGRATION_DOWNLOAD_ROOT`; it does not stage
video files on the operator's computer.

Use `--execute` only after a non-production endpoint and storage paths are
configured. This downloads and verifies files and runs the existing FFprobe /
FFmpeg processing path, but still does not update PHP. Database writes require
both `--commit` and `--confirm-commit`:

```sh
npm run migrate:bunny -- --video-id 78 --owner-id 1269 --guid <expected-bunny-guid>
npm run migrate:bunny -- --execute --video-id 78 --owner-id 1269 --guid <expected-bunny-guid>
npm run migrate:bunny -- --execute --commit --confirm-commit --video-id 78 --owner-id 1269 --guid <expected-bunny-guid>
# After npm run build, the server can use the compiled CLI:
npm run migrate:bunny:production -- --video-id 78 --owner-id 1269 --guid <expected-bunny-guid>
```

Every run requires the exact PHP video ID, owner ID and Bunny GUID and must
resolve to exactly one row. Execute requires a matching prior dry-run
fingerprint. A process lock serializes state changes; DB commit uses a
transactional row lock and conditional update, changes only the four provider
routing fields, and creates a unique immutable backup before the update.
Rollback is explicit and conditional:

```sh
npm run migrate:bunny:production -- --rollback --confirm-rollback \
  --video-id 78 --owner-id 1269 --guid <expected-bunny-guid>
```

Set `BUNNY_MIGRATION_REQUIRE_HLS=1` for a copy-remux-only migration. In that
mode the master, variant, segment, key and init-map URLs must remain on the
configured HTTPS Bunny CDN host and expected GUID path; transcoding is refused.
The CLI downloads every validated HLS resource into a private temporary bundle,
rewrites the media playlist to `file://` resources, and passes that playlist to
FFmpeg over stdin with only `pipe,file,crypto` protocols enabled. This avoids
depending on FFmpeg's version-specific HTTP redirect options; FFmpeg receives
no Bunny URL and cannot follow network redirects itself.

The tool preserves `bunny_video_guid`, owner/category/title/description/view
counters and an existing `thumbnail_url`, never calls Bunny delete APIs,
validates the processed MP4 with FFprobe, verifies Bunny `originalHash` when
available, requires an HTTPS playback URL with an HTTP Range response before a
commit, and writes atomic backup/state/inventory/rollback artifacts under the
configured state root. `BUNNY_ORIGINAL_URL_TEMPLATE` and
`BUNNY_MP4_URL_TEMPLATE` must be explicitly configured when the Bunny account's
download API does not expose the needed source URL; the CLI does not guess a
private CDN path. When originals and MP4 fallback are unavailable, the CLI can
use a short-lived signed HLS master URL generated from
`BUNNY_STREAM_CDN_HOST_NAME` and `BUNNY_STREAM_TOKEN_SECURITY_KEY` (or an
explicit `BUNNY_HLS_URL_TEMPLATE`), select the highest HLS variant, and remux
it with `-c copy`. Public playback and thumbnail URL templates are also
explicit configuration; a commit is refused if playback does not support HTTPS
Range.

Run the CLI with the same primary group as the video service (currently
`www-data`) so newly renamed MP4 and thumbnail files remain readable by Nginx.
`BUNNY_MIGRATION_EXPECTED_DB_NAME` may pin the database name. A non-default
`BUNNY_MIGRATION_DB_TABLE` is rejected unless
`BUNNY_MIGRATION_ALLOW_TEST_TABLE=1`, and even then only the
`videos_migration_e2e_<tag>` namespace is accepted. Never enable that override
for a production migration.

Use a dedicated non-production root and Redis instance while testing. The
current checkout does not include FFmpeg/FFprobe binaries, so media processing
requires those dependencies in the runtime environment.

# Bunny video 78 migration CLI release plan

## Release boundary

This plan prepares, but does not authorize, production deployment or migration.
The only permitted future target is PHP video `78`, owner `1269`, Bunny library
`753007`, GUID `ba8a28ca-603b-4563-be47-3574a773d91d`. Stop if any selector,
reviewed row fingerprint, or Bunny metadata fingerprint differs.

The release archive and its SHA-256 are recorded in the handoff report. Verify
both the archive and `dist/bunny-migration.js` before extraction. Extract to a
new versioned directory; never overwrite the active release or a prior migration
state, backup, inventory, mapping, or log. Do not restart the running video
service for a CLI-only dry-run.

## Deployment procedure requiring separate approval

1. Re-audit the six production rows and record a full logical snapshot. Confirm
   the other five IDs remain `provider='bunny'` and exclude the orphaned seventh
   Bunny asset.
2. Install the checksum-pinned archive into a new versioned directory. Reuse the
   reviewed dependency lock and run the CLI as the video service user with
   primary group `www-data`.
3. Supply Bunny and DB credentials through a protected mode-`0600` environment
   file or equivalent secret channel. Never place values in argv, shell tracing,
   process output, or deployment logs. Production must use table `videos`; keep
   `BUNNY_MIGRATION_ALLOW_TEST_TABLE` unset.
4. Pin `BUNNY_MIGRATION_EXPECTED_DB_NAME`, use unique state/backup/log paths,
   require HLS, and run the exact dry-run selectors. Review its row and plan
   fingerprints before any execute step.
5. Execute without `--commit`. Verify SHA-256 equality between the copy-remux
   input and published MP4, FFprobe H.264/AAC metadata and duration, JPEG
   thumbnail, file ownership, HTTPS playback, and exact HTTP Range `206`.
6. Recheck that production DB remains unchanged. Only with a new explicit
   approval, execute `--commit --confirm-commit`. The transaction must lock ID
   78, recheck the reviewed row fingerprint, create a unique immutable backup,
   and conditionally update only the provider routing tuple.
7. Verify the production PHP API and owner profile, then stop. Do not process any
   other video.

## Recovery and stop conditions

- A `commit_pending` state must be reconciled against the exact DB routing tuple
  and stored artifact hashes before it can become `committed`.
- A lock is never removed automatically. Validate its exact path and ownership,
  parse its PID/timestamp, prove the PID is dead, then remove only that file.
- Rollback requires the immutable backup checksum and the exact committed
  routing tuple. It restores only `provider`, `provider_video_id`, `storage_path`,
  and `playback_url`; Bunny identifiers and the Bunny asset are retained.
- Stop on redirect, host/GUID escape, checksum mismatch, non-copy processing,
  metadata drift, HTTP verification failure, unexpected DB name/table, existing
  lock, backup collision, or any change to another record.

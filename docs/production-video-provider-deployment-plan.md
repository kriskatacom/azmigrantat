# Production PHP provider-neutral video deployment record

## Current state (2026-10-26)

- `VIDEO_STORAGE_PROVIDER=oneprovider` is active in production for newly created uploads.
- Existing Bunny records continue to route through `BunnyStreamProvider` after the provider-neutral code is deployed.
- The additive provider schema and Dedicated provider configuration are present. The provider is considered configured only when the service/public URLs and all three HMAC/admin secrets are available.
- The six existing production records remain explicitly `provider='bunny'`; no Bunny asset was deleted or migrated during this cutover.
- Development, preview/staging and production mobile build profiles use the OneProvider video service for new uploads.

## Completed activation checks

1. Confirm an authenticated maintenance window and active-query/metadata-lock audit.
2. Create and verify a full `videos` backup containing `CREATE TABLE` plus data; retain the existing six-row data backup separately.
3. Verify the release manifest and SHA-256 for all PHP files, migration, tests, and unchanged Composer lockfile.
4. Configure the Dedicated service/public URLs and matching protected secrets without logging their values.
5. Run PHP syntax checks and the staging provider, migration, Bunny, and routing tests.

## Completed deployment order

1. Deploy provider-neutral PHP files and dependencies only; do not run Phinx.
2. Verify PHP syntax, application health, login, Bunny upload initialization, public feed, authenticated Bunny playback, and authenticated DELETE with a staging/test account.
3. Observe production logs and Bunny webhook processing; confirm existing records still resolve to Bunny when `provider` is absent.
4. Run the additive Phinx migration once. Do not use a destructive schema rollback automatically.
5. Verify six legacy records, owner/category/metadata hashes, `provider=bunny`, and `provider_video_id=bunny_video_guid`.
6. Atomically switch the global provider default to OneProvider only after staging and production synthetic upload, processing, thumbnail and Range checks pass.

## Rollback

- Revert only the global provider default to Bunny using the retained protected pre-cutover configuration backup; leave the additive columns in place.
- Records already created with `provider='oneprovider'` continue to route to OneProvider and must not be rewritten during provider rollback.
- A schema `down()` is allowed only when no non-Bunny provider record exists and must be reviewed manually.
- Never delete Bunny assets or use an automatic destructive database rollback.

## Stop conditions

- Backup checksum or restore verification fails.
- Any production query/lock risk is unresolved.
- Login, feed, existing Bunny playback, OneProvider upload/processing, callback, thumbnail, Range or DELETE checks fail.
- The deployed code and migration are not the exact reviewed hashes.
- Any record changes beyond additive provider metadata are observed.

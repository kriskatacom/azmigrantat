# Video infrastructure migration checklist

> Scope guard: touch only the short user-video upload/storage/processing/playback flow. Do not modify live streaming, WebRTC, mediasoup, calls, chat attachments, realtime, or unrelated modules.

- [x] Task 1: Define provider-neutral video storage contract and compatibility rules.
- [x] Task 2: Add non-destructive metadata migration for provider, storage key, upload session and processing fields.
- [x] Task 3: Build a local-only Dedicated storage service skeleton with TUS session lifecycle and signed token verification.

## Checkpoint: Foundation

- [x] Bunny flow remains unchanged in focused tests.
- [x] Dedicated records do not require fake Bunny identifiers.
- [x] Private/public storage boundaries are enforced in the local service skeleton.

- [x] Task 4: Implement Dedicated provider methods.
- [x] Task 5: Implement bounded processing worker and cleanup.
- [x] Task 6: Route existing PHP endpoints through provider selection.
- [x] Task 7: Adapt mobile upload types and resumable client.
- [ ] Task 8: Complete real Android device validation for Dedicated native TUS foreground/resume, process death, token expiry, logout and account switch. Device found, but debug install is blocked by signing mismatch; requires a separately signed dev package and non-production test endpoint. Keep iOS resume-on-open behavior and do not start Task 9.
- [ ] Task 9: Verify playback/feed/profile behavior on Android and iOS.
- [ ] Task 10: Add observability and reconciliation.
- [ ] Task 11: Pilot Dedicated uploads behind configuration.
- [ ] Task 12: Run the Bunny migration CLI in dry-run/execute mode on OneProvider, then obtain explicit approval before any DB commit or selected asset migration.

## OneProvider deployment readiness checkpoint

- [x] Confirm `/srv/azmigrantat-video` is mounted from `/dev/sdb1` and leave the disk unchanged.
- [x] Confirm Redis health, version and loopback-only listeners; confirm FFmpeg/FFprobe and Nginx versions.
- [x] Confirm Node.js/npm and Docker are not installed; no service systemd units or application Nginx site are active yet.
- [x] Confirm the deployment templates reference `RequiresMountsFor=/srv/azmigrantat-video`, `/opt/azmigrantat-video-service`, `/etc/azmigrantat-video/video-service.env` and the configured Redis/FFmpeg paths.
- [ ] Generate/commit `package-lock.json` and pin the approved Node 24 LTS patch before production installation.
- [ ] With explicit approval and interactive sudo, create the service account/directories, install Node, build the service, install units and validate `sudo nginx -t`.
- [ ] Configure secrets outside Git, TLS/domain and a non-production TUS/PHP callback endpoint; then run FFmpeg, Redis and TUS end-to-end smoke tests.

### Deployment pause reason

- [x] Read-only server checks completed; privileged deployment was not executed because the SSH account's `sudo` requires a password and the task explicitly requires manual execution in that case.
- [x] Verify the local lockfile/build and server runtime versions; `npm ci --dry-run` and `npm run build` succeed locally, and OneProvider has Node `24.22.1`/npm `11.19.1` plus Redis/FFmpeg/Nginx.
- [x] Align systemd `ExecStart` with the server's actual `/usr/local/bin/node` path.
- [ ] Operator runs the staged service-user/storage preparation, code deployment, production dependency install, systemd installation and env-file setup commands, then returns the verification output for review.

## Local OneProvider E2E checkpoint

- [x] API, worker, Redis and storage mount verified; API `/health` succeeds.
- [x] Invalid TUS token probe returns HTTP 401 without exposing secrets.
- [ ] Generate a valid short-lived token through the PHP test issuer or a reviewed, temporary operator-only helper that reads the existing secret without printing it.
- [ ] Run synthetic MP4 TUS POST/HEAD/PATCH/complete, Redis queue, FFmpeg processing, metadata/thumbnail/ready and local Range checks.
- [ ] Record processing duration and remove only the explicitly created synthetic test artifacts after the evidence is collected.
- [x] Add a secure operator CLI for the synthetic E2E lifecycle; local build and its protected-env unit test pass.
- [ ] Execute the CLI once on OneProvider as `azmigrantat-video` after operator review; do not mark E2E successful unless every required check passes.
- [x] Diagnose and fix first Synthetic E2E failure: missing explicit HEAD method in the CLI; add regression coverage for method and TUS header.
- [x] Diagnose and fix worker failure caused by FFprobe `mov,mp4,...` alias normalization; persist failure reason and add regression coverage.
- [ ] Deploy the processing normalization/diagnostic build to OneProvider and rerun the synthetic E2E; verify the old dead-letter record remains untouched and only the new synthetic IDs are used.

## Nginx HTTPS and playback preparation

- [x] Read-only check: API remains on `127.0.0.1:3100`, Redis is not public, HTTP `:80` listens, HTTPS `:443` is not active, and Certbot is absent.
- [x] Identify required DNS: `A video.<approved-domain> -> 89.163.135.113`; add `AAAA` only after IPv6 verification; review existing CAA policy.
- [ ] Obtain the approved real hostname and mobile web-origin allowlist; do not use `video.example.invalid`.
- [ ] After separate DNS/UFW approval, install/review ACME tooling and obtain a Let's Encrypt certificate via controlled webroot HTTP-01.
- [ ] Update the Nginx template with exact hostname/certificate paths, explicit `Authorization` forwarding, safe CORS allowlist, GET/HEAD-only public locations, MIME/Range/cache headers, and no private aliases.
- [ ] Set `VIDEO_SERVICE_PUBLIC_URL` only after HTTPS and Range validation; then run `nginx -t`, reload manually, HTTPS health/auth/Range/private-path tests, and document results.
- [x] Prepare final production HTTPS template for `video.azmigrantat.com` with ACME challenge, localhost API proxy, TUS headers, Range playback, safe CORS baseline and private-path denies.
- [ ] Review/add the approved mobile browser origins to the CORS map, then manually install the site and run privileged `nginx -t`.
- [x] Final template review: preserve TUS response headers, avoid duplicate CORS headers, protect hidden files/symlinks, and document Nginx/public-tree permissions.

## PHP ↔ OneProvider integration readiness

- [x] Verify provider-neutral factory, Bunny default, stored-provider routing, PHP HMAC token claims and Node callback signature compatibility.
- [x] Align non-secret env examples with `https://video.azmigrantat.com` and document Node public URL/callback requirements.
- [ ] Configure matching secrets manually outside Git: PHP/Node upload-token secret and PHP/Node callback secret.
- [ ] Configure Node callback URL to PHP `/internal/video/dedicated/callback`, then run a non-production ready/failed callback test.
- [ ] Run PHP provider/migration tests in a PHP runtime or approved Docker environment; no production migration.
- [ ] Resolve the authenticated Dedicated deletion contract before enabling delete through the provider factory.

## Dedicated Video Deletion Contract

- [x] Add separate short-lived admin HMAC token claims and PHP generation; keep upload HMAC tokens upload-only.
- [x] Add authenticated Node `DELETE /v1/uploads/{upload_id}` with ownership/provider checks and `204` idempotent repeat behavior.
- [x] Add tombstone-first deletion and safe exact-path cleanup for private, public, state, callback and temporary artifacts.
- [x] Share filesystem locks between TUS mutation, completion, worker processing and deletion; skip tombstoned/deleting jobs in the worker.
- [x] Add Node regression coverage for success, missing/tombstoned resource, foreign resource, expired token and upload-token misuse.
- [ ] Run PHP tests in an environment with PHP/vendor dependencies and run the deletion integration test against a non-production Dedicated endpoint.
- [ ] Manually configure matching admin secrets outside Git before enabling deletion in any environment.

## Dedicated DELETE deployment preparation

- [x] Run full Node build and test suite in a normal local runtime: 21/21 passed.
- [x] Verify PHP/Node delete-token contract and validate the `AZM_ADMIN` header.
- [x] Verify ownership checks, file/process locks, tombstone behavior and worker protection for deleting jobs.
- [x] Add synthetic `upload → ready → authenticated DELETE → artifact absence` mode to the operator CLI.
- [x] Read-only audit OneProvider mount, service units, runtime and Nginx/public-storage permissions.
- [x] Prepare staged dist deployment with production-dependency install and rollback commands.
- [ ] Review the staged archive and manually activate it on OneProvider; do not restart automatically.
- [ ] Run the synthetic delete E2E on OneProvider only after the new build and matching admin secret are installed.
- [ ] Run PHP runtime tests and a PHP-to-OneProvider integration test in a non-production environment.

## PHP ↔ OneProvider integration preparation

- [x] Review `DedicatedVideoProvider`, factory routing, callback controller and provider-neutral migration.
- [x] Confirm public URL contract: `https://video.azmigrantat.com`.
- [x] Confirm callback route contract: `https://users.azmigrantat.com/internal/video/dedicated/callback` with timestamp/body HMAC.
- [x] Prepare secret configuration instructions without exposing values; keep `VIDEO_STORAGE_PROVIDER=bunny` in production.
- [x] Verify OneProvider HTTPS health and redirect read-only.
- [ ] Configure matching PHP/Node upload, admin and callback secrets in isolated staging only.
- [ ] Run PHP token issuance and callback authentication tests with PHP/vendor runtime.
- [ ] Verify migration status against production read-only schema; do not execute migration automatically.
- [ ] Run a staging PHP → OneProvider upload/ready/failed/DELETE integration test.
- [ ] Re-run HTTPS Range test while retaining one synthetic artifact, then clean it up by exact path.
- [ ] Run first Android Dedicated upload with a staging test profile; do not change production Bunny default.

## PHP 8.4 Staging Tests

- [x] Build isolated `azmigrantat-auth-staging:php84` image from `auth/Dockerfile`.
- [x] Start separate `azmigrantat-staging` Compose project with a new MySQL volume.
- [x] Install Composer dependencies from `auth/composer.lock` inside the staging image.
- [x] Run `DedicatedVideoProviderTest.php` successfully.
- [x] Run `VideoProviderRoutingContractTest.php` successfully.
- [x] Run `VideoMetadataMigrationTest.php` successfully.
- [x] Run all migrations against staging only and verify migration status/schema.
- [x] Verify PHP upload token with Node and Node callback signature with PHP using synthetic values.
- [ ] Configure isolated PHP staging HTTP endpoint and protected staging secrets.
- [ ] Execute real staging PHP create-upload/TUS/ready/failed/callback/playback/DELETE flow.
- [ ] Retain one synthetic artifact for HTTPS Range validation, then clean it up.
- [ ] Run Android Dedicated upload with a staging test user.

## Private PHP ↔ OneProvider staging integration

- [x] Confirm local PHP API bind `127.0.0.1:8082`.
- [x] Confirm SSH alias/client path and prepare remote-loopback forwarding design.
- [ ] Run manual privileged read-only `sshd -T` check for `AllowTcpForwarding`.
- [ ] Obtain explicit approval before starting the temporary reverse tunnel.
- [ ] Use an isolated OneProvider staging service/callback configuration; do not point the production callback at the tunnel.
- [ ] Generate and inject matching staging upload, callback and admin secrets without printing them.
- [ ] Create a staging test user/video through PHP API.
- [ ] Run approved upload → processing → callback → playback/Range → DELETE E2E.
- [ ] Run failed callback and duplicate callback/DELETE checks.
- [ ] Remove only synthetic artifacts and close the temporary tunnel after evidence collection.

## Isolated OneProvider Video Staging

- [x] Read-only audit production listener, storage and Redis boundaries; no staging paths existed.
- [x] Add staging env template with port `3101`, separate root, Redis queue key and loopback callback.
- [x] Add separate staging API and worker systemd templates with mount and filesystem isolation.
- [x] Prepare manual service-user, directory, env-file and unit validation commands.
- [ ] Obtain approval and create the staging service account/directories on OneProvider.
- [ ] Copy the reviewed release and install staging dependencies without production data.
- [ ] Configure three staging-only secrets and update staging PHP URL to `http://127.0.0.1:18082` tunnel target.
- [ ] Start staging API/worker only after `systemd-analyze verify` and tunnel validation.
- [ ] Start the approved two-way loopback SSH forwards: remote `18082→8082` and local `13101→3101`.
- [ ] Add an isolated staging playback route before testing Range; do not point staging public URL at production storage.
- [ ] Run PHP session → TUS → worker → signed callback → ready → playback/Range → DELETE.

## Isolated staging deployment activation

- [x] Build and upload secret-free staging release archive.
- [x] Verify matching local/remote SHA-256.
- [x] Verify PHP Docker bridge networking and identify the loopback/host-network requirement.
- [ ] Manually create `azmigrantat-video-staging` user/group and isolated directories with sudo.
- [ ] Manually extract release and run `npm ci --omit=dev` in staging application directory.
- [ ] Manually create protected staging env with distinct upload/callback/admin secrets.
- [ ] Recreate PHP staging configuration with the isolated bridge-gateway target `VIDEO_SERVICE_URL=http://<bridge-gateway>:13101` (host networking only as reviewed fallback).
- [ ] Start both approved SSH forwards and validate both directions.
- [ ] Install/verify staging systemd units, then start only staging API/worker.
- [ ] Verify staging health, queue isolation and production path denial.
- [ ] Prepare an isolated playback/Range route; do not reuse production public storage.
- [ ] Run the full staging PHP → TUS → FFmpeg → callback → DELETE flow.

## Isolated staging deployment preflight

- [x] Read-only verify the uploaded release is inactive and production listener/storage remain unchanged.
- [x] Add loopback-only staging playback template on `127.0.0.1:3102` with Range support and no production aliases.
- [x] Replace host-network-first guidance with an isolated Docker bridge gateway SSH-forward design and a reviewed fallback.
- [x] Document storage/user/systemd isolation checks and staging-only Redis namespaces.
- [x] Document three independent staging secrets and service-owned npm cache paths; no values generated or stored by this task.
- [ ] Manually create staging user, directories, env and systemd units after operator review.
- [ ] Install/validate loopback Nginx playback route and local bridge forwards; do not expose publicly.
- [ ] Run the isolated PHP → TUS → FFmpeg → callback → playback/Range → DELETE E2E test.

### Activation attempt status (manual sudo required)

- [x] Recheck local and remote release SHA-256; values match.
- [x] Confirm Docker bridge gateway `172.29.0.1` and existing PHP staging container.
- [x] Confirm remote staging paths/units/listener are absent; production remains untouched.
- [x] Upload secret-free staging units and loopback playback template to remote `/tmp`.
- [ ] Execute the supplied privileged commands to create user/storage/env, install units and Nginx route, and start staging.
- [ ] Establish bridge-bound SSH forwards and verify health/playback from the PHP container.
- [x] Verify restricted staging control helper; `status` reports missing units without changing production.
- [ ] After manual installation/preflight, use only the restricted helper for staging `start/status/logs`.

## Fixed staging deployment helper

- [x] Implement fixed helper with release SHA/archive allowlist and no arbitrary arguments.
- [x] Add staging-only storage, env, systemd, Nginx and production-boundary checks.
- [x] Add fixed rollback and no-self-modification behavior.
- [x] Prepare exact root installation and argument-specific sudoers instructions.
- [x] Harden deployment inputs with a root-owned fixed input directory, pinned template hashes, archive link/path checks and duplicate env-key rejection.
- [ ] Operator review/install helper root-owned on OneProvider.
- [ ] Operator provision matching staging secrets outside Git.
- [ ] Run helper `install`, `verify`, `start`, `status`, then bridge SSH tunnels.
- [ ] Replace shared Redis port/namespace with a staging-only Redis instance or ACL user restricted to `azmigrantat:video:staging:*` before full security approval.
- [x] Complete static security audit of helper and proposed sudoers; no helper installation or activation performed.

## Redis staging isolation

- [x] Prepare dedicated Redis config on `127.0.0.1:6380` with persistence and loopback-only binding.
- [x] Add separate Redis service user, systemd unit, data directory and ACL file generation.
- [x] Add Node ACL username/password URL support and regression tests.
- [x] Make deployment helper reject shared production Redis `6379`.
- [x] Verify Node build and tests after ACL URL support: 23/23 passed.
- [ ] Install root-owned Redis inputs and provision the separate ACL secret outside Git.
- [ ] Run Redis PING, ACL/key-pattern, persistence and restart checks.
- [ ] Obtain approval for any OS-level production Redis port denial; do not change production Redis automatically.
- [x] Read-only final preflight: production API/Redis unchanged; staging paths and listeners absent; pinned hashes and key-pattern coverage verified.
- [x] Correct stale API-unit pin found during final audit; refresh the remote helper only after operator reviews the new SHA-256.
- [x] Final pre-activation check: all remote `/tmp` inputs match pinned hashes; corrected helper refreshed in `/tmp`; no staging service activated.
- [x] Correct worker template SHA-256 pin discovered during staging install; helper must be refreshed before retrying installation.
- [x] Include fixed `/usr/local/bin` Node runtime path in helper after staging install preflight exposed npm's `/usr/bin/env node` requirement.
- [x] Enter the fixed extraction directory before npm 11 `ci`; required for lockfile discovery and keeps the install deterministic.
- [x] Permit service-user traversal of the root-owned temporary extraction directory with fixed mode `0755`; release files remain non-writable.
- [x] Fix Redis config-directory traversal while retaining restricted env/ACL file permissions.
- [x] Isolate Redis persistence under `/var/lib/azmigrantat-video-staging-redis` instead of weakening video-tree permissions.
- [x] Align Redis systemd `ReadWritePaths` with the isolated `/var/lib` persistence path.
- [x] Tighten and unify Redis ACL key access to the exact staging processing-key prefix.
- [x] Use Redis list/sorted-set command categories for queue compatibility while retaining the staging-only key pattern.
- [x] Add Redis 7 read/write categories without granting admin/dangerous commands or non-staging key access.
- [x] Enumerate the four concrete staging queue keys in Redis ACL.
- [x] Activate staging Redis/API; worker intentionally stopped after reproducible ACL/client blocker.
- [x] Resolve staging Redis ACL `NOPERM`: the ACL had `azmigrant` instead of the real `azmigrantat` namespace; corrected only the four staging queue keys and reloaded staging Redis.
- [x] Deploy the staging public-file permission fix and pass synthetic TUS → FFmpeg → playback Range → authenticated DELETE E2E.
- [ ] Start/verify the temporary PHP callback tunnel, then run PHP → OneProvider callback integration E2E and Android staging upload validation.
- [x] Verify reverse callback tunnel and Docker bridge forwards; PHP staging reached OneProvider staging without public ports.
- [x] Synchronize separate staging HMAC upload/callback/admin secrets without exposing values.
- [x] Execute PHP create-session → TUS → callback `ready` → playback Range `206` → authenticated DELETE for a synthetic video.
- [ ] Diagnose staging worker jobs that can disappear from Redis without a state transition when the worker is already running; do not start Android validation until this is resolved.
- [ ] Start/verify SSH tunnels and prepare Android staging upload only after worker/E2E is green.

## Staging PHP API and full OneProvider integration

- [x] Build PHP 8.4 staging image and start loopback-only staging API on `127.0.0.1:8082`.
- [x] Verify staging API invalid callback authentication (`401`) and unauthenticated upload protection (`401`).
- [x] Keep staging MySQL isolated with separate Compose project/volume and all migrations applied.
- [ ] Obtain an approved HTTPS staging callback hostname or private authenticated tunnel reachable by OneProvider.
- [ ] Inject matching staging upload/callback/admin secrets into protected env files without Git/log exposure.
- [ ] Create a staging test user and persisted test video through the normal PHP API.
- [ ] Run PHP create-session → OneProvider TUS → ready callback → playback/Range → authenticated DELETE.
- [ ] Run an isolated failed-processing callback and duplicate callback/DELETE checks through the PHP API.
- [ ] Run Android upload with the staging test profile.

## Current status — worker scheduling and staging E2E (2026-10-25)

- [x] Diagnose the active-worker queue loss: upload-lock contention was incorrectly acknowledged instead of requeued.
- [x] Requeue lock-contended leases, add regression coverage, and verify two sequential synthetic jobs without restarting the worker.
- [x] Repeat PHP → TUS → FFmpeg → signed callback `ready` → playback/Range → authenticated DELETE; synthetic records and identified artifacts were cleaned.
- [ ] Android upload/resume validation remains pending because `adb devices -l` reported no attached device.

## Android staging upload validation preparation

- [x] Review Dedicated Android TUS/native foreground-service path and staging configuration.
- [x] Run mobile TypeScript check.
- [x] Compile local Android debug APK without installing it.
- [ ] Connect an authorized Android development device and verify `adb devices -l`.
- [ ] Provide a staging-only device-reachable upload endpoint; the current Docker bridge URL is not reachable directly from USB Android.
- [ ] Execute real upload, network interruption/resume, background, process-death, cancellation, token-expiry, callback, `ready`, playback and DELETE checks.

## Android HTTPS staging endpoint

- [x] Audit existing OneProvider TLS and Nginx listeners without changing production.
- [x] Add reviewed HTTPS staging Nginx template with TUS headers, auth, Range and private-path protection.
- [x] Confirm PHP staging currently returns internal Docker/SSH URLs, not Android-reachable HTTPS.
- [ ] Obtain an approved staging hostname and DNS/TLS certificate, or an access-controlled HTTPS tunnel.
- [ ] Configure PHP staging to return `https://video-staging.azmigrantat.com` and expose PHP staging through a separate protected HTTPS hostname.
- [ ] Validate HTTPS TUS POST/HEAD/PATCH/complete from Android before lifecycle testing.

### DNS/TLS preflight result

- [x] Confirm `video-staging.azmigrantat.com` DNS points to OneProvider and public `/health`/TUS OPTIONS respond.
- [ ] Issue and install a dedicated `video-staging.azmigrantat.com` certificate; current certificate is only for `video.azmigrantat.com`.
- [x] Confirm `users-staging.azmigrantat.com` is Cloudflare-proxied but currently routes to an unrelated WordPress origin.
- [ ] Obtain PHP-origin access and route `users-staging.azmigrantat.com` to the isolated PHP staging API with its own protected HTTPS configuration.

### cPanel/AutoSSL follow-up

- [x] Confirm cPanel login endpoint availability on port 2083 without logging in.
- [ ] In cPanel, create `users-staging` with a separate document root and staging-only configuration/database.
- [ ] Verify PHP 8.4 and required extensions/Composer support before deploying the PHP application.
- [ ] Run AutoSSL for the staging hostname only and verify the certificate/SNI.
- [ ] Keep Cloudflare SSL mode unchanged until the staging origin certificate and vhost are validated.

### OneProvider staging certificate

- [x] Confirm Certbot 2.9.0 is installed and `nginx -t` passes.
- [ ] Install the reviewed HTTP ACME challenge server block for `video-staging.azmigrantat.com`.
- [ ] Issue the dedicated Let's Encrypt certificate and activate HTTPS only after challenge validation.
- [ ] Verify `/health`, TUS headers, Authorization behavior and Range playback over validated HTTPS.

### cPanel PHP staging deployment preflight

- [x] Confirm Composer lock constraints are compatible with PHP 8.3 in principle (strictest locked package requirements are PHP 8.2+).
- [ ] Verify cPanel PHP 8.3 extensions: curl, gd, intl, mbstring, openssl, pdo_mysql and zip.
- [ ] Establish working key-based SSH/SFTP access to `azmigrantat-shared` or use cPanel File Manager/Git deployment.
- [ ] Deploy API code with public root `/home/azmigran/users-staging.azmigrantat.com` and non-public app/vendor/.env outside the root where possible.
- [ ] Create an isolated staging database/user and staging `.env`; never reuse production credentials.
- [ ] Run `composer install --no-dev` and `composer check-platform-reqs` in the staging environment.
- [ ] Verify `/api/mobile/login`, protected video routes and signed `/internal/video/dedicated/callback`.
- [ ] Configure `VIDEO_SERVICE_URL` and `VIDEO_SERVICE_PUBLIC_URL` to `https://video-staging.azmigrantat.com` only after the OneProvider certificate is valid.

### PHP staging deployment status

- [x] Confirm cPanel document root `/home/azmigran/users-staging-app/public`.
- [x] Create isolated staging database/user and protect generated credentials.
- [x] Deploy PHP source and Composer dependencies without `.env`/production credentials in the archive.
- [x] Pass PHP 8.3 platform checks and 247-file syntax validation.
- [x] Run Phinx migrations against `azmigran_auth_staging` only.
- [x] Configure staging provider URL and synchronized staging HMAC secrets.
- [x] Issue and activate dedicated OneProvider staging TLS certificate; `/health` and TUS OPTIONS pass.
- [ ] Resolve external cPanel/LiteSpeed 404 for `users-staging.azmigrantat.com`.
- [x] Test original document root with temporary marker; it is not the active LiteSpeed route.
- [x] Confirm no symlink/wrapper was created because LiteSpeed rejects the vhost before filesystem routing.
- [ ] Request cPanel/Jump.bg LiteSpeed vhost refresh/rebuild, then retest staging public API.

### Subdomain recreation preparation

- [x] Create and SHA-256 verify protected backup of current staging application/configuration.
- [x] Confirm staging database/user remain present and DB connection succeeds.
- [x] Confirm current cPanel root is still the old `/home/azmigran/users-staging.azmigrantat.com`.
- [ ] Operator deletes/recreates the subdomain with document root `/home/azmigran/users-staging.azmigrantat.com/public`.
- [ ] Verify the new UAPI document root before deployment.
- [ ] Restore/deploy application and config into the new path without exposing private files.
- [x] Verify recreated document root and static marker delivery.
- [x] Copy application/config/dependencies to the new path while retaining old installation and backup.
- [x] Confirm `.env`/vendor/app/routes/storage remain outside public root.
- [ ] Resolve LiteSpeed/PHP handler 404 for PHP index/API at origin.
- [ ] Re-run public API, callback, OneProvider integration and Android readiness checks.
- [ ] Run public PHP login, Dedicated session, callback, playback and DELETE integration tests.
- [ ] Execute Android staging upload/resume test.

### Current staging validation result (2026-10-25)

- [x] Verify Jump.bg PHP HTTPS, login validation (`422`), callback rejection (`401`) and private-path protection.
- [x] Verify OneProvider staging TLS, health, TUS headers and staging service/Redis/storage isolation.
- [x] Fix the synthetic CLI transient DELETE race; local build and Node tests pass `25/25`.
- [x] Execute OneProvider synthetic TUS → FFmpeg → ready → Range → DELETE; all required checks passed and artifacts were removed.
- [ ] Provision an isolated active public OAuth application/test profile in the staging DB; registration currently returns `401` because no active client exists.
- [ ] Re-run PHP session → TUS → signed callback → ready → playback/Range → DELETE after the staging OAuth client/test profile is available.
- [ ] Build/install staging APK and run Android upload/resume/background/process-death tests on a connected device.
- [x] Create isolated active public staging OAuth client via `OauthApp` model without a client secret.
- [x] Add ignored Android staging env with staging API/video URLs and the staging public client ID.
- [ ] Diagnose why the PHP-created video remains non-ready after the OneProvider worker's lock deferral and verify signed callback delivery for an owned PHP record.
- [x] Remove synthetic staging users, video records and temporary category after the failed PHP E2E attempt; direct count is zero.

### PHP-created lock-deferral follow-up (2026-10-26)

- [x] Confirm worker lock deferral requeues rather than loses PHP-shaped jobs.
- [x] Correct staging callback URL from the obsolete loopback tunnel to the HTTPS PHP staging endpoint.
- [x] Add regression test for a PHP-created job completing after lock release without worker restart.
- [x] Run TypeScript build and Node tests: `25/25` passed.
- [ ] Re-run full PHP staging E2E after the staging registration rate-limit window expires or an approved isolated test user is available; include playback, Range and DELETE.
- [ ] Verify final staging synthetic cleanup and queue/worker state after the successful rerun.
- [ ] Build/install Android staging APK with the existing OAuth client only after PHP E2E passes; perform real upload/resume/background tests only with a connected device.

### Staging FFmpeg/rate-limit follow-up (2026-10-26)

- [x] Diagnose the FFmpeg failure as Jump.bg shared-LVE thread/process exhaustion, not OneProvider worker CPU/RAM/timeout limits.
- [x] Confirm OneProvider staging API, worker and Redis remain active without restart; no production service was changed.
- [x] Keep the mitigation limited to the synthetic fixture: single-threaded FFmpeg on Jump.bg or fixture generation on OneProvider.
- [ ] Repeat the PHP E2E after the existing registration rate-limit expires or with an already approved isolated staging profile; do not bypass the limiter.
- [ ] Confirm callback-to-ready, playback/Range and authenticated DELETE, then remove all synthetic data.
- [ ] Build the staging APK after PHP E2E passes and perform real Android upload/resume tests only with a connected device.

### PHP staging E2E completion follow-up (2026-10-26)

- [x] Verify the registration rate-limit window expired without bypassing it.
- [x] Generate the synthetic MP4 on OneProvider instead of Jump.bg.
- [x] Correct staging `VIDEO_SERVICE_PUBLIC_URL` to `https://video-staging.azmigrantat.com`.
- [x] Pass PHP → TUS → FFmpeg → signed callback → `ready` → playback/Range → authenticated DELETE.
- [x] Confirm worker processing without a restart during the successful job and keep API/worker/Redis active.
- [x] Remove all synthetic users, videos, category and fixture files; final matching DB counts are zero.
- [x] Prepare staging Android development-build configuration and verify TypeScript with the staging URLs/client ID.
- [x] Confirm the existing debug APK artifact and SHA-256; no device test is claimed because `adb devices -l` is empty.
- [x] Detect an authorized Android device, install the existing APK, start staging Metro through USB reverse, and confirm the app bundle launches.
- [x] Confirm native TUS/foreground-service classes and TUS headers are present in the APK; staging URLs/client ID are injected at Metro runtime.
- [ ] Run interactive staging login and real-video upload/resume/background/cancellation/process-death tests; no result is claimed until the operator completes the UI flow with an approved staging profile.
- [x] Populate staging `GOOGLE_WEB_CLIENT_ID.dev_value` from the existing Android Web OAuth configuration; keep production value empty and verify invalid-token handling.
- [x] Create one active staging-only video category after the upload API reported no valid active category; verify `/api/categories` returns it.
- [x] Make `category_id` optional in mobile and PHP upload flow; normalize stale category IDs to `NULL`, deploy the staging controller, and pass TypeScript/PHP syntax checks.
- [ ] Retry one real staging upload from the Android device and verify the complete TUS → ready flow after the app reload.
- [x] Diagnose the staging upload error as the B2-only thumbnail request and skip that request for Dedicated uploads.
- [x] Verify staging provider/HMAC/public URL configuration without exposing values; TypeScript passed and Node suite passed `25/25`.
- [ ] Repeat the real Android Dedicated upload and confirm ready/playback; no new APK is required because the fix is JavaScript loaded by Metro.
- [ ] Diagnose the current long-processing Android video from its video ID across staging DB, Redis/worker state and callback delivery after SSH access to Jump.bg and OneProvider is restored.
- [x] Add bounded Android processing polling and safe `video_id`/status-transition diagnostics; timeout is non-terminal and does not mark the video failed.
- [ ] After SSH access is restored, trace the concrete Android `video_id` across staging DB, TUS completion, Redis, worker/FFmpeg, signed callback and playback; add a regression test for the confirmed server-side failure mode and verify failed-state UI.
- [x] Recheck SSH aliases, DNS, local SSH processes/sockets and Android ADB/logcat without changing SSH/firewall/keys; both remote handshakes remain timed out and no new upload ID is present.
- [ ] Repeat the same SSH checks from the operator's local terminal/network; if they also time out, request Jump.bg/OneProvider provider-side ACL or SSH-service diagnostics.
- [x] Trace PHP videos 6/7 to complete TUS offsets and identify missing Node completion plus worker Redis `NOPERM` crash evidence.
- [x] Add TUS final-PATCH auto-complete, idempotent explicit complete handling and regression coverage; local Node suite is 26/26.
- [x] Deploy and verify the staging-only release; synthetic E2E reaches ready, Range 206 and DELETE 204 with cleanup.
- [ ] Repeat an interactive Android upload on the connected device and capture the new `video_id`; verify ready/playback through PHP staging. Do not mark this device test successful until the UI upload is actually performed.
- [x] Verify staging Metro/API/video-service configuration and public health endpoints before Android monitoring; no device was attached during the observation.

## PHP Staging Environment and OneProvider Integration

- [x] Analyze `auth/composer.json`, `composer.lock`, PHP 8.4 Dockerfile and Compose MySQL service.
- [x] Confirm local blocker: no PHP/Composer/vendor and Docker socket permission denied; no system permissions changed.
- [x] Prepare isolated staging approach using a separate Docker Compose project/volume and non-production env file.
- [ ] Build the PHP 8.4 test image and install Composer dependencies once Docker access is approved.
- [ ] Run `DedicatedVideoProviderTest.php`, `VideoProviderRoutingContractTest.php` and `VideoMetadataMigrationTest.php` in the isolated PHP container.
- [ ] Run staging migration/status checks against a new MySQL volume only; never production.
- [ ] Configure matching protected secrets and callback URL in staging.
- [ ] Execute PHP create-upload → TUS → processing → ready/failed callback → playback → authenticated DELETE flow.
- [ ] Retain one synthetic artifact for HTTPS Range/permissions validation, then remove only exact synthetic paths.
- [ ] Run first Android Dedicated upload with staging test user; keep production `VIDEO_STORAGE_PROVIDER=bunny`.

## Dedicated DELETE release staging

- [x] Build and archive versioned `dist/`, `package.json` and `package-lock.json` without secrets.
- [x] Upload release to OneProvider and verify matching SHA-256.
- [x] Create a rollback backup archive of the current release without env/storage/node_modules.
- [x] Verify runtime dependencies, mounted storage and systemd Node paths read-only.
- [ ] Manually extract/stage the release, install production dependencies and run preflight checks with sudo.
- [ ] Obtain explicit approval, atomically switch release and restart services manually.
- [ ] Run `node dist/synthetic-e2e.js --delete-after-ready` using the protected env file; do not target real video IDs.

## OneProvider new-upload cutover

- [x] Configure matching protected Dedicated secrets and public/callback URLs without logging values.
- [x] Deploy the final TUS/permissions release to staging and production with verified checksum and rollback copies.
- [x] Switch the production default for new uploads to `oneprovider` atomically.
- [x] Verify staging and production synthetic uploads through ready/thumbnail/Range `206` and exact cleanup.
- [x] Verify all six pre-existing production video rows remain Bunny-routed and Bunny playback remains available.
- [x] Build the preview APK and verify the Dedicated/TUS native contract in the artifact.
- [ ] Install the preview APK on the connected device after explicit authorization to remove the incompatible debug-signed package (uninstall clears its local app data).
- [x] Finish the clean-cache production AAB build and verify its checksum; do not submit it to Play Store without separate authorization.
- [ ] Perform one real user upload with an updated signed app build and confirm the resulting DB row is `provider='oneprovider'`; do not use or migrate an existing Bunny record.

## Bunny video 78 migration rehearsal

- [x] Run a real Bunny HLS staging rehearsal against an isolated single-row shadow table for exact ID/owner/GUID `78/1269/ba8a28ca-603b-4563-be47-3574a773d91d`.
- [x] Make FFmpeg stdin HLS handling network-free and compatible with FFmpeg 6.1.1; test explicit HLS demuxer, local `file://` resources and absence of `-max_redirects`.
- [x] Verify MP4 SHA-256/FFprobe, JPEG thumbnail, ownership, HTTPS playback and exact HTTP Range `206`.
- [x] Verify shadow-only transaction/conditional commit, idempotent repeat, `commit_pending` recovery, stale-lock handling and rollback.
- [x] Scan migration state/logs for credential patterns and remove exact staging test artifacts, credentials, releases, shadow table and tunnel.
- [x] Pass TypeScript build and all 35 Node regression tests.
- [x] Prepare checksum-pinned local CLI release candidate and future-approval-only deployment plan.
- [ ] Obtain separate explicit approval before any production deployment, credential change, execute or DB commit for video `78`.
- [x] Verify and install the checksum-pinned CLI release outside active/public production paths without restarting services.
- [x] Run exact production dry-run for `78/1269/ba8a28ca-603b-4563-be47-3574a773d91d`; fingerprints match the staging rehearsal.
- [x] Confirm production DB/public storage/services/backups are unchanged and all six rows remain Bunny-routed.
- [x] Remove temporary production credentials and SSH tunnels; seal sanitized dry-run audit state with checksums.
- [ ] Obtain new explicit approval before any production `--execute`, download/remux, DB commit, rollback or playback verification against a migrated production artifact.

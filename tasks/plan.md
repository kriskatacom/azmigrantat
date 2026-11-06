# Implementation Plan: Собствена инфраструктура за кратки видеа

## Обхват

Миграция на кратките потребителски видеа от Bunny Stream към отделна video upload/storage услуга на Dedicated сървъра, като старите Bunny видеа продължат да се възпроизвеждат. Live streaming, WebRTC, mediasoup, разговори и chat attachments са извън обхвата.

## Твърда граница на промените

Променят се само компонентите, които са необходими за качването, съхранението, обработката, thumbnail-ите и playback URL-ите на кратките потребителски видеоклипове. Не се променят други application модули, бизнес функционалности, live streaming, WebRTC/mediasoup, audio/video calls, chat files/attachments, realtime инфраструктура или несвързани storage flows. Provider abstraction-ът се въвежда само в video flow-а и не се превръща в общ refactor на приложението.

Всяка промяна извън тези video-specific места се счита за out of scope и изисква отделно изрично одобрение.

## Audit findings

- Мобилният flow е `VideoUploadScreen` → `beginVideoUpload` → TUS upload → `upload-complete` → thumbnail → polling на профила до `ready`.
- Android използва съществуващия `BunnyNativeUpload` Expo module и foreground service с 512 KiB chunks; module-ът вече има и Dedicated TUS path. iOS/web използват `tus-js-client`; iOS native module е само stub.
- `VideoController` създава Bunny asset, връща Bunny TUS credentials, извиква Bunny при update/delete/playback и приема Bunny webhook.
- `publicIndex()` генерира playback URL за всяко видео и в момента е Bunny-specific. Това е критичната feed интеграция.
- `UserController::show()` извиква `removeMissingBunnyVideos()`, което може да изтрива локални записи при преминаване към Dedicated, ако не стане provider-aware.
- `videos` таблицата съдържа задължителни `bunny_library_id` и `bunny_video_guid`; текущата схема не е достатъчна за Dedicated-only записи без съвместимостна миграция.
- Thumbnail-ите се пазят в Backblaze B2 през директна логика в `VideoController`; това трябва да стане част от storage abstraction, ако Dedicated ще обслужва и thumbnail-и.
- `expo-video` приема обикновен HTTPS URL и вече има контролирани preload/pagination механизми; HLS не трябва да се въвежда автоматично, защото целта е минимална обработка и single MP4.
- В repo няма Dedicated hostname, SSH конфигурация, disk характеристики, worker supervisor или production NGINX конфигурация. Не могат да се правят капацитетни твърдения или deployment.
- `video-module-architecture.md` описва по-стара B2/Cloudflare/HLS архитектура с няколко renditions; тя не съответства на текущия приоритет за Dedicated + minimal processing и не е използвана като deployment plan.

## Архитектурни решения

1. PHP остава source of truth за metadata, authorization, ownership, statuses и provider selection.
2. Въвежда се `VideoStorageProvider` contract с поне `BunnyStreamProvider` и `DedicatedVideoProvider`; controller-ите не трябва да instantiate-ват конкретния Bunny service.
3. Новите Dedicated записи получават provider-neutral storage identity и object keys. Старите записи остават Bunny records и не се мигрират насилствено.
4. Dedicated upload service приема TUS/resumable upload директно, валидира token-а, записва само в private temporary area и изпраща completion event/job към processing queue.
5. Ready MP4 файловете се доставят от NGINX с byte ranges. Авторизацията се реализира с краткоживеещи signed URLs или internal authorization на edge; PHP не проксира video bytes.
6. FFprobe определя сценария. При подходящ MP4 се публикува оригиналът; при липсващ faststart се прави remux; transcoding до H.264/AAC е fallback. Не се създават multiple renditions в първата версия.
7. Processing transitions са идемпотентни и проверяват artifact-а преди `ready`. Worker restart трябва да може да възстанови `processing` jobs.

## Dependency graph

```text
provider-neutral DB fields / storage contract
        ↓
Dedicated upload service + token verification + filesystem layout
        ↓
PHP provider selection + upload-complete/status callbacks
        ↓
playback/thumbnail/delete/update endpoints
        ↓
mobile upload adapter and Android background uploader
        ↓
feed, profile playback, migration and operational rollout
```

## Task list

### Phase 1: Foundation

- [x] Task 1: Define provider-neutral video storage contract and compatibility rules.
- [x] Task 2: Add non-destructive metadata migration for provider, storage key, upload session and processing fields.
- [x] Task 3: Build a local-only Dedicated storage service skeleton with TUS session lifecycle and signed token verification.

### Checkpoint: Foundation

- [x] Existing Bunny upload authorization/playback/callback behavior is covered by focused characterization tests.
- [x] New Dedicated records can be represented without fake Bunny identifiers.
- [x] Upload state and finalized originals are confined to the configured service root; no public file route exists.

### Phase 2: First end-to-end Dedicated slice

- [x] Task 4: Implement Dedicated provider methods for create upload, complete, playback, thumbnail, update and delete.
- [x] Task 5: Add queue worker, FFprobe decision tree, cleanup, quotas and disk-space guards.
- [x] Task 6: Route existing PHP endpoints through provider selection while preserving serializer shape and old Bunny behavior.

### Checkpoint: API and storage

- [x] Standard MP4, remux and transcode paths are covered by deterministic decision-tree tests; actual media execution remains environment-dependent.
- [x] Status updates are idempotent across retries and worker restart, with a persisted callback outbox and delivered-event ledger.
- [x] Playback URL never exposes private filesystem paths; only finalized public artifact URLs are emitted.

### Phase 3: Mobile and delivery

- [x] Task 7: Replace Bunny-specific client credential types with a provider-neutral upload session type while retaining backward compatibility.
- [ ] Task 8: Validate Android foreground/background lifecycle and iOS resumable behavior; native Dedicated path is implemented, but device-level validation remains pending.
- [ ] Task 9: Verify `expo-video`, Range delivery, thumbnail URLs, feed pagination and profile preload/expiry behavior on Android and iOS.

### Phase 4: Migration and operations

- [ ] Task 10: Add observability, reconciliation and orphan cleanup commands.
- [ ] Task 11: Pilot new uploads on Dedicated behind configuration/feature flag.
- [ ] Task 12: Prepare and pilot a dry-run/resumable Bunny-to-Dedicated migration CLI; migrate selected videos only after explicit approval and measured storage, CPU, disk I/O and concurrent playback tests.

## Proposed storage layout

```text
/srv/etome-video/
  private/
    uploads/{video-id}/{upload-id}/chunks-or-upload.bin
    originals/{video-id}/original.ext
  public/
    videos/{video-id}/playback.mp4
    thumbnails/{video-id}/thumbnail.jpg
  state/
  logs/
```

The exact path is configuration, not an API input. Public NGINX locations expose only finalized artifacts and never `private/` or `state/`.

## Dedicated software requirements

- Linux with a separate service account and separate NGINX, uploader and worker privileges.
- NGINX with HTTPS, `sendfile`, byte-range support, cache headers and no directory listing.
- Dedicated upload service supporting TUS 1.0.0, resumability, bounded temporary storage and signed upload tokens.
- FFmpeg and FFprobe; process limits, timeout, `-nostdin`, safe argument passing and bounded worker concurrency.
- Durable queue (Redis-backed queue or equivalent) and a supervisor such as systemd/Supervisor.
- MySQL access only for PHP API or a narrowly scoped internal callback; video service must not receive user bearer tokens.
- Monitoring for free disk, inode usage, upload/processing failures, queue depth, CPU, I/O wait, throughput and active range requests.
- Firewall, private internal API authentication, log rotation, backup policy and a tested restore procedure.

## Migration strategy

1. Keep Bunny as the provider for all existing records.
2. Deploy schema/provider abstraction without changing playback responses.
3. Enable Dedicated for new uploads only for an internal/test cohort.
4. Validate upload, processing, playback, deletion and mobile background behavior with representative files.
5. Migrate old Bunny assets only when there is a verified export/download path and enough temporary disk; retain Bunny fallback until each asset is validated.
6. Switch by provider/record, not by global destructive migration. Remove Bunny only after an inventory confirms zero dependent records and an explicit approval.

## Risks and open questions

| Risk / question | Impact | Required resolution |
|---|---:|---|
| Dedicated public hostname, TLS and reverse-proxy topology unknown | High | Obtain deployment details before production work |
| HDD throughput and concurrent range-read capacity unknown | High | Benchmark with real file sizes and measured concurrency |
| Android native path has only local/static validation | High | Run device tests for foreground, process-death offset recovery, token refresh and account isolation |
| iOS background execution is limited | High | Define supported behavior: foreground/resume-on-open vs native background URLSession/TUS implementation |
| Existing `videos` schema requires Bunny IDs | High | Add nullable/provider-neutral fields non-destructively; retain old columns for legacy records |
| Existing profile cleanup assumes Bunny | High | Resolved for current flow: reconciliation now selects the stored provider and skips Dedicated records |
| Thumbnail ownership currently uses B2 | Medium | Decide whether thumbnails move to Dedicated in the first slice |
| Feed currently generates one playback URL per returned item | Medium | Keep response contract but ensure signed URL cost and expiry are acceptable |
| No production queue/monitoring config in repo | High | Treat deployment as a separate approved operation |

## Verification commands currently available

### OneProvider read-only deployment audit

- Read-only SSH audit via alias `oneprovider-video` reached `srv62708` (Ubuntu 24.04.5 LTS, kernel `6.8.0-147-generic`). `/dev/sda` is the current 1.8 TB WDC system disk mounted as `/`; `/dev/sdb` is a separate 1.8 TB WDC disk, serial `WD-WCC4M7SVJREH`, with no partition, filesystem, label, UUID or mountpoint reported by `lsblk`. Sysfs reports the disk is writable and non-removable. Definitive signature probing could not be completed because `codexadmin` has no raw-device read permission: both `blkid -p /dev/sdb` and `wipefs --no-act /dev/sdb` returned `Permission denied`. Root must run `lsblk`, `blkid -p`, `wipefs -n` and `smartctl -a` before any destructive approval.
- The target path `/srv/azmigrantat-video` does not exist. Node.js, Redis, FFmpeg/FFprobe and Nginx are not installed or active. Ubuntu package candidates are Node.js `18.19.1`, Redis `7.0.15`, FFmpeg `6.1.1` and Nginx `1.24.0`; the service Dockerfile targets Node 24, so the final Node runtime choice must be made deliberately before installation.
- SSH listens on TCP 22. The non-root SSH files contain `PasswordAuthentication no`, `PubkeyAuthentication yes`, `KbdInteractiveAuthentication no`, and conflicting `PermitRootLogin no` / `PermitRootLogin yes` drop-ins; effective `sshd -T` and firewall state require a privileged read-only check. `ufw`, firewalld and nftables rules could not be inspected without sudo.
- Proposed approved sequence, not executed: root disk-health/signature confirmation; create a GPT and one ext4 partition on `/dev/sdb`; create `/srv/azmigrantat-video`; mount by UUID with conservative options such as `noatime,nodev,nosuid`; create a dedicated service account; install the selected Node runtime, Redis, FFmpeg/FFprobe and Nginx; configure systemd units for the HTTP server and worker with bounded resources; configure Nginx HTTPS reverse proxy and byte-range delivery only for finalized public artifacts; then run non-production smoke tests before any pilot.
- Secrets must live outside Git, preferably in a root-owned `/etc/azmigrantat-video/video-service.env` readable by the service group only, with separate values for upload-token HMAC, callback HMAC, Redis authentication and PHP callback configuration. No credentials were read or written during the audit.

- PHP focused tests exist under `auth/tests`, but Composer dependencies/vendor are not present in this checkout, so they were not executed during the audit.
- `auth/tests/VideoStorageProviderTest.php` was added for Task 1; it could not be executed because the local environment does not provide a `php` binary.
- `auth/tests/VideoMetadataMigrationTest.php` was added for Task 2; local PHP is unavailable and the existing Docker compose cannot connect to `/var/run/docker.sock` (`permission denied`), so it was not executed.
- `app/azmigrantat-video-service` was strict type-checked and 4 unit/integration tests passed from a temporary `/tmp` JavaScript build. Direct `tsx` execution is blocked in the sandbox by its IPC pipe restriction; no system dependencies were installed.
- Task 4 PHP unit coverage was added in `auth/tests/DedicatedVideoProviderTest.php`, but PHP execution remains pending: no local `php` binary is available and Docker access is denied by `/var/run/docker.sock` permissions. Manual command when a PHP runtime is available: `php auth/tests/DedicatedVideoProviderTest.php`.
- Task 5 TypeScript strict checking passed and 10 compiled Node unit/integration tests passed, including decision-tree, retry/dead-letter, stale lease recovery, disk guard, cleanup and callback delivery/retry coverage.
- Task 5 could not run real FFmpeg/FFprobe media E2E tests because neither `ffmpeg` nor `ffprobe` is installed locally. Manual runtime verification requires configured binaries and Redis: `npm run build`, `npm test`, then `npm run worker` with a non-production `.env`.
- Task 5 did not run a live Redis integration test because no Redis runtime is available locally; the durable Redis adapter and recovery protocol are covered by type-checking plus the in-memory durable-queue tests. OS-level CPU/memory cgroup limits remain a deployment/supervisor concern and were not changed locally; worker concurrency and processing timeouts are enforced in code.
- Task 6 added provider-switching and routing contract coverage in `auth/tests/DedicatedVideoProviderTest.php` and `auth/tests/VideoProviderRoutingContractTest.php`. PHP execution remains blocked because neither `php` nor `composer` is available locally, and Docker cannot access `/var/run/docker.sock` (`permission denied`). Safe manual execution when a PHP runtime is available: `php auth/tests/DedicatedVideoProviderTest.php`, `php auth/tests/VideoProviderRoutingContractTest.php`, and the existing `auth/tests/VideoStorageProviderTest.php`.
- Task 7 uses the already declared `tus-js-client` 4.3.1 dependency; the Expo TypeScript compiler and ESLint passed. Two local Vitest files passed with 5 tests covering Bunny/Dedicated discrimination, token-expiry retry policy, owner-specific fingerprints and SecureStore-backed resumable URL persistence.
- Task 7 was not run on Android/iOS device builds or against a live PHP/TUS service. The local test runtime validates the adapter policy/storage contract; manual device verification requires an Expo dev client, the PHP API, Dedicated service and HTTPS endpoints in production.
- Task 8 added account-scoped pending-upload cleanup on logout/account switch, resumable state restoration on the next upload screen open, and Android 14+ `dataSync` foreground-service declarations plus a partial wake lock for the existing Bunny native uploader. TypeScript and ESLint passed; 3 Vitest files passed with 8 tests, including Android manifest/service contract checks.
- Task 8 was not validated on a real Android/iOS device or emulator. The shared Android foreground service uses `START_NOT_STICKY`, so recovery after process death depends on reopening the app and starting the same upload again; the Dedicated native path then uses the server `HEAD` offset as source of truth. iOS has no native background `URLSession`/TUS implementation, so suspension/termination continuation is not claimed.
- Task 8 continuation adds `startDedicatedUpload` to the existing Android Expo module. It uses the Task 3 TUS contract (`POST` creation, `HEAD` offset recovery, `PATCH` chunks, Bearer token), reopens the local file at the server-confirmed offset, and reconciles `409` responses with `HEAD`. Expired tokens are surfaced to the existing PHP session-refresh flow; Bunny still uses its original path.
- Android offline Gradle Kotlin compilation passed. `adb devices` returned no attached device, so no real foreground/background, process-death, logout, account-switch or token-expiry device scenario is marked successful. Manual device steps: build/install the dev client with `npm run android`; start a Dedicated upload; background and lock the device; interrupt/restore network with `adb shell svc wifi disable` / `adb shell svc wifi enable`; force-stop with `adb shell am force-stop <application-id>`; reopen and select the same local file; verify a `HEAD` offset is resumed, no duplicate upload is created, and the status reaches processing/ready only after completion. Test token expiry with a short local token TTL and verify one refresh, then test logout/account switch and confirm the pending state is cleared and the old token cannot continue the upload.
- Android device validation attempt: `adb devices -l` found Motorola Moto G35 5G (`ZE223HTNMR`). A loopback-only debug build was compiled with `EXPO_PUBLIC_API_URL=http://127.0.0.1:8080`; the APK install was rejected with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` because the already-installed `com.anonymous.chatapp` has a different signing key. The existing app was not uninstalled and its data was not touched. Manifest inspection confirmed `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `WAKE_LOCK`, and a registered `dataSync` service, but runtime foreground-service/upload logs could not be exercised with this build.
- Dedicated TUS device tests remain blocked until a separately signed dev package can be installed and a non-production PHP/Dedicated endpoint is available. Do not use the installed app's production configuration for these tests.
- Bunny migration preparation added `app/azmigrantat-video-service/src/bunny-migration.ts` and `src/migrate-bunny.ts`. It is dry-run by default, supports `--execute`, requires `--commit --confirm-commit` for PHP writes, preserves `bunny_video_guid`, never calls Bunny delete APIs, downloads directly into the configured OneProvider root, resumes partial files with Range validation, records SHA-256/state/logs, verifies FFprobe output and HTTPS Range playback, and writes an atomic rollback mapping.
- Migration CLI strict TypeScript checking passed using the repository's existing TypeScript compiler with a temporary type declaration only for the not-yet-installed `mysql2` dependency; the declaration was removed. Runtime CLI, MySQL integration, Bunny API, FFmpeg and playback checks were not executed because the required dependency/runtime/credentials/endpoints are not available locally.
- OneProvider deployment templates were added under `app/azmigrantat-video-service/deploy/` for API/worker systemd units and an Nginx HTTPS/range-delivery example. They were not copied, enabled or validated on the server.
- Latest OneProvider read-only audit via SSH alias `oneprovider-video` confirmed `/dev/sdb1` mounted as ext4 at `/srv/azmigrantat-video` with approximately 1.8 TiB available. Redis 7.0.15 is enabled/active, returns `PONG`, protected mode is enabled and it listens only on `127.0.0.1:6379`/`[::1]:6379`. Nginx 1.24.0 is enabled/active; syntax is known to require the privileged `sudo nginx -t` check. Node.js/npm and Docker are absent. FFmpeg/FFprobe 6.1.1 and `redis-cli` are present. No `azmigrantat-video` systemd units are installed, no application Nginx site is enabled, and the storage root is still `root:root` without the service subdirectories. `sudo` requires an interactive password; no server mutation was performed.
- Project compatibility review: `app/azmigrantat-video-service/Dockerfile` targets Node 24, while `package.json` has no `engines` field and no committed `package-lock.json`. The recommended runtime is the current Node 24 LTS line (pin an exact patch in deployment); install it only after review using a signed official Node distribution/repository and interactive `sudo`, then generate and commit a lockfile before using deterministic production installs. Keep the systemd templates' `/usr/bin/node` path aligned with the chosen installation.
- Deployment-readiness checkpoint: before installation, obtain the operator's approval for the service account, `/srv/azmigrantat-video/{private,public,state,logs}` ownership, Node 24 installation, package build, unit installation and Nginx site/TLS configuration. Keep secrets in root-owned `/etc/azmigrantat-video/video-service.env` with mode `0640`, outside Git; do not set `VIDEO_STORAGE_PROVIDER` or run migrations. Real FFmpeg/Redis/TUS E2E still requires the deployed service, a non-production HTTPS/TUS endpoint, test tokens and representative media fixtures.
- Deployment task status: official Node.js sources currently list `24.22.1` as the Node 24 LTS release. The local workstation has Node `24.19.0`/npm `11.17.0`, but the service still has no `package-lock.json`. The requested server installation was intentionally paused before any privileged action because `sudo` requires an interactive password; exact manual commands are provided in the task report. No SSH, firewall, disk, production database, Bunny or provider configuration was changed.
- Deployment recheck: local `package-lock.json` is now present, `npm ci --dry-run` reports the dependency tree is reproducible, and `npm run build` succeeds. OneProvider reports Node `24.22.1`, npm `11.19.1`, Redis `PONG`, FFmpeg/FFprobe `6.1.1`, Nginx `1.24.0`, and the ext4 mount at `/srv/azmigrantat-video`. The application directory, env directory, storage subdirectories and systemd units do not yet exist on the server. The deployment remains paused before sudo-required changes.
- Deployment template correction: the server's Node binary resolves to `/usr/local/bin/node` (`/opt/node-v24.22.1-linux-x64/bin/node`), while `/usr/bin/node` is absent. Both local systemd templates now use `/usr/local/bin/node`; validate them with `systemd-analyze verify` after manual installation.
- OneProvider local E2E checkpoint: API, worker and Redis are active; `/health` returns success; `/srv/azmigrantat-video` is mounted; Redis processing/processing/dead-letter lists are empty; and an invalid TUS token is rejected with HTTP 401. A valid token could not be generated because the service has no token-minting endpoint and `VIDEO_SERVICE_TOKEN_SECRET` is stored in a root-only env file inaccessible to the SSH account. No secret was read, logged or changed, and no synthetic upload was started.
- Secure synthetic E2E tooling: added `src/synthetic-e2e.ts` and `tests/synthetic-e2e.test.ts`. The CLI reads a protected env file in memory, issues a five-minute synthetic HMAC token for reserved non-user IDs, creates a five-second FFmpeg MP4, runs TUS POST/HEAD/PATCH/complete, polls the owned state file through `ready`, verifies output/thumbnail/FFprobe and optional Range playback, records processing time, and removes only exact synthetic paths after success. It never prints the token/secret and does not expose a token endpoint.
- Synthetic E2E regression fix: the CLI's offset-recovery request omitted `method: 'HEAD'`, so Node `fetch` sent `GET`; the API correctly returned 405 without `Upload-Offset`, producing the misleading offset-0 error. The CLI now sends an explicit HEAD request and reports status/header values on failure. The API/TUS authentication and ownership logic was unchanged.
- Synthetic worker failure diagnosis: the OneProvider dead-letter record for upload `60e77ad5-1a81-4781-b9a7-895e7902fe03` contained only the safe reason `Processed output failed playback compatibility verification.` after three attempts. FFprobe reports MP4 as the alias list `mov,mp4,m4a,3gp,3g2,mj2`; `processing.ts` previously selected only `mov`, so valid MP4 output was rejected. Format normalization now recognizes `mp4` anywhere in the alias list. Worker failures now persist `failureReason` in the owned state JSON and emit a structured, secret-free journal message for every attempt; the synthetic CLI includes the recorded reason on failure.
- HTTPS/playback readiness checkpoint: read-only audit shows API `127.0.0.1:3100`, Redis loopback-only, HTTP `:80` active, no `:443` listener, no application Nginx site enabled, and no Certbot installed. The existing Nginx template has the correct localhost upstream and private/public storage boundary, but still uses the placeholder hostname/certificate paths and needs an explicit CORS allowlist, `Authorization` forwarding, read-only public locations, and a real domain before activation. No DNS, firewall, Nginx, certificate or public-service change was made.
- Required DNS/TLS decision: choose a real hostname such as `video.<approved-domain>`; add `A video.<approved-domain> -> 89.163.135.113`. Add an `AAAA` record only after a verified server IPv6 address is available; do not invent one. A restrictive `CAA` record allowing `letsencrypt.org` is optional if the domain has existing CAA policy. HTTP-01 issuance requires the hostname to resolve and TCP 80/443 to be approved separately; use controlled webroot ACME issuance rather than an automatic Nginx rewrite.
- Playback contract: after certificate/domain validation, set `VIDEO_SERVICE_PUBLIC_URL=https://video.<approved-domain>` in the root-owned service env file. Worker-generated URLs then use `/videos/{video_id}/{upload_id}.mp4` and `/thumbnails/{video_id}/{upload_id}.jpg`; `private/`, `state/`, `logs/`, Redis and the Node listener remain non-public. Validate HTTPS, authentication, MIME, CORS allowlist and `206 Content-Range` before any mobile or Bunny/provider change.
- Production Nginx template prepared at `app/azmigrantat-video-service/deploy/nginx/video.azmigrantat.com.conf.example`. It uses the issued Let's Encrypt paths, preserves HTTP-01 challenge handling, redirects HTTP to HTTPS, forwards TUS/Authorization headers with buffering disabled, keeps `/health` local-proxied, exposes only read-only finalized artifacts with Range/cache/MIME headers, denies private/state/log paths, and uses an exact-origin CORS map. It remains a review-only template; `nginx -t`, install, reload and public tests are pending manual approval.
- Final template review corrections: explicit `proxy_pass_header` directives preserve TUS/Location response headers; upstream CORS headers are hidden before the single Nginx CORS policy is added; public locations no longer use `^~` so hidden-file deny rules can apply; `disable_symlinks if_not_owner` limits alias traversal. Deployment documentation now requires service-owner plus Nginx-group read permissions only on the public tree, with no Nginx access to private/state/logs.
- PHP/OneProvider integration review: `DedicatedVideoProvider` generates the same HS256/base64url claims consumed by Node (`upload_id`, `user_id`, `video_id`, `exp`, `max_size`, `mime_type`); callback signatures match Node's `timestamp.body` HMAC-SHA256 headers; factory preserves Bunny default and stored-provider routing; mobile Dedicated sessions carry the HTTPS endpoint and TUS token. PHP runtime/vendor and Docker socket are unavailable locally, so PHP tests and migrations were not executed. The PHP and Node env examples now use `https://video.azmigrantat.com`; Node must also set `VIDEO_SERVICE_PUBLIC_URL` and its PHP callback URL before callbacks can promote `ready`.
- Integration blocker: PHP `DedicatedVideoProvider::delete()` calls `DELETE /v1/uploads/{id}`, but the current Node TUS service intentionally exposes no DELETE endpoint. Do not activate Dedicated deletion until an authenticated deletion contract is separately approved/implemented; do not replace it with an unauthenticated workaround.
- Mobile package has `npm run lint`; TypeScript build/test setup for `app/chat-app/src` is not present as a dedicated script.
- Realtime/media-node tests exist but are explicitly out of scope and must not be changed for this work.

## Next concrete implementation task

### Dedicated Video Deletion Contract (completed locally)

- Added a separate delete-only HMAC contract (`AZM_ADMIN`, `action=delete`, `provider=oneprovider`) shared by PHP and Node; upload tokens are rejected by the delete route.
- Added authenticated `DELETE /v1/uploads/{upload_id}` with owner checks for `user_id`, `video_id`, `upload_id` and provider identity.
- Added a tombstone-before-cleanup flow and exact rooted paths for original, processing, public MP4, thumbnail, state and callback artifacts. Repeated valid deletes return `204` without widening access.
- Added filesystem locks shared by PATCH, complete, worker processing and delete, plus a worker guard for `deleting`, so a queued job cannot publish after deletion.
- Added Node regression tests for success, tombstone/idempotent repeat, foreign video, expired token and upload-token rejection. PHP contract assertions were extended but PHP runtime execution remains subject to the existing environment limitation.
- No production service, database, Bunny integration, mobile app or secrets were changed.

### Dedicated DELETE deployment preparation (completed locally/read-only remotely)

- Full Node build and normal local test execution passed: 21/21 tests.
- PHP/Node contract review confirms identical HS256/base64url signing inputs, `AZM_ADMIN` header, `action=delete`, `provider=oneprovider`, and owner-bound identifiers. Node now validates the admin header as well as the signature and claims.
- Added coverage for wrong token header, worker skip of `deleting` jobs, active mutation locking, tombstone/idempotent deletion and exact artifact cleanup.
- Added `--delete-after-ready` to the protected synthetic E2E CLI. It performs upload → ready → authenticated DELETE and verifies state, source, public MP4 and thumbnail are gone; the tombstone is intentionally retained.
- Read-only OneProvider audit confirms the current service is healthy and the mount is `/dev/sdb1`, but the deployed `dist/` is an older build without `admin-token.js`; no remote update was made. Public tree has `azmigrantat-video:www-data` access while private/state/logs remain service-owned.
- Added staged release, preflight, activation and rollback commands to `app/azmigrantat-video-service/deploy/README.md`. Activation remains manual and requires operator approval.

### Dedicated DELETE release staging (completed; activation pending)

- Built release `azmigrantat-video-service-20261022224228` and archived only `dist/`, `package.json` and `package-lock.json`; no `.env`, credentials or storage were included.
- Copied the archive to OneProvider and verified SHA-256 on both sides: `341dc9defe764229afb9eec35672ad3a70a6a4a96ee90c7f07c7789e50d7fc2c`.
- Created a non-privileged backup archive of the current release at `/tmp/azmigrantat-video-service-current-20261022224228.tgz`; SHA-256 `d3ecb881eb4ec2b6935768dc09456e9ddcf17ccf7b9b873d67c29394a91d71c6`.
- OneProvider preflight confirms Node `v24.22.1`, npm `11.19.1`, Redis `PONG`, FFmpeg/FFprobe `6.1.1`, `/dev/sdb1` mounted at `/srv/azmigrantat-video`, and correct systemd Node path `/usr/local/bin/node`.
- Current remote build is still active and lacks `dist/admin-token.js`; the new release is uploaded but not extracted, activated or restarted. The protected env file could not be read by the SSH account, as expected.

### PHP ↔ OneProvider integration preparation (completed/read-only)

- Verified `DedicatedVideoProvider`: PHP upload tokens use the same HS256/base64url payload contract as Node, DELETE uses a separate `AZM_ADMIN` secret, and Bunny remains the default for new uploads.
- Verified callback route `/internal/video/dedicated/callback` and timestamp/body HMAC validation. The intended Node callback URL is `https://users.azmigrantat.com/internal/video/dedicated/callback`.
- Confirmed `VIDEO_SERVICE_PUBLIC_URL=https://video.azmigrantat.com` in the examples and documented protected env-file configuration for PHP and Node; no secret values were read or written.
- Reviewed the provider-neutral migration without executing it. Production database state remains unverified because no PHP/MySQL runtime or credentials were used.
- OneProvider HTTPS health and HTTP→HTTPS redirect pass. A fresh Range check is pending because the successful synthetic artifacts were deleted and the SSH account cannot enumerate the `www-data`-restricted public tree.
- Android remains a staging-only next step: keep `VIDEO_STORAGE_PROVIDER=bunny` in production, enable Dedicated only in an isolated PHP staging profile, and use a test account/video before device validation.

### PHP staging environment (completed analysis; execution blocked)

- `auth/composer.json` requires PHP 8.4-compatible Composer dependencies, and `auth/Dockerfile` already defines an isolated PHP 8.4 CLI image with Composer 2 and required extensions.
- Local Linux has no `php`, no `composer`, and no `auth/vendor`; Docker client exists but the daemon is inaccessible because `/var/run/docker.sock` is owned by `nobody:nogroup` and the current user lacks permission. No socket permissions were changed.
- The repository contains `auth/composer.lock` and a separate local MySQL service in `docker-compose.yml`; the proposed staging database must use a new Compose project/volume and non-production credentials.
- PHP provider, routing and migration tests are prepared but not executed. No production migration or database connection was attempted.
- Staging callback target is `https://users.azmigrantat.com/internal/video/dedicated/callback`; matching upload/admin/callback secrets must be injected only into protected staging env files.
- OneProvider HTTPS health and redirect pass. Range validation needs one retained synthetic artifact or a staging upload before cleanup; the previous successful E2E intentionally removed its files.

### PHP 8.4 staging tests (completed locally in isolated Docker)

- Built `azmigrantat-auth-staging:php84` from `auth/Dockerfile`; Composer installed dependencies from the committed lockfile.
- Started a separate Compose project `azmigrantat-staging` with a new MySQL 8.4 container and volume; existing Compose containers/volumes were not used or modified.
- Ran all project migrations only against the new staging database. Phinx status reports every migration up, including `20261022000000_add_provider_neutral_video_metadata`; schema verification confirmed provider-neutral and existing thumbnail/file-size columns.
- PHP tests passed: `DedicatedVideoProviderTest.php`, `VideoProviderRoutingContractTest.php`, and `VideoMetadataMigrationTest.php`.
- The first provider test run exposed an invalid test fixture: the model had no fillable ID and was not marked persisted. The fixture was corrected with an explicit synthetic `id` and `exists=true`; provider production validation was not weakened.
- Node suite passed 21/21. Cross-runtime tests passed: PHP upload token was accepted by Node, and Node callback HMAC was accepted by PHP, without printing tokens or secrets.
- Full PHP↔OneProvider HTTP flow and Android flow remain pending because no isolated PHP staging HTTP endpoint/callback host and test user session have been configured. Production Bunny remains unchanged.

### Staging PHP API and OneProvider integration (partial; production-safe)

- Built and started `azmigrantat-auth-staging-api` from the staging image, connected only to the separate `azmigrantat-staging` MySQL network and bound to loopback `127.0.0.1:8082`.
- Staging API smoke checks passed: root HTTP response, invalid callback signature returns `401`, and unauthenticated upload creation returns `401`.
- Synthetic PHP↔Node token and callback contract checks remain passing; the staging database has all migrations applied.
- The complete real OneProvider callback flow is blocked: the loopback-only staging API is not reachable from OneProvider, and no approved HTTPS staging hostname or matching production OneProvider secret access is available. No public port, DNS, firewall or OneProvider env was changed.
- A staging test user/video and PHP-issued upload session still require an isolated authenticated test flow. Do not claim ready/playback/delete integration success until that callback path is approved and reachable.

### Private PHP ↔ OneProvider staging tunnel (plan prepared; not started)

- Local PHP staging is confirmed on `127.0.0.1:8082`; the SSH alias resolves to OneProvider as `codexadmin` on port 22.
- The safe tunnel shape is remote loopback `127.0.0.1:18082` forwarding to laptop loopback `127.0.0.1:8082`, using `ExitOnForwardFailure` and keepalives. No tunnel was started.
- Effective `AllowTcpForwarding` could not be read without sudo because the SSH account cannot read the SSH config and non-interactive sudo is unavailable. The operator must run the supplied privileged read-only command manually; no SSH configuration was changed.
- Proposed temporary callback is `http://127.0.0.1:18082/internal/video/dedicated/callback`, protected by the existing timestamp/body HMAC. This must only be configured on an isolated OneProvider staging worker/service; changing the working production callback URL requires separate approval and is not part of this step.
- Current local PHP staging uses synthetic secrets and is not compatible with the working OneProvider secrets. Generate a new staging-only triplet and inject the same values into both isolated endpoints without printing or committing them.
- E2E remains pending approval and a safe isolated remote callback target; production Bunny/provider routing remains unchanged.

### Isolated OneProvider Video Staging (templates prepared; not activated)

- Read-only OneProvider audit confirms production API remains on `127.0.0.1:3100`, Redis is loopback-only, the production mount is `/srv/azmigrantat-video`, and no staging paths or listeners exist.
- Added separate staging env example with API `127.0.0.1:3101`, root `/srv/azmigrantat-video-staging`, Redis key `azmigrantat:video:staging:processing`, callback tunnel URL and empty public playback URL.
- Added separate staging API/worker systemd templates using a distinct service account, `RequiresMountsFor`, `ProtectSystem`, `NoNewPrivileges` and staging-only `ReadWritePaths`.
- Added manual preparation commands for a separate service user, storage root, env directory, release directory and `systemd-analyze verify`; nothing was copied, enabled or started remotely.
- The staging PHP container is on the laptop Compose network and currently points at the production video hostname; it has not been changed to staging port `3101` because no staging service is active yet.
- Full PHP→staging OneProvider E2E remains pending: the SSH tunnel is available, but the isolated remote service, matching staging secrets and staging playback route still require operator approval.
- The safe two-way topology is documented: remote reverse `18082 → laptop:8082` for callbacks plus local `13101 → remote:3101` for PHP-to-video traffic; PHP staging should use the existing isolated bridge gateway, with host networking only as a reviewed fallback, never the production HTTPS service.

### Isolated staging deployment preparation (release staged; activation pending)

- Built staging release `azmigrantat-video-service-staging-20261022231621` and uploaded the secret-free archive to OneProvider `/tmp`.
- Local and remote SHA-256 match: `e13d108098860506b6209b53cfc938936e2e53d500d3aef86e65f33d18ebb692`.
- Confirmed the existing PHP container is bridge-networked with host port `127.0.0.1:8082`; it cannot use host `127.0.0.1:13101` directly. The preferred solution is an SSH local forward bound to the bridge gateway; host networking remains a reviewed fallback only.
- No remote staging user, directory, env file, systemd unit or service was created because those steps require sudo. Production units/storage/API remain unchanged.
- Staging playback remains intentionally unconfigured; `VIDEO_SERVICE_PUBLIC_URL` must not point at production Nginx/storage. A separate loopback playback route is required before claiming playback/Range success.

### Isolated staging deployment preflight (completed locally/read-only remotely; activation pending)

- Read-only audit after release upload confirms `/srv/azmigrantat-video-staging`, `/opt/azmigrantat-video-service-staging`, its env directory, staging units and port `3101` do not yet exist on OneProvider; production remains on `/srv/azmigrantat-video`, `127.0.0.1:3100` and its existing Redis namespace.
- Added `deploy/nginx/video-staging-loopback.conf.example`, which serves only staging `public/videos` and `public/thumbnails` on `127.0.0.1:3102`, supports Nginx Range handling, and denies private/state/logs/hidden paths. It is not installed or reloaded remotely.
- Corrected the staging deployment guide to prefer the existing isolated Docker bridge with SSH forwards bound to its gateway, instead of host networking. Host networking is documented only as a reviewed fallback if a gateway bind is impossible; no bind was opened broadly.
- Documented service-user isolation checks, systemd filesystem restrictions, separate Redis processing/lease/retry/dead-letter keys, filesystem callback outbox/delivered paths, independent staging secrets and service-owned npm cache to avoid `EACCES`.
- No staging service, secret, Nginx config, tunnel, production service or production data was changed. The release remains uploaded but inactive.
- Activation preflight was repeated: local/remote release SHA-256 is `e13d108098860506b6209b53cfc938936e2e53d500d3aef86e65f33d18ebb692`; Docker bridge gateway is `172.29.0.1`; remote Node/Nginx/systemd versions are available; non-interactive sudo is unavailable. Secret-free systemd and Nginx templates were copied to remote `/tmp` only. Manual sudo activation remains blocked pending operator execution.
- A restricted `sudo -n /usr/local/sbin/azmigrantat-staging-control` helper is available for staging `status/start/stop/restart/logs` only. It was used for `status` and correctly reported that units are not installed; it was not used to bypass installation or touch production.

### Fixed staging deployment helper (prepared; not installed)

- Added `deploy/sbin/azmigrantat-staging-deploy`, a fixed root-owned helper with only `install`, `verify`, `status`, `start`, `stop`, `restart` and `rollback` actions.
- The helper pins the release SHA-256 plus SHA-256 values for the systemd/Nginx inputs, reads only root-owned inputs under `/var/lib/azmigrantat-video-staging/inputs`, rejects links/traversal archive members, uses only fixed staging paths/units, enforces protected env permissions and denies production storage access. It does not generate, print or modify secrets and has no self-update action.
- Prepared exact root installation and argument-specific sudoers instructions. The helper has not been installed or granted sudo permission on OneProvider.
- The existing restricted control helper remains unchanged; no production command is included in either sudo rule.
- Security audit finding: a Redis key prefix is logical isolation only. The current `redis://127.0.0.1:6379` arrangement does not cryptographically prevent a compromised staging process from addressing production keys; a separate Redis instance or ACL key-pattern isolation is required before claiming strong Redis isolation.
- Final helper audit: fixed-input hashes, root-owned input requirements, archive type/path checks, duplicate env-key rejection, fixed PATH, non-root npm/Node execution, root-owned units, exact rollback paths and argument-specific NOPASSWD sudoers syntax all pass static review. Helper remains uninstalled; shared Redis is the only unresolved isolation finding.

### Redis staging isolation (prepared; not activated)

- Added a dedicated Redis configuration and systemd unit on loopback `127.0.0.1:6380`, with separate Redis user, data directory, persistence files, ACL file and Unix socket path.
- Added ACL support for `redis://azmigrantat-staging:<separate-secret>@127.0.0.1:6380`; the Node Redis adapter now supports ACL usernames and passwords while preserving unauthenticated Bunny/default compatibility.
- The helper now pins the Redis unit/config hashes, creates the Redis service account, generates the ACL file without printing its secret, and refuses the shared production `6379` URL.
- Production Redis remains unchanged. A residual OS-level limitation remains: without production Redis ACL/firewall/cgroup changes, a compromised local staging process could still open a raw connection to production `127.0.0.1:6379`; this requires separate approval if absolute port-level denial is required.
- Final local audit found and corrected a stale API-unit hash in the helper; the helper SHA-256 is now `c2b22343c02f1971e4c79f1cabf3b79adcc203b524ab92944ef359a42410c874`. The corrected helper has not been installed remotely or activated.
- Final pre-activation read-only check confirmed all release/template inputs on OneProvider; the corrected helper was refreshed only in `/tmp` and now matches `c2b223…`. Staging paths/listeners remain absent; production remains on `127.0.0.1:3100` and Redis `6379`.
- Deployment preflight found a 65-character worker SHA pin in the helper; corrected it to the actual 64-character SHA-256. The new helper SHA-256 is `353e5b1b6d1629cb736ee7f66995cda9c6449b679ce84ba1aaad140e727d1c8f`.
- Staging install then exposed that the server's pinned Node/npm binaries are under `/usr/local/bin`; the helper PATH was corrected to include only that fixed directory. Install remains in progress and services are not yet started.
- The staged npm install exposed npm 11's cwd requirement when using `--prefix`; the helper now enters its fixed, hash-validated extraction directory before `npm ci`. No untrusted input is used as a command or path.
- The final npm diagnostic found the fixed extraction directory retained `mktemp` mode `0700` after root ownership was applied; the helper now sets only that directory to `0755`, while keeping release files root-owned and `node_modules` service-owned.
- First staging start exposed a permissions issue: Redis could not traverse the shared env directory. The helper now keeps the directory root-owned `0755`; the env and ACL files retain restricted ownership/modes.
- Redis storage was kept out of the video tree after the first start exposed parent-directory traversal restrictions; staging Redis now persists under `/var/lib/azmigrantat-video-staging-redis`, while video `private/state/logs` remain inaccessible to the Redis user.
- The Redis unit's `ProtectSystem=strict` write allowlist was updated to the new `/var/lib/azmigrantat-video-staging-redis` path; it remains staging-only.
- The staging ACL key rule was found to contain a typo (`azmigrant` instead of the real `azmigrantat` namespace), which caused authenticated queue commands to return `NOPERM`; the minimal fix is to generate only the four exact `azmigrantat:video:staging:processing...` keys.
- Staging Redis was reloaded with the corrected ACL and the worker remains active; the first post-fix E2E reached playback but exposed a separate public-file group ownership issue. The next staging release sets the service primary group to `www-data` and explicitly applies `chown`/`0640` to finalized public MP4/JPEG files.
- The permission-fix release passed the isolated synthetic flow: TUS `201/200/204/200`, Redis queue processing, FFmpeg `ready`, 5-second H.264/AAC metadata, thumbnail, playback Range `206`, and authenticated DELETE `204` with artifact removal. This does not claim PHP callback delivery: the configured temporary callback tunnel on OneProvider `127.0.0.1:18082` was not listening during the test.
- The staging helper status check was hardened to normalize Redis CLI CRLF output before checking `aof_enabled:1`; this is diagnostic-only and does not broaden Redis ACLs.
- Temporary reverse SSH callback tunnel was started: OneProvider `127.0.0.1:18082` → laptop PHP staging `127.0.0.1:8082`. Docker bridge forwards `172.29.0.1:13101`/`:13102` reach staging API/playback from the PHP container; no public ports were opened.
- PHP staging HMAC upload/callback/admin secrets were regenerated as a separate triplet and synchronized over SSH to the isolated PHP/OneProvider staging services; values were not logged or committed.
- Fixed PHP Dedicated creation for legacy non-null Bunny columns, added callback width/height metadata persistence, and made `upload-complete` monotonic so it cannot downgrade terminal `ready`/`failed`/`deleted` states.
- PHP staging integration passed for a synthetic video: PHP session `201`, TUS `POST 201`, `HEAD 200` offset `0`, `PATCH 204`, `complete 200`, PHP upload-complete `200`, signed callback to `ready`, playback Range `206`, and authenticated PHP DELETE `200`; database and synthetic artifacts were cleaned.
- A follow-up active-worker regression exposed an unresolved scheduling issue: some jobs disappear from the Redis ready list without `state` moving beyond `queued`, while restarting the staging worker can recover a queued job. No production service/data was affected; Android testing remains blocked until this is diagnosed.
- Redis queue ACL uses only `@list` and `@sortedset` command categories plus `PING`/`INFO`, still constrained by the exact staging processing-key prefix.
- Redis queue ACL additionally includes `@read` and `@write` for Redis 7 command compatibility; `@admin`/`@dangerous` and non-staging key patterns remain excluded.
- The ACL now lists the four concrete queue keys explicitly: base, processing, retry and dead-letter.
- Staging deployment reached active Redis (`127.0.0.1:6380`, AOF) and API (`127.0.0.1:3101`, health OK); the worker remains stopped after a reproducible Node RESP `NOPERM` on queue keys despite authenticated Redis CLI access. Do not claim E2E success or remove temporary admin access until this ACL/client discrepancy is resolved.
- Local TypeScript build and Node suite pass after ACL support: 23/23 tests. No remote Redis configuration or service activation was performed.
- Final read-only preflight confirms the queue keys are exactly the staging base plus `:processing`, `:retry` and `:dead-letter`, all matched by `~azmigrant:video:staging:*`; callback outbox/delivered state remains filesystem-only. OneProvider still has no staging inputs/env/units/listeners, so helper activation is pending the one-time root-owned input/secret setup.

Task 8: complete Android/iOS device validation and decide/implement a supported native background-upload strategy where JavaScript TUS cannot guarantee continuation.

### Active-worker scheduling diagnosis and staging integration (completed 2026-10-25)

- Root cause was confirmed in `src/worker.ts`: when the TUS `complete` handler still held the upload process lock, the already-running worker claimed the Redis job, failed to acquire that lock, and acknowledged the lease. This removed the job from Redis while the state remained `queued`; a worker restart later recovered the queued state. The evidence was reproduced with an active worker and matched the code path; it was not an FFmpeg, ACL, permissions or callback failure.
- Applied the minimal fix: lock contention is logged as a non-secret `video_processing_deferred` event and the lease is retried/requeued instead of acknowledged. No production queue, API or storage was changed.
- Added a regression test for a job arriving while the completion lock is held. Local TypeScript build passed and the Node suite passed 24/24. Two sequential synthetic uploads were processed to `ready` by the same running staging worker, with Range `206`; the worker stayed active and all staging queue lengths returned to zero.
- Deployed the staging-only release `azmigrantat-video-service-staging-20261025200856` after SHA-256 verification; the previous release remains at `/opt/azmigrantat-video-service-staging.rollback-20261025200856`. Staging API/worker/Redis remained isolated and active; production API/worker remained active.
- Repeated the complete isolated PHP staging flow successfully: PHP session `201`, TUS `POST 201`, `HEAD 200` offset `0`, `PATCH 204`, `complete 200`, signed callback to PHP `ready`, PHP upload-complete `200`, playback `200`, Range `206`, thumbnail `200`, PHP authenticated DELETE `200`, and final playback `404`. PHP staging records and all identified synthetic files were cleaned.
- Android device validation was not run: `adb devices -l` returned no attached devices. The next task is to execute the Android staging upload/resume test with a connected development device; no production provider switch is authorized.

### Android staging upload validation preparation (2026-10-25)

- Reviewed the Android Dedicated path: Android uses `BunnyNativeUpload.startDedicatedUpload`, a `FOREGROUND_SERVICE_TYPE_DATA_SYNC` service, HEAD-based offset recovery, TUS PATCH retry on network errors/409, SecureStore-only resumable URL state, token refresh through PHP, and cancellation through the authenticated DELETE URL.
- `npx tsc --noEmit` passed for the mobile app. A local debug APK was compiled successfully at `app/chat-app/android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `4b92fd7cb19ceabfa5cdfe84f49b44c50cc6febef2c895f8344a5d14f20da1c9`). It was not installed because no device is attached.
- `adb devices -l` returned no devices. Background, network interruption, process-death, logout/account-switch and real playback checks therefore remain unexecuted.
- The current PHP staging container returns the Docker-bridge OneProvider upload endpoint (`172.29.0.1:13101`), which is reachable from PHP but not directly from a USB Android device. Before device testing, provide a staging-only device-reachable endpoint (for example a restricted LAN-bound SSH forward and matching PHP staging URL); do not use production URLs or open public ports.

### Android HTTPS staging endpoint preparation (2026-10-25)

- Read-only checks confirmed the existing certificate covers only `video.azmigrantat.com`; it must not be reused for staging. OneProvider has no separate staging hostname or tunnel runtime configured.
- Added `deploy/nginx/video-staging-https.conf.example` for a future `video-staging.azmigrantat.com` host. It keeps Node on `127.0.0.1:3101`, preserves TUS authorization/headers and streaming behavior, serves only staging public files with Range support, and denies private/state/log paths. It is not installed or activated.
- PHP staging currently contains `VIDEO_SERVICE_URL=http://172.29.0.1:13101` and `VIDEO_SERVICE_PUBLIC_URL=http://172.29.0.1:13102`. These are internal Docker/SSH addresses and are not valid Android URLs. The intended staging values after HTTPS activation are both `https://video-staging.azmigrantat.com`.
- A separate protected HTTPS route is also required for the PHP staging API (for example `users-staging.azmigrantat.com` through an approved access-controlled tunnel); pointing the APK at production `users.azmigrantat.com` is not allowed.

### Staging DNS/TLS preflight (2026-10-25)

- `video-staging.azmigrantat.com` resolves directly to `89.163.135.113`; the public hostname currently reaches the OneProvider Nginx/default route and returns staging health/TUS OPTIONS, but presents the production certificate for `video.azmigrantat.com`. A separate certificate and HTTPS server block are still required.
- `users-staging.azmigrantat.com` resolves through Cloudflare to `172.67.199.106`/`104.21.84.244`; HTTPS currently serves an unrelated WordPress origin (`jump21.jumptestsite.com`), not the PHP staging API. No PHP-origin vhost or certificate was changed.
- Android validation is blocked until the PHP staging hostname is routed to the isolated PHP staging API and both hostnames have verified TLS/SNI. Production PHP, Bunny Stream and production video services remain unchanged.

### cPanel/AutoSSL and OneProvider certificate preflight (2026-10-25)

- cPanel HTTPS login is publicly reachable on port 2083 for the existing domain/origin, but no account login or write operation was attempted. This confirms only that cPanel may be available; it does not confirm PHP 8.4, Composer, extensions, document-root isolation or staging database availability.
- Because `users-staging.azmigrantat.com` is Cloudflare-proxied and currently serves an unrelated WordPress origin, the cPanel operator must first create an isolated staging subdomain/document root and bind it to the PHP staging application. AutoSSL must be issued for that hostname only; the global Cloudflare SSL mode must not be changed.
- OneProvider has Certbot 2.9.0 and `nginx -t` passes. No `video-staging.azmigrantat.com` certificate or public staging server block exists yet. The existing `video.azmigrantat.com` certificate remains untouched.

### cPanel staging application preflight (2026-10-25)

- `auth/composer.lock` dependencies require PHP 8.2 or newer at the strictest package constraints, so PHP 8.3 is version-compatible in principle. Runtime verification is still required for `curl`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql` and `zip`; local PHP/Composer are not installed.
- The repository's Docker baseline uses PHP 8.4 CLI with the required extensions; this is a reference environment, not proof that the cPanel 8.3 account has the same extensions or Composer support.
- The existing SSH alias `azmigrantat-shared` did not complete a non-interactive connection within the timeout; no SFTP/deployment access was established and no files were uploaded.
- The new staging hostname resolves through Cloudflare and currently returns HTTP 404 from the cPanel/hosting edge. It does not yet expose the PHP API or callback route.
- The intended document root remains `/home/azmigran/users-staging.azmigrantat.com`, but the PHP application's non-public code, `.env`, storage and vendor files must remain outside the public web root or be denied explicitly.

### PHP staging deployment and OneProvider HTTPS (2026-10-25)

- cPanel UAPI confirmed the staging document root is `/home/azmigran/users-staging-app/public`; production document roots were not changed.
- Created isolated cPanel database `azmigran_auth_staging` and user `azmigran_auth_staging`; the generated password remains only in protected Jump.bg files and the staging `.env`.
- Deployed the PHP application and Composer lock dependencies to `/home/azmigran/users-staging-app`; PHP 8.3.36, Composer 2.9.5, `composer check-platform-reqs`, and 247 PHP syntax checks passed.
- Ran all Phinx migrations against the empty `azmigran_auth_staging` database only. No production database was used.
- Created a staging `.env` with `VIDEO_STORAGE_PROVIDER=oneprovider`, `VIDEO_SERVICE_URL` and `VIDEO_SERVICE_PUBLIC_URL` set to the HTTPS staging video host, plus synchronized staging-only HMAC secrets. Production Bunny configuration remains unchanged.
- OneProvider now serves a dedicated Let's Encrypt certificate for `video-staging.azmigrantat.com`; HTTPS health and TUS OPTIONS pass. The PHP staging public cPanel vhost still returns LiteSpeed 404 externally despite the correct UAPI document root; cPanel/hosting vhost refresh or support action is required before public PHP integration.

### LiteSpeed document-root probe (2026-10-25)

- A unique temporary marker in the original `/home/azmigran/users-staging.azmigrantat.com` directory was not served publicly or through direct origin/SNI; it returned the same LiteSpeed 404. The marker was removed immediately.
- A symlink or wrapper in the original directory cannot safely solve the issue because the request is rejected before either candidate filesystem root is reached. No symlink was created and no public application files were copied into the old root.
- The remaining action is a cPanel/Jump.bg LiteSpeed vhost refresh/rebuild for the existing `users-staging.azmigrantat.com` domain, after which `/home/azmigran/users-staging-app/public` can be retested.

### PHP staging subdomain recreation preparation (2026-10-25)

- Created a protected pre-change backup at `/home/azmigran/staging-backups/20261025T202504Z`; SHA-256 verification passed. The old staging installation and configuration remain intact.
- Confirmed `azmigran_auth_staging` and `azmigran_auth_staging` exist; the staging DB connection succeeds and contains 32 migrated tables. Neither production database was changed.
- Before cPanel recreation, UAPI still reports the old document root `/home/azmigran/users-staging.azmigrantat.com`. No deletion or recreation was performed by Codex.
- Deployment is paused until the operator recreates the subdomain with document root `/home/azmigran/users-staging.azmigrantat.com/public`; the target must be verified via UAPI before moving any files.

### Staging HTTPS and E2E validation (2026-10-25)

- Jump.bg corrected the staging directory group. PHP HTTPS now reaches the application: the homepage redirects to login, invalid mobile login returns `422`, and an invalid Dedicated callback returns `401`.
- `.env` returns `403`; `vendor`, `app` and `storage` paths do not expose application files. OneProvider staging TLS is valid through January 23, 2027; `/health` returns `200` and TUS `OPTIONS` returns `204`.
- The synthetic OneProvider E2E passed after the CLI learned to retry only transient `409 Upload is busy` responses while the worker releases its final processing lock. TUS returned `201/200/204/200`, FFmpeg reached `ready`, metadata and thumbnail were verified, Range returned `206`, DELETE returned `204`, and exact synthetic artifacts were removed. Local Node tests are `25/25`.
- The full PHP-authenticated flow is blocked because the isolated staging DB has no active public OAuth mobile application; synthetic registration returns `401`. No staging user/video was created. An operator must provision an isolated staging OAuth application/test profile before PHP callback ownership and Android login can be tested. Production Bunny, PHP and databases remain unchanged.

### Staging OAuth and PHP integration attempt (2026-10-25)

- Created an isolated active public OAuth application in the staging database
  through the existing `OauthApp` model. Its client type is `public`, it has a
  unique staging-only client ID, and no client secret. Production OAuth data was
  not copied or changed.
- Added ignored Android staging configuration at
  `app/chat-app/.env.staging.local` with the staging API, video host and public
  client ID. The production `.env` remains unchanged.
- The PHP flow passed registration and TUS session creation, but the video did
  not reach `ready` within the polling window. OneProvider logged a temporary
  upload-lock deferral; callback tunnel reachability itself returns the expected
  `401` for an unsigned probe. The run is therefore not marked successful.
- Synthetic users, video records and temporary category were removed; a direct
  staging DB check returned zero matching records. Android/device validation
  remains pending and no device test is claimed.

### PHP staging move after cPanel recreation (2026-10-25)

- UAPI now confirms the recreated subdomain document root is `/home/azmigran/users-staging.azmigrantat.com/public`.
- A temporary static marker was served successfully both through Cloudflare and direct origin, then removed.
- The application was copied (not moved destructively) from `/home/azmigran/users-staging-app` to `/home/azmigran/users-staging.azmigrantat.com`; the old installation and protected backup remain intact.
- The copied `.env`, Composer dependencies, staging DB, HMAC secrets and permissions were checked; PHP 8.3 platform requirements, 247 syntax checks and the 32-table staging DB connection pass.
- After the copy, PHP/index and API requests return LiteSpeed `404` directly at origin. The failure is now in the recreated subdomain's PHP/LSAPI/vhost handling, not the application or database. Deployment and PHP→OneProvider integration are paused until Jump.bg refreshes/enables the PHP handler for this vhost.

### PHP-created upload lock deferral diagnosis (2026-10-26)

- The worker lock-deferral path is durable: a PHP-shaped job with populated `user_id`/`video_id` is claimed, requeued with exponential retry, and processed by the same worker after the upload lock is released. Redis inspection showed no lost job; the deferral was transient.
- The actual staging blocker was the OneProvider callback destination still pointing to the obsolete loopback tunnel `http://127.0.0.1:18082`. It was corrected only in the staging worker environment to `https://users-staging.azmigrantat.com/internal/video/dedicated/callback`; production services and secrets were not changed.
- Added an explicit regression test for PHP-created jobs surviving upload-lock deferral without a worker restart. Local TypeScript build passes and the Node suite is `25/25`.
- A repeat remote PHP E2E was attempted with a synthetic five-second MP4. The first attempt was stopped by Jump.bg FFmpeg thread-resource exhaustion; the retry was rejected by the staging registration rate limiter (`429`, approximately 55 minutes remaining), so the full PHP E2E is not marked successful. The temporary account from the first attempt was cleaned by the test trap; no production data was touched.
- Android APK preparation remains gated on a complete PHP E2E and a connected device. No Android/device success is claimed.

### Staging FFmpeg resource diagnosis (2026-10-26)

- OneProvider is not resource constrained: 16 CPUs, about 62 GiB RAM available, low load, FFmpeg 6.1.1, active staging API/worker/Redis, and no worker cgroup CPU or memory cap. Its worker has `workerConcurrency` configured by the staging environment and systemd exposes no restrictive `CPUQuota`, `MemoryMax` or `TasksMax` setting.
- The observed `pthread_create() failed: Resource temporarily unavailable` occurred while the synthetic input was being generated on shared Jump.bg, not during OneProvider processing. Jump.bg is under an LVE cgroup (`/lve1346`) with shared-host resource limits; the account had eight processes and a high host load despite ample host RAM. This is an environment limitation, not a video-service worker failure.
- The safe mitigation is test-fixture-only: generate the synthetic MP4 on OneProvider or run Jump.bg FFmpeg single-threaded (`-threads 1`, bounded filter threads). No production or staging service limit was changed.
- The retry could not proceed because the PHP registration endpoint returned its existing staging protection `429` with approximately 55 minutes remaining. No registration limiter was bypassed, no existing credentials were used, and no new test data was created by that retry.

### PHP staging E2E completion (2026-10-26)

- The registration rate-limit window was verified read-only as expired. A new temporary staging profile was created through the normal OAuth registration flow; no limiter was bypassed.
- The MP4 fixture was generated on OneProvider, avoiding Jump.bg FFmpeg resource pressure. The complete flow passed: registration `201`, PHP upload session `201`, TUS `POST 201`, `HEAD 200` offset `0`, `PATCH 204`, TUS complete `200`, PHP upload-complete `200`, signed callback and PHP status `ready`, playback API `200`, HTTP Range `206`, authenticated PHP DELETE `200`, and post-delete playback `404`.
- The first post-fix attempt exposed `VIDEO_SERVICE_PUBLIC_URL=http://127.0.0.1:3102`; this was corrected only in the staging env to `https://video-staging.azmigrantat.com`, followed by a staging-worker restart. The successful rerun confirmed the public HTTPS playback URL and Range behavior.
- During the successful run the worker processed the job without another restart; API, worker and staging Redis remained active. Synthetic users, videos, category and temporary MP4 files were cleaned; final matching DB counts are zero.
- Android preparation: TypeScript validation with the staging API/video URLs and public OAuth client passed. The existing development APK remains available at `app/chat-app/android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `4b92fd7cb19ceabfa5cdfe84f49b44c50cc6febef2c895f8344a5d14f20da1c9`). No ADB device was connected, so no installation or device/background test is claimed. For this development build, staging values are injected when Metro starts rather than stored as secrets in the APK.

### Android staging device validation (2026-10-26)

- ADB found and authorized device `ZE223HTNMR` (`moto_g35_5G`, Android 15). The existing APK was installed successfully; its SHA-256 remains `4b92fd7cb19ceabfa5cdfe84f49b44c50cc6febef2c895f8344a5d14f20da1c9`.
- APK inspection confirmed the native `BunnyNativeUploadModule`/`BunnyUploadForegroundService` classes and TUS markers (`Tus-Resumable`, `Upload-Offset`, `PATCH`) are present. The APK is a development client without an embedded JS bundle, so staging URLs/client ID are supplied at Metro runtime.
- The first launch was blocked by the ignored `.env.staging.local` file being parsed as a Metro source; it was preserved at `/tmp/azmigrantat-env.staging.local.backup` and staging variables were supplied inline. Metro then bundled successfully and the app launched on the device through `adb reverse tcp:8081 tcp:8081`.
- No login, real-video upload, interruption/resume, background, cancellation or process-death test was claimed: those require interactive use of an approved staging account and a selected test video. No test records or files were created, so no cleanup was necessary. Metro was stopped after validation.
- The staging `env_variables` row for `GOOGLE_WEB_CLIENT_ID` existed but both values were empty. The Web client ID already referenced by the Android `google-services.json` was written only to staging `dev_value`; `prod_value` remained empty. A synthetic invalid-token request now reaches Google token validation (`500` generic authentication failure) instead of the previous “not configured” response. No real Google login was attempted.
- Android upload was rejected because the staging `categories` table had no active rows. Created one staging-only active category, `Staging тестови видеа` (ID 5), through the existing `Category` model; the public staging categories endpoint now returns it. Production data was not changed.
- Made video category optional end-to-end: the mobile upload screen no longer requires a selection, the PHP API accepts an omitted/null `category_id`, and stale/invalid category selections are normalized to `NULL` instead of blocking upload. The PHP controller was deployed to staging with a backup and syntax check; TypeScript validation passed. The Android app was reloaded and old logcat entries were cleared.
- Diagnosed the Android upload error `Файловото хранилище временно не е конфигурирано.` as the optional thumbnail request to the PHP Backblaze B2-only endpoint, not Dedicated TUS. Staging has `VIDEO_STORAGE_PROVIDER=oneprovider` and the Dedicated HMAC/public URL settings, but no B2 credentials. The mobile flow now skips that endpoint for OneProvider and relies on the FFmpeg worker thumbnail; TypeScript and Node tests pass, and the Android development app was reloaded.
- Android long-processing diagnosis (2026-10-26): logcat shows repeated HTTP 200 status polls approximately every 8 seconds, with no observed 401/403/404/409/429/5xx from the polling requests. Public PHP categories and OneProvider `/health` return 200. The exact video DB/queue/callback state could not be read because Jump.bg SSH port 12545 refused connections and OneProvider SSH port 22 timed out. No root cause or server-side fix is claimed until those read-only logs and DB state are available.
- SSH recheck (2026-10-26): aliases resolve to `jump21.jump.bg:12545` (`185.199.38.40`) and `oneprovider-video:22` (`89.163.135.113`). DNS is correct and raw TCP probes completed, but SSH handshakes timed out on both hosts. This is consistent with an SSH ACL/firewall/service-path issue; no SSH, firewall or key changes were made. Remote DB/Redis/worker/callback tracing remains blocked.
- Added staging-safe Android processing observability: the client logs only `video_id` and status transitions, bounds processing polling to five minutes, and shows a non-terminal “check later” error on timeout. It never changes the server video status to `failed` and does not log tokens or secrets. TypeScript and four focused unit test files pass (12 tests).
- SSH/Android follow-up (2026-10-26): both aliases resolve correctly and there are no local SSH sessions or `SYN-SENT` connections to the target ports. Direct handshakes still time out after about 8 seconds for Jump.bg `12545` and OneProvider `22`; the local ADB device is healthy. Current app logcat contains only repeated HTTP `200` polling and no new upload/TUS/video ID event, so no concrete Android video can yet be traced server-side.
- Android video lifecycle diagnosis and staging fix (2026-10-26): PHP records `video_id=6` and `video_id=7` were `processing/queued`, while OneProvider states `8ac42eb5-4a06-4915-b663-9068bc02315a` and `dc1c8046-041d-475a-affc-a9e80dcb9d3a` had `uploadOffset == uploadLength` but remained `uploading`, with no source/queue/callback artifacts. This proves the final TUS PATCH reached the service but explicit `/complete` did not complete the Node lifecycle. The staging worker also had a separate Redis ACL failure: `RPOPLPUSH`/queue claim returned `NOPERM`, which the raw RESP client treated as JSON and crashed the worker. Added staging-safe TUS auto-completion on the final PATCH and made explicit complete idempotent during queued/processing/terminal states. Local build and Node suite pass `26/26`; staging release deployed with SHA-256 `14e8c1fd2200aea36ba6861e3d929f1357879f9f0aedca14e047ade6eab2c440`. Synthetic staging E2E passed: PATCH `200` auto-complete, explicit complete `200`, queue→processing→ready, FFprobe/thumbnail, Range `206`, DELETE `204`, and cleanup. No production service or Bunny configuration changed.
- Android monitoring preparation (2026-10-26): the running Metro process has staging `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_VIDEO_SERVICE_URL` and OAuth client configuration; the upload client uses the endpoint returned by the staging PHP upload session, so no production TUS endpoint is selected by this configuration. PHP categories and OneProvider health return `200`. At the observation time no ADB device was attached and no new Android upload/video ID existed; no real-device result is claimed.

### Bunny video 78 isolated migration rehearsal (2026-10-26)

- Used a single-row allowlisted shadow table in the staging database for PHP video `78`; the real staging `videos` table remained at two rows with unchanged SHA-256, and production remained six `provider='bunny'` rows.
- Real Bunny HLS exposed two FFmpeg 6.1.1 compatibility issues. The CLI now forces the HLS demuxer for stdin and rewrites validated segment/key/map resources to local `file://` URLs. FFmpeg is restricted to `pipe,file,crypto`; it receives no Bunny URL and does not use unsupported `-max_redirects`.
- The production-like staging run passed copy-remux, identical source/published SHA-256, FFprobe H.264/AAC metadata, JPEG thumbnail, HTTPS playback and exact Range `206`. Owner `1269`, category `60`, views `242`, unique viewers `3` and Bunny references were preserved in migration state.
- Shadow-only conditional commit, idempotent repeat, `commit_pending` recovery, SIGKILL stale-lock refusal/manual dead-PID cleanup and conditional rollback passed. The shadow row matched its original Bunny snapshot after rollback.
- State/log scans found no Bunny token, signed URL or DB credential patterns. Exact test media/state/credentials/releases/table/tunnel were removed. A pre-existing unrelated staging MP4 under video directory `78` was deliberately retained.
- Local TypeScript build and all 35 Node regression tests pass. The final release candidate and future-approval-only deployment steps are documented in `docs/bunny-video-78-migration-cli-release-plan.md`; no production deployment, DB write or migration occurred.

### Bunny video 78 production dry-run (2026-10-26)

- Verified release archive SHA-256 `cea89525441028316bb9cd264050cb9a93a201715e88557933e67db2d1f3fc30` and installed it outside public/active service paths at `/opt/azmigrantat-video-migration-cli/releases/cea8952544102831`. The release is root-owned/read-only; its compiled migration module and copied dependency-tree hashes match the reviewed build and active locked dependencies.
- Ran the CLI as `azmigrantat-video:www-data` with a clean synthetic service environment, isolated `VIDEO_SERVICE_ROOT`, a read-only Bunny API key and loopback-only SSH forwarding. The temporary credential JSON and both tunnel directions were removed immediately after the run; no Bunny signing key or signed URL was transferred.
- The exact production dry-run for video `78`, owner `1269`, GUID `ba8a28ca-603b-4563-be47-3574a773d91d` returned `planned=1`, `verified=0`, `committed=0`, `failed=0`. Current row fingerprint is `5cea6d5ef63ef99d94280d8226b90a8fbf3925f26bfe985874799087894c000f` and plan fingerprint is `0f272fb97ad30922331893ed432f9c9eb14c6f3ec7c543e71a1c4a8b92877940`, matching the staging rehearsal.
- Production DB pre/post hashes match exactly; all six IDs remain `provider='bunny'`. Video 78 remains owner `1269`, category `60`, ready, with `242` views and `3` unique viewers. Public OneProvider storage remained empty and no backup/download/media file was created by dry-run.
- Existing protected six-row and full-table video backups were re-verified against their manifests. Production service/worker PIDs, invocation IDs, restart counters, active release hash and public-tree hash were unchanged.
- Secret-pattern scanning of state/inventory/mapping/log was clean. Sanitized audit artifacts were sealed root-owned/read-only with a verified SHA-256 manifest under `/srv/azmigrantat-video/private/migration-audits/dry-run-78-20261026-rc1`.
- No execute, commit, rollback, Bunny mutation, production video write, service restart or playback change was performed.

### OneProvider new-upload cutover (2026-10-26)

- Activated `VIDEO_STORAGE_PROVIDER=oneprovider` in the protected production PHP configuration after matching the PHP and video-service secret fingerprints; staging was already OneProvider-backed. Development, preview/staging and production EAS profiles all select `https://video.azmigrantat.com` for new video uploads.
- Deployed video-service release `azmigrantat-video-service-20261026-provider-cutover-rc3` (SHA-256 `4b75c8108ffc54f0b74eb9d43b26a3d4ed365cf3c0981cd81af4ebf6a519fd10`). Production and staging API/worker units are active.
- Fixed final TUS PATCH responses to return `Upload-Offset`, made completion-race checks accept queued/processing/ready, and finalized public MP4/JPEG files as `0644` while keeping the directory tree and private/state roots restricted.
- Production synthetic E2E passed create/upload/automatic completion, FFmpeg H.264/AAC processing, thumbnail, SHA-256/metadata checks, HTTPS playback, exact Range `206`, authenticated delete and exact artifact cleanup. Queue, callback-outbox and partial-file checks are empty after the run.
- Production DB audit confirmed exactly the six existing records remain `provider='bunny'`, including video `78`; its existing Bunny playback still returns Range `206`. No Bunny object was changed or deleted.
- Local verification passes: video service `37/37`, mobile `75/75`, TypeScript checks, and ESLint with zero errors (two pre-existing warnings).
- Preview EAS APK build `be0da111-faae-4e66-9f07-6db555643ea0` finished; its downloaded SHA-256 is `b2f806525e2dee222d812b5bed3394d463b396012fedc4368b7b64acdefdb070`. Installation over the currently installed debug APK is intentionally blocked by Android signature mismatch; uninstall/data loss was not authorized.
- Production EAS AAB build `1bc9068e-87d1-4cb4-8337-876fe65ca67d` finished successfully with versionCode `3`. The downloaded 137,549,406-byte artifact has SHA-256 `f365b62f1a1883815b01f5a01968b5b29efeb41f50de419576900076248d8d23`; its bundle contains the Dedicated TUS markers and the exact OneProvider URL. It was not submitted to Play Store.

# OneProvider deployment templates

These files are templates only. They have not been copied to or enabled on the
OneProvider host.

The reviewed production HTTPS template is
`nginx/video.azmigrantat.com.conf.example`. It keeps the Node API on
`127.0.0.1:3100`, forwards TUS authorization and upload headers, disables proxy
buffering for resumable uploads, exposes only finalized `videos/` and
`thumbnails/`, and returns 404 for private/state/log paths. Its CORS baseline
allows only the video origin; approved browser origins must be added explicitly.

Nginx must be able to traverse/read only the public tree. Use the service user
as owner and the Nginx worker group (normally `www-data`) as group on
`public/`, `public/videos/` and `public/thumbnails/`, with setgid directories
and `0750` directories/`0640` files. Keep `private/`, `state/` and `logs/`
owned by the service account/group with no Nginx group access. Verify the real
worker group with `nginx -T` or the installed Nginx service configuration before
applying permissions.

For the approved domain, PHP must use
`VIDEO_SERVICE_URL=https://video.azmigrantat.com` and
`VIDEO_SERVICE_PUBLIC_URL=https://video.azmigrantat.com`. Node must use the
same public URL, the same upload-token secret as PHP, the same callback secret
as PHP, and a callback URL ending in
`/internal/video/dedicated/callback`. Do not place either secret in Git.

Before activation, an operator with root access must:

1. Confirm `/dev/sdb1` by UUID and verify `/srv/azmigrantat-video` is mounted.
2. Create `azmigrantat-video` service user/group and `/opt/azmigrantat-video-service`.
3. Install the selected Node LTS, Redis, FFmpeg/FFprobe and Nginx versions.
4. Create `/etc/azmigrantat-video/video-service.env` with mode `0640`, owned by
   root and readable by the service group. Never copy `.env` or secrets into Git.
5. Copy and review the two systemd units, then run `systemctl daemon-reload`.
6. Validate `systemd-analyze verify` and `nginx -t` before enabling anything.
7. Configure DNS/TLS and obtain explicit firewall approval before exposing 443.
8. Run `/health`, a non-production TUS upload, worker processing, and HTTP Range
   checks before any Bunny migration.

Both systemd units use `RequiresMountsFor=/srv/azmigrantat-video`, so they do not
start when the video filesystem is unavailable. The API and worker use separate
processes but the same environment file and service account.

## Dedicated DELETE build deployment (manual, review-only)

The current OneProvider installation was read-only audited and is still running
an older `dist/` without `admin-token.js`. Do not overwrite it in place. Build
and stage a complete release, keep the previous directory for rollback, then
restart only after the preflight checks pass.

From the repository checkout, run:

```sh
cd /home/kristian/projects/azmigrantat/app/azmigrantat-video-service
npm ci
npm run build
release="azmigrantat-video-service-$(date +%Y%m%d%H%M%S)"
tar --exclude='node_modules' --exclude='.env' --exclude='storage' -czf "/tmp/${release}.tgz" dist package.json package-lock.json
scp "/tmp/${release}.tgz" "oneprovider-video:/tmp/${release}.tgz"
```

On OneProvider, after reviewing the archive checksum and with interactive sudo:

```sh
set -eu
release="azmigrantat-video-service-YYYYMMDDHHMMSS"
test "$(findmnt -no SOURCE /srv/azmigrantat-video)" = /dev/sdb1
test "$(findmnt -no FSTYPE /srv/azmigrantat-video)" = ext4
sudo test -s /etc/azmigrantat-video/video-service.env
sudo awk -F= '$1 == "VIDEO_SERVICE_ADMIN_SECRET" && $2 != "" && $2 !~ /^replace-/ { found=1 } END { exit(found ? 0 : 1) }' /etc/azmigrantat-video/video-service.env
sudo install -d -o root -g root -m 0755 "/opt/releases/${release}"
sudo tar -xzf "/tmp/${release}.tgz" -C "/opt/releases/${release}"
sudo chown -R root:root "/opt/releases/${release}"
sudo find "/opt/releases/${release}" -type d -exec chmod 0755 {} +
sudo find "/opt/releases/${release}" -type f -exec chmod 0644 {} +
sudo install -d -o azmigrantat-video -g azmigrantat-video -m 0750 "/opt/releases/${release}/node_modules"
sudo -u azmigrantat-video /usr/local/bin/npm ci --omit=dev --ignore-scripts --prefix "/opt/releases/${release}"
sudo -u azmigrantat-video /usr/local/bin/node --check "/opt/releases/${release}/dist/server.js"
sudo -u azmigrantat-video /usr/local/bin/node --check "/opt/releases/${release}/dist/worker-server.js"
sudo test -f "/opt/releases/${release}/dist/admin-token.js"
sudo systemd-analyze verify /etc/systemd/system/azmigrantat-video.service /etc/systemd/system/azmigrantat-video-worker.service
```

The following activation commands are intentionally separate and must be run
only after the staged release and environment have been reviewed:

```sh
sudo mv /opt/azmigrantat-video-service "/opt/azmigrantat-video-service.rollback-${release}"
sudo mv "/opt/releases/${release}" /opt/azmigrantat-video-service
sudo systemctl daemon-reload
sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service
curl --fail --silent http://127.0.0.1:3100/health
```

Rollback, without deleting the failed build:

```sh
sudo systemctl stop azmigrantat-video.service azmigrantat-video-worker.service
sudo mv /opt/azmigrantat-video-service "/opt/azmigrantat-video-service.failed-${release}"
sudo mv "/opt/azmigrantat-video-service.rollback-${release}" /opt/azmigrantat-video-service
sudo systemctl daemon-reload
sudo systemctl start azmigrantat-video.service azmigrantat-video-worker.service
curl --fail --silent http://127.0.0.1:3100/health
```

Do not copy `.env`, token secrets or callback secrets in the archive. Verify
`public/` remains owned/group-readable for `www-data` while `private/`,
`state/` and `logs/` remain inaccessible to Nginx.

## Isolated OneProvider staging (manual preparation only)

The staging templates use a separate service account, code directory, env file,
storage root, port (`127.0.0.1:3101`) and Redis queue key. They must not reuse
the production `/srv/azmigrantat-video`, `/etc/azmigrantat-video/` or production
callback secrets. `VIDEO_SERVICE_PUBLIC_URL` is intentionally empty until a
separate staging playback route exists; pointing it at the production Nginx
root would expose the wrong storage tree.

The read-only staging playback template is
`nginx/video-staging-loopback.conf.example`. It listens only on
`127.0.0.1:3102`, aliases only the staging `public/videos/` and
`public/thumbnails/` trees, supports normal Nginx byte ranges, and returns 404
for private/state/logs and hidden paths. It must not be installed in a public
server block. When used through the SSH forward below, set the staging public
URL to the tunnel address, not to `https://video.azmigrantat.com`.

Required operator sequence, not executed by this repository task:

```sh
sudo groupadd --system azmigrantat-video-staging
sudo useradd --system --gid azmigrantat-video-staging --home-dir /var/lib/azmigrantat-video-staging --create-home --shell /usr/sbin/nologin azmigrantat-video-staging
sudo install -d -o azmigrantat-video-staging -g azmigrantat-video-staging -m 0750 /var/lib/azmigrantat-video-staging
sudo install -d -o azmigrantat-video-staging -g azmigrantat-video-staging -m 0750 /srv/azmigrantat-video-staging
sudo install -d -o root -g azmigrantat-video-staging -m 0750 /etc/azmigrantat-video-staging
sudo install -d -o root -g root -m 0755 /opt/azmigrantat-video-service-staging
sudo install -d -o azmigrantat-video-staging -g azmigrantat-video-staging -m 0750 /var/cache/azmigrantat-video-staging-npm
```

Before extracting the release, verify the storage boundary. The staging user
must be able to write only the staging root and must not be able to traverse or
read the production private/state/logs trees:

```sh
sudo findmnt --target /srv/azmigrantat-video-staging
sudo -u azmigrantat-video-staging test -w /srv/azmigrantat-video-staging
! sudo -u azmigrantat-video-staging test -r /srv/azmigrantat-video/private
! sudo -u azmigrantat-video-staging test -r /srv/azmigrantat-video/state
! sudo -u azmigrantat-video-staging test -w /srv/azmigrantat-video
sudo namei -l /srv/azmigrantat-video /srv/azmigrantat-video-staging
```

The service units additionally use `ProtectSystem=strict` and
`ReadWritePaths=/srv/azmigrantat-video-staging`. Do not weaken those settings
to make a permission problem disappear.

Copy the reviewed release into the staging code directory, then install the
example env file as `/etc/azmigrantat-video-staging/video-service.env` with
mode `0640`, owner `root:azmigrantat-video-staging`, and enter three new
staging-only secrets interactively. Do not place the values in Git or in the
release archive. Use a distinct Redis key such as
`azmigrantat:video:staging:processing`.

The three secrets are independent values for `VIDEO_SERVICE_TOKEN_SECRET`,
`VIDEO_SERVICE_CALLBACK_SECRET` and `VIDEO_SERVICE_ADMIN_SECRET`. Generate
them in a protected operator session (for example `openssl rand -hex 32`),
enter each value with `sudoedit`, and never echo, log, copy to shell history or
reuse production values. The PHP staging env must receive the same three
values through its protected Compose env mechanism.

The queue namespace is isolated by the base key. The service derives:

```text
azmigrantat:video:staging:processing
azmigrantat:video:staging:processing:processing
azmigrantat:video:staging:processing:retry
azmigrantat:video:staging:processing:dead-letter
```

Callback outbox and delivered events are filesystem state, not Redis keys:
`state/callbacks/` and `state/callback-delivered/`. They are isolated by the
staging storage root. After activation, inspect only the staging namespace:

```sh
redis-cli --scan --pattern 'azmigrantat:video:staging:*'
redis-cli LLEN azmigrantat:video:staging:processing
redis-cli LLEN azmigrantat:video:staging:processing:processing
redis-cli ZCARD azmigrantat:video:staging:processing:retry
redis-cli LLEN azmigrantat:video:staging:processing:dead-letter
```

Install dependencies with an explicit service-owned home and cache. This
avoids the previous `EACCES` risk from an inherited operator npm cache and does
not change the global npm configuration:

```sh
sudo -u azmigrantat-video-staging env HOME=/var/lib/azmigrantat-video-staging \
  npm_config_cache=/var/cache/azmigrantat-video-staging-npm \
  /usr/local/bin/npm ci --omit=dev --ignore-scripts \
  --prefix /opt/azmigrantat-video-service-staging
```

For the uploaded release `azmigrantat-video-service-staging-20261025194301`,
the reviewed manual extraction/preflight sequence is:

```sh
set -eu
release=azmigrantat-video-service-staging-20261025194301
archive=/tmp/${release}.tgz
sudo test -s "$archive"
sudo install -d -o root -g root -m 0755 "/opt/releases/$release"
sudo tar -xzf "$archive" -C "/opt/releases/$release"
sudo chown -R root:root "/opt/releases/$release"
sudo find "/opt/releases/$release" -type d -exec chmod 0755 {} +
sudo find "/opt/releases/$release" -type f -exec chmod 0644 {} +
sudo -u azmigrantat-video-staging env HOME=/var/lib/azmigrantat-video-staging \
  npm_config_cache=/var/cache/azmigrantat-video-staging-npm \
  /usr/local/bin/npm ci --omit=dev --ignore-scripts \
  --prefix "/opt/releases/$release"
sudo -u azmigrantat-video-staging /usr/local/bin/node --check \
  "/opt/releases/$release/dist/server.js"
sudo -u azmigrantat-video-staging /usr/local/bin/node --check \
  "/opt/releases/$release/dist/worker-server.js"
sudo test -f "/opt/releases/$release/dist/admin-token.js"
```

Do not activate the release until the checksum already verified on both hosts,
the storage boundary checks pass, the protected env file exists, and both
systemd units pass `systemd-analyze verify`. Initial activation is a manual
atomic directory move; it does not touch production:

```sh
sudo test ! -e /opt/azmigrantat-video-service-staging
sudo mv "/opt/releases/$release" /opt/azmigrantat-video-service-staging
sudo systemctl daemon-reload
sudo systemctl enable --now azmigrantat-video-staging.service azmigrantat-video-staging-worker.service
curl --fail --silent --show-error http://127.0.0.1:3101/health
```

If a staging version is already active, preserve it before switching and keep
the failed release for inspection. Rollback is also manual and does not remove
data:

```sh
sudo systemctl stop azmigrantat-video-staging.service azmigrantat-video-staging-worker.service
sudo mv /opt/azmigrantat-video-service-staging \
  "/opt/azmigrantat-video-service-staging.failed-$release"
sudo mv "/opt/azmigrantat-video-service-staging.rollback-$release" \
  /opt/azmigrantat-video-service-staging
sudo systemctl daemon-reload
sudo systemctl start azmigrantat-video-staging.service azmigrantat-video-staging-worker.service
curl --fail --silent --show-error http://127.0.0.1:3101/health
```

The rollback command assumes the previous directory was deliberately renamed
to the matching `.rollback-$release` path before activation. Never use a broad
`rm` or a storage cleanup command as part of rollback.

Install and validate, without enabling or starting automatically:

```sh
sudo install -o root -g root -m 0644 deploy/systemd/azmigrantat-video-staging.service /etc/systemd/system/
sudo install -o root -g root -m 0644 deploy/systemd/azmigrantat-video-staging-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/azmigrantat-video-staging.service /etc/systemd/system/azmigrantat-video-staging-worker.service
sudo systemctl is-enabled azmigrantat-video.service azmigrantat-video-worker.service
```

Only after separate approval may the operator start the staging units. The
reverse SSH tunnel must already be active and the production callback URL must
remain unchanged. The staging callback is the loopback-only URL from the
example env file; it is not a public HTTP endpoint.

For the laptop PHP container to reach the remote staging API without exposing
it, prefer the existing isolated Docker bridge rather than host networking.
First inspect its gateway, then bind the SSH forward to that gateway address
only (never `0.0.0.0`). The exact gateway is environment-specific:

```sh
docker network inspect azmigrantat-staging_default \
  --format '{{(index .IPAM.Config 0).Gateway}}'
```

If it returns `172.29.0.1`, the safe tunnel shape is:

```sh
# laptop terminal 1: remote OneProvider staging API -> laptop PHP callback
ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -R 127.0.0.1:18082:127.0.0.1:8082 oneprovider-video

# laptop terminal 2: laptop PHP bridge gateway -> remote OneProvider staging API
ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -L 172.29.0.1:13101:127.0.0.1:3101 oneprovider-video
# optional staging playback tunnel, on the same bridge gateway
ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -L 172.29.0.1:13102:127.0.0.1:3102 oneprovider-video
```

Recreate only the staging PHP container/configuration with
`VIDEO_SERVICE_URL=http://172.29.0.1:13101` and, when playback is part of the
test, `VIDEO_SERVICE_PUBLIC_URL=http://172.29.0.1:13102`. Verify from inside
the container using its existing HTTP client before starting the E2E flow.
The callback remains remote loopback `127.0.0.1:18082` and reaches the laptop's
published staging API port `127.0.0.1:8082` through the reverse tunnel.

If the Docker bridge gateway cannot accept a loopback-restricted SSH bind on
the host, stop and diagnose that isolated staging path; do not broaden the
bind to all interfaces. Host networking is an explicit fallback only after
review because it removes the container network boundary. In either topology,
do not alter production containers, volumes, SSH, UFW or DNS.

After installing the staging playback template manually, validate it before
the first upload:

```sh
sudo install -o root -g root -m 0644 deploy/nginx/video-staging-loopback.conf.example /etc/nginx/conf.d/azmigrantat-video-staging.conf
sudo nginx -t
sudo systemctl reload nginx
curl --fail --silent --show-error -I http://127.0.0.1:3102/videos/
```

The install/reload commands are intentionally manual and are not run by this
repository task. Set `VIDEO_SERVICE_PUBLIC_URL` only after the loopback route
is installed; otherwise keep it empty.

### Restricted staging control script

If the host grants the restricted helper
`/usr/local/sbin/azmigrantat-staging-control`, use it only after the units have
been installed and validated. It is not an installation or configuration
helper, and its sudo rule must not be expanded:

```sh
sudo -n /usr/local/sbin/azmigrantat-staging-control status
sudo -n /usr/local/sbin/azmigrantat-staging-control logs
sudo -n /usr/local/sbin/azmigrantat-staging-control start
sudo -n /usr/local/sbin/azmigrantat-staging-control restart
sudo -n /usr/local/sbin/azmigrantat-staging-control stop
```

Use `start` only after the protected env file, storage boundary, systemd
verification, Nginx syntax check and SSH tunnel preflight have passed. Use
`stop` for rollback preparation; do not invoke unrestricted `systemctl` through
this helper or alter production unit names.

### Fixed root-owned deployment helper (review before installation)

`deploy/sbin/azmigrantat-staging-deploy` is a separate, fixed helper for the
reviewed release. It accepts exactly one of `install`, `verify`, `status`,
`start`, `stop`, `restart` or `rollback`; it accepts no paths, commands or
environment overrides. The release archive is accepted only when its fixed
SHA-256 and archive member allowlist match. The helper validates the protected
env file, staging/production boundary, service units, Nginx syntax and the
local-only API before starting services. It never creates or prints secrets.

The helper reads only root-owned fixed inputs under
`/var/lib/azmigrantat-video-staging/inputs`; it never trusts mutable `/tmp`
files during a privileged operation. The helper must be installed root-owned
and is deliberately not granted an
action that can modify itself. Optional `chattr +i` hardening may be applied
after review. Copying the helper to `/tmp` is non-privileged; installation and
sudoers changes are the one-time operator actions:

```sh
scp app/azmigrantat-video-service/deploy/sbin/azmigrantat-staging-deploy \
  oneprovider-video:/tmp/azmigrantat-staging-deploy
sha256sum app/azmigrantat-video-service/deploy/sbin/azmigrantat-staging-deploy
ssh oneprovider-video 'sha256sum /tmp/azmigrantat-staging-deploy'
```

Expected helper SHA-256 for this revision:
`b85bdac93d31e01d6ee28c7045f0f6d293f018acc557aed61fe206641a6bed3e`.

After reviewing the local and remote hash, the operator runs once on
OneProvider:

```sh
sudo install -o root -g root -m 0755 \
  /tmp/azmigrantat-staging-deploy \
  /usr/local/sbin/azmigrantat-staging-deploy
sudo chown root:root /usr/local/sbin/azmigrantat-staging-deploy
sudo chmod 0755 /usr/local/sbin/azmigrantat-staging-deploy
```

Before invoking the helper, install the already SHA-256-verified release and
the five SHA-pinned, secret-free templates into the root-owned input directory:

```sh
sudo install -d -o root -g root -m 0755 \
  /var/lib/azmigrantat-video-staging/inputs
sudo install -o root -g root -m 0644 \
  /tmp/azmigrantat-video-service-staging-20261025194301.tgz \
  /var/lib/azmigrantat-video-staging/inputs/azmigrantat-video-service-staging-20261025194301.tgz
sudo install -o root -g root -m 0644 \
  /tmp/azmigrantat-video-staging.service \
  /var/lib/azmigrantat-video-staging/inputs/azmigrantat-video-staging.service
sudo install -o root -g root -m 0644 \
  /tmp/azmigrantat-video-staging-worker.service \
  /var/lib/azmigrantat-video-staging/inputs/azmigrantat-video-staging-worker.service
sudo install -o root -g root -m 0644 \
  /tmp/azmigrantat-video-staging-redis.service \
  /var/lib/azmigrantat-video-staging/inputs/azmigrantat-video-staging-redis.service
sudo install -o root -g root -m 0644 \
  /tmp/azmigrantat-video-staging.conf.example \
  /var/lib/azmigrantat-video-staging/inputs/azmigrantat-video-staging.conf.example
sudo install -o root -g root -m 0644 \
  /tmp/video-staging-loopback.conf.example \
  /var/lib/azmigrantat-video-staging/inputs/video-staging-loopback.conf.example
```

Create `/etc/sudoers.d/azmigrantat-staging-deploy` with `sudoedit` and exactly
the following content, replacing no paths or arguments:

```sudoers
Cmnd_Alias AZMIGRANTAT_STAGING_DEPLOY = \
    /usr/local/sbin/azmigrantat-staging-deploy install, \
    /usr/local/sbin/azmigrantat-staging-deploy verify, \
    /usr/local/sbin/azmigrantat-staging-deploy status, \
    /usr/local/sbin/azmigrantat-staging-deploy start, \
    /usr/local/sbin/azmigrantat-staging-deploy stop, \
    /usr/local/sbin/azmigrantat-staging-deploy restart, \
    /usr/local/sbin/azmigrantat-staging-deploy rollback
codexadmin ALL=(root) NOPASSWD: AZMIGRANTAT_STAGING_DEPLOY
```

Validate the rule and file permissions:

```sh
sudo chmod 0440 /etc/sudoers.d/azmigrantat-staging-deploy
sudo chown root:root /etc/sudoers.d/azmigrantat-staging-deploy
sudo visudo -cf /etc/sudoers.d/azmigrantat-staging-deploy
```

The protected staging env file remains a deliberate prerequisite. It must be
created once with the three video-service secrets plus the separate Redis ACL
secret, and matching PHP staging values; the helper refuses to generate,
display or guess them. After that
one-time secret provisioning and helper approval, Codex can run the complete
deployment without additional administrative commands:

```sh
sudo -n /usr/local/sbin/azmigrantat-staging-deploy install
sudo -n /usr/local/sbin/azmigrantat-staging-deploy verify
sudo -n /usr/local/sbin/azmigrantat-staging-deploy start
sudo -n /usr/local/sbin/azmigrantat-staging-deploy status
```

Rollback is fixed and argument-free:

```sh
sudo -n /usr/local/sbin/azmigrantat-staging-deploy rollback
```

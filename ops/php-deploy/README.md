# PHP release deployment mechanism

## Findings for Jump.bg

The current cPanel document root is a real directory:

`/home/azmigran/users.azmigrantat.com`

It contains the application tree and `.htaccess` rewrites requests into `public/`. No active `current` symlink or versioned release directory was found. The account is also protected by cPanel-style ownership/permissions (`750`, group `nobody` on the document-root parent).

cPanel documentation warns that `FollowSymLinks` and `SymLinksIfOwnerMatch` have symlink-race/security implications; the server-wide setting is controlled by the hosting administrator. cPanel also treats a domain as either a document root or a proxied app, so changing the document root is a hosting-level operation. The current account audit cannot prove that LiteSpeed will follow a new docroot symlink safely.

Therefore the automated symlink scripts are prepared but intentionally refuse the current Jump.bg root unless the hosting configuration is changed and verified first. Do not point them at the current production directory.

## Recommended structure if the host approves a symlink

```text
/home/azmigran/users.azmigrantat.com/
  current -> releases/20261026-...
  releases/20261026-.../       # complete immutable application tree
  shared/.env                   # never in a release archive
  shared/app-storage/           # persistent runtime storage
  rollback/                     # retained release directories
```

The cPanel/LiteSpeed document root must explicitly be configured to `current`, and a staging switch plus rollback must be tested before production. The release must be a complete PHP tree; the current provider-neutral archive is a reviewed module archive, not a complete docroot release.

## Scripts

- `deploy-release.sh` verifies SHA-256, extracts into a new release directory, validates PHP syntax and `composer.lock`, then performs an atomic symlink rename. It refuses fixed directory docroots and production unless two explicit approvals are supplied.
- `rollback-release.sh` atomically points `current` to a previously verified release and has the same production guard.
- `health-check.sh` verifies the login page and public feed without credentials or mutations.
- `restore-snapshot.sh` verifies a full snapshot checksum and restores only the application tree; `.env` and persistent directories are explicitly preserved.
- `maintenance-on.sh` / `maintenance-off.sh` toggle a flag consumed by the scoped API maintenance block. They refuse to run until that block is installed and require explicit production approval.

The maintenance response is limited to `/api/` in this document root. Static assets and other cPanel sites are outside its scope. It must be installed and tested in staging before use.

## Release preparation commands

`build-full-release.sh` combines a verified current-tree snapshot with the reviewed provider-neutral module archive. It removes `.env` and persistent directories, then emits a complete release archive suitable for `deploy-release.sh`.

Example, after the host administrator has approved the release and the module archive has been uploaded outside the docroot:

```bash
bash build-full-release.sh \
  --base-snapshot /home/azmigran/backups/php-deploy/production-php-snapshot-<timestamp>.tar \
  --base-sha256 <verified-snapshot-sha256> \
  --module-archive /home/azmigran/backups/php-deploy/azmigrantat-php-provider-neutral-<version>.tar.gz \
  --output /home/azmigran/backups/php-deploy/releases/<version>.tar.gz
```

For the current fixed docroot, the approved sequence is: verify the complete release, enable API-only maintenance, snapshot the exact current tree, perform the reviewed staged copy, run health/Bunny smoke checks, and disable maintenance. The prepared symlink scripts must not be pointed at the fixed production root.

## Current Jump.bg fallback

Until a symlink/current docroot is approved, use a manually supervised maintenance deployment:

1. Put a complete release in a separate staging directory.
2. Verify archive SHA-256, PHP syntax, Composer lock, permissions, `.env` preservation and health checks.
3. Enable a short maintenance response at the web layer.
4. Snapshot the exact current tree and copy the release into the fixed docroot using a reviewed file manifest.
5. Run health checks and Bunny-only smoke tests.
6. Restore the exact snapshot if any check fails, then disable maintenance mode.

This is not zero-downtime and must not be automated as an in-place `rsync --delete` without a maintenance window and a tested restore.

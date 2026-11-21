#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_id="${1:-}"
readonly expected_service_sha256="${2:-}"
[[ $release_id =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { printf 'Invalid release id.\n' >&2; exit 2; }
[[ $expected_service_sha256 =~ ^[a-f0-9]{64}$ ]] || { printf 'Invalid service SHA-256.\n' >&2; exit 2; }
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly staged="/home/azmigran/backups/google-play-release-staging/video-ai-test-account-$release_id"
readonly rollback="/home/azmigran/backups/google-play-release-staging/video-ai-test-account-rollback-$release_id"
readonly service=app/Services/VideoEnhancementService.php
readonly identity_helper="$staged/find-video-ai-test-user.php"
readonly test_email=techsolutionbg@gmail.com
readonly test_user_id=1269

[[ $(id -un) == azmigran ]]
[[ -f "$staged/$service" && ! -L "$staged" ]]
[[ -f "$identity_helper" && ! -L "$identity_helper" ]]
[[ ! -e "$rollback" ]]
[[ -f "$auth_root/.env" && ! -L "$auth_root/.env" ]]
[[ $(sha256sum "$staged/$service" | awk '{print $1}') == "$expected_service_sha256" ]]
php -l "$staged/$service" >/dev/null
php "$auth_root/vendor/bin/phinx" status -c "$auth_root/phinx.php" -e production | grep -Eq '^\s+up\s+20261112180000\s'
identity=$(cd "$auth_root" && php "$identity_helper")
[[ $identity == '1269 email=techsolutionbg@gmail.com verified=1' ]]

install -d -m 0700 "$rollback/$(dirname "$service")"
install -m 0600 "$auth_root/$service" "$rollback/$service"
install -m 0600 "$auth_root/.env" "$rollback/.env"
(cd "$rollback" && sha256sum "$service" .env > SHA256SUMS && chmod 0600 SHA256SUMS)

restore() {
  local status=$?
  trap - ERR
  install -m 0644 "$rollback/$service" "$auth_root/$service" || true
  install -m 0600 "$rollback/.env" "$auth_root/.env" || true
  printf 'activation=rolled_back status=%s rollback=%s\n' "$status" "$rollback" >&2
  exit "$status"
}
trap restore ERR

temporary="$auth_root/$service.ai-$release_id.tmp"
install -m 0644 "$staged/$service" "$temporary"
php -l "$temporary" >/dev/null
mv "$temporary" "$auth_root/$service"

set_env() {
  local key=$1 value=$2 temp="$auth_root/.env.ai-$release_id.tmp"
  awk -v key="$key" -v value="$value" 'BEGIN { found=0 } $0 ~ "^" key "=" { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$auth_root/.env" >"$temp"
  chmod --reference="$auth_root/.env" "$temp"
  chown --reference="$auth_root/.env" "$temp"
  mv "$temp" "$auth_root/.env"
}

set_env VIDEO_ENHANCEMENT_AI_ENABLED true
set_env VIDEO_ENHANCEMENT_AI_ALLOWED_EMAILS "$test_email"
set_env VIDEO_ENHANCEMENT_AI_ALLOWED_USER_IDS "$test_user_id"

php -l "$auth_root/$service" >/dev/null
grep -q '^VIDEO_ENHANCEMENT_ENABLED=true$' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_ALLOWED_EMAILS=.*techsolutionbg@gmail.com' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_AI_ENABLED=true$' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_AI_ALLOWED_EMAILS=techsolutionbg@gmail.com$' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_AI_ALLOWED_USER_IDS=1269$' "$auth_root/.env"
grep -q 'allowedUserIds' "$auth_root/$service"

trap - ERR
printf 'activation=active email=%s user_id=%s rollback=%s\n' "$test_email" "$test_user_id" "$rollback"

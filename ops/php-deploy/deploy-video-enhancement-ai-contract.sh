#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_id="${1:-}"
[[ "$release_id" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { printf 'Invalid release id.\n' >&2; exit 2; }
readonly release_root="/home/azmigran/backups/google-play-release-staging/video-enhancement-ai-release-$release_id"
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly rollback_root="/home/azmigran/backups/google-play-release-staging/video-enhancement-ai-rollback-$release_id"
readonly migration=20261112180000
readonly -a files=(
  app/Controllers/Api/VideoEnhancementController.php
  app/Models/VideoEnhancementJob.php
  app/Services/VideoEnhancementCallbackService.php
  app/Services/VideoEnhancementService.php
)
readonly migration_file=database/migrations/20261112180000_add_video_enhancement_method.php

[[ $(id -un) == azmigran ]] || exit 77
[[ -d "$release_root/auth" && ! -L "$release_root" ]] || exit 78
[[ ! -e "$rollback_root" ]] || exit 73
[[ -f "$auth_root/.env" && ! -L "$auth_root/.env" ]] || exit 78
(
  cd "$release_root"
  sha256sum -c SHA256SUMS >/dev/null
  find auth -type f -name '*.php' -exec php -l {} \; | grep -v 'No syntax errors detected' && exit 1 || true
)
[[ ! -e "$auth_root/$migration_file" ]] || { printf 'Migration target already exists.\n' >&2; exit 73; }

install -d -m 0700 "$rollback_root/auth"
for relative in "${files[@]}"; do install -D -m 0600 "$auth_root/$relative" "$rollback_root/auth/$relative"; done
install -D -m 0600 "$auth_root/.env" "$rollback_root/auth/.env"
(
  cd "$rollback_root"
  find auth -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  chmod 0600 SHA256SUMS
)

rollback() {
  status=$?
  trap - ERR
  for relative in "${files[@]}"; do install -D -m 0644 "$rollback_root/auth/$relative" "$auth_root/$relative" || true; done
  install -m 0600 "$rollback_root/auth/.env" "$auth_root/.env" || true
  rm -f -- "$auth_root/$migration_file" || true
  printf 'deployment=rolled_back status=%s migration_columns_retained=yes\n' "$status" >&2
  exit "$status"
}
trap rollback ERR

activate_file() {
  relative=$1
  source="$release_root/auth/$relative"
  destination="$auth_root/$relative"
  temporary="$destination.ai-contract-$release_id.tmp"
  [[ -f "$source" && ! -L "$source" && ! -e "$temporary" ]]
  install -D -m 0644 "$source" "$temporary"
  php -l "$temporary" >/dev/null
  [[ $(sha256sum "$source" | awk '{print $1}') == $(sha256sum "$temporary" | awk '{print $1}') ]]
  mv "$temporary" "$destination"
}

set_env() {
  key=$1; value=$2; temporary="$auth_root/.env.ai-contract-$release_id.tmp"
  awk -v key="$key" -v value="$value" 'BEGIN { found=0 } $0 ~ "^" key "=" { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$auth_root/.env" > "$temporary"
  chmod --reference="$auth_root/.env" "$temporary"; chown --reference="$auth_root/.env" "$temporary"; mv "$temporary" "$auth_root/.env"
}

for relative in "${files[@]}"; do activate_file "$relative"; done
activate_file "$migration_file"
php "$auth_root/vendor/bin/phinx" migrate -c "$auth_root/phinx.php" -e production -t "$migration"

# Standard enhancement remains on its existing test-account gate. AI has a
# separate backend gate and is deliberately denied on the current hardware.
set_env VIDEO_ENHANCEMENT_AI_ENABLED false
set_env VIDEO_ENHANCEMENT_AI_ALLOWED_EMAILS ''

for relative in "${files[@]}" "$migration_file"; do php -l "$auth_root/$relative" >/dev/null; done
grep -q '^VIDEO_ENHANCEMENT_ENABLED=true$' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_ALLOWED_EMAILS=.*techsolutionbg@gmail.com' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_AI_ENABLED=false$' "$auth_root/.env"
grep -q '^VIDEO_ENHANCEMENT_AI_ALLOWED_EMAILS=$' "$auth_root/.env"

trap - ERR
printf 'deployment=active release=%s migration=%s rollback=%s ai_enabled=false\n' "$release_id" "$migration" "$rollback_root"

#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_id=20261112T2315
readonly release_root=/home/azmigran/backups/google-play-release-staging/video-enhancement-release-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/video-enhancement-rollback-$release_id
readonly migration=20261112090000

readonly -a new_files=(
  app/Controllers/Api/VideoEnhancementController.php
  app/Models/VideoEnhancementJob.php
  app/Services/VideoEnhancementCallbackService.php
  app/Services/VideoEnhancementReadyNotificationService.php
  app/Services/VideoEnhancementService.php
  database/migrations/20261112090000_create_video_enhancement_jobs.php
)
readonly -a existing_files=(
  app/Controllers/Api/DedicatedVideoCallbackController.php
  app/Models/Notification.php
  routes/web.php
)

[[ $(id -un) == azmigran ]] || exit 77
[[ -d $release_root && ! -L $release_root ]] || exit 78
[[ ! -e $rollback_root ]] || exit 73
[[ -f $auth_root/.env && ! -L $auth_root/.env ]] || exit 78
(
  cd "$release_root"
  sha256sum -c SHA256SUMS >/dev/null
  [[ $(find auth -type f | wc -l) -eq 9 ]]
  find auth -type f -name '*.php' -exec php -l {} \; | grep -v 'No syntax errors detected' && exit 1 || true
)
for relative in "${new_files[@]}"; do
  [[ ! -e $auth_root/$relative ]] || { printf 'Unexpected existing target: %s\n' "$relative" >&2; exit 73; }
done

install -d -m 0700 "$rollback_root"
for relative in "${existing_files[@]}"; do
  install -D -m 0600 "$auth_root/$relative" "$rollback_root/auth/$relative"
done
install -D -m 0600 "$auth_root/.env" "$rollback_root/auth/.env"
(
  cd "$rollback_root"
  find auth -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  chmod 0600 SHA256SUMS
)

rollback() {
  status=$?
  trap - ERR
  for relative in "${existing_files[@]}"; do
    install -D -m 0644 "$rollback_root/auth/$relative" "$auth_root/$relative" || true
  done
  install -m 0600 "$rollback_root/auth/.env" "$auth_root/.env" || true
  for relative in "${new_files[@]}"; do
    rm -f -- "$auth_root/$relative" || true
  done
  printf 'deployment=rolled_back status=%s migration_table_retained_if_created=yes\n' "$status" >&2
  exit "$status"
}
trap rollback ERR

activate_file() {
  relative=$1
  source=$release_root/auth/$relative
  destination=$auth_root/$relative
  temporary=$destination.video-enhancement-$release_id.tmp
  [[ -f $source && ! -L $source && ! -e $temporary ]]
  install -D -m 0644 "$source" "$temporary"
  php -l "$temporary" >/dev/null
  [[ $(sha256sum "$source" | awk '{print $1}') == $(sha256sum "$temporary" | awk '{print $1}') ]]
  mv "$temporary" "$destination"
}

set_env() {
  key=$1
  value=$2
  temporary=$auth_root/.env.video-enhancement-$release_id.tmp
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$auth_root/.env" > "$temporary"
  chmod --reference="$auth_root/.env" "$temporary"
  chown --reference="$auth_root/.env" "$temporary"
  mv "$temporary" "$auth_root/.env"
}

for relative in "${new_files[@]}"; do activate_file "$relative"; done
activate_file app/Controllers/Api/DedicatedVideoCallbackController.php
activate_file app/Models/Notification.php

php "$auth_root/vendor/bin/phinx" migrate -c "$auth_root/phinx.php" -e production -t "$migration"

set_env VIDEO_ENHANCEMENT_ENABLED true
set_env VIDEO_ENHANCEMENT_ALLOWED_EMAILS techsolutionbg@gmail.com
activate_file routes/web.php

find "$auth_root/app/Controllers/Api/VideoEnhancementController.php" \
  "$auth_root/app/Controllers/Api/DedicatedVideoCallbackController.php" \
  "$auth_root/app/Models/VideoEnhancementJob.php" \
  "$auth_root/app/Models/Notification.php" \
  "$auth_root/app/Services/VideoEnhancementCallbackService.php" \
  "$auth_root/app/Services/VideoEnhancementReadyNotificationService.php" \
  "$auth_root/app/Services/VideoEnhancementService.php" \
  "$auth_root/database/migrations/20261112090000_create_video_enhancement_jobs.php" \
  "$auth_root/routes/web.php" -type f -exec php -l {} \; | grep -v 'No syntax errors detected' && exit 1 || true

trap - ERR
printf 'deployment=active release=%s migration=%s rollback=%s\n' "$release_id" "$migration" "$rollback_root"

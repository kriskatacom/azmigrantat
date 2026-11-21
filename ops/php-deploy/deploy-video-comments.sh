#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_id=20261117T0645
readonly release_root=/home/azmigran/backups/video-comments-release-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly rollback_root=/home/azmigran/backups/video-comments-rollback-$release_id
readonly final_migration=20261117090000

readonly -a existing_files=(
  app/Models/Video.php
  app/Controllers/Api/VideoController.php
  app/Controllers/Api/UserController.php
  routes/web.php
)

readonly -a new_files=(
  app/Models/VideoComment.php
  app/Models/VideoCommentLike.php
  app/Controllers/Api/VideoCommentController.php
  database/migrations/20261117090000_create_video_comments.php
  app/Models/ContentReport.php
  app/Controllers/Api/ReportController.php
  database/migrations/20261031000000_create_content_reports_table.php
)

[[ $(id -un) == azmigran ]] || exit 77
[[ -d $release_root && ! -L $release_root ]] || exit 78
[[ ! -e $rollback_root ]] || exit 73

for relative in "${existing_files[@]}" "${new_files[@]}"; do
  [[ -f $release_root/$(basename "$relative") && ! -L $release_root/$(basename "$relative") ]] || exit 78
done
for relative in "${new_files[@]}"; do
  [[ ! -e $auth_root/$relative ]] || { printf 'Unexpected existing target: %s\n' "$relative" >&2; exit 73; }
done

find "$release_root" -maxdepth 1 -type f -name '*.php' -print0 \
  | sort -z \
  | xargs -0 -n1 php -l >/dev/null

install -d -m 0700 "$rollback_root"
for relative in "${existing_files[@]}"; do
  install -D -m 0600 "$auth_root/$relative" "$rollback_root/$relative"
done
(
  cd "$rollback_root"
  find . -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  chmod 0600 SHA256SUMS
)

rollback() {
  status=$?
  trap - ERR
  for relative in "${existing_files[@]}"; do
    install -D -m 0644 "$rollback_root/$relative" "$auth_root/$relative" || true
  done
  for relative in "${new_files[@]}"; do
    rm -f -- "$auth_root/$relative" || true
  done
  printf 'deployment=rolled_back status=%s database_additions_may_remain=yes\n' "$status" >&2
  exit "$status"
}
trap rollback ERR

activate_file() {
  relative=$1
  source=$release_root/$(basename "$relative")
  destination=$auth_root/$relative
  temporary=$destination.video-comments-$release_id.tmp
  install -D -m 0644 "$source" "$temporary"
  php -l "$temporary" >/dev/null
  mv "$temporary" "$destination"
}

# Install inactive implementation files first. Routes are switched last.
for relative in "${new_files[@]}"; do activate_file "$relative"; done
activate_file app/Models/Video.php
activate_file app/Controllers/Api/VideoController.php
activate_file app/Controllers/Api/UserController.php

php "$auth_root/vendor/bin/phinx" migrate \
  -c "$auth_root/phinx.php" \
  -e production \
  -t "$final_migration"

activate_file routes/web.php

for relative in "${existing_files[@]}" "${new_files[@]}"; do
  php -l "$auth_root/$relative" >/dev/null
done

trap - ERR
printf 'deployment=active release=%s migration=%s rollback=%s\n' \
  "$release_id" "$final_migration" "$rollback_root"

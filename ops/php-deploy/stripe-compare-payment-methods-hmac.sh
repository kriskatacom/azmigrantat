#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly remote_helper=/home/azmigran/backups/google-play-release-staging/stage1-db-hmac.php
readonly local_helper=/home/kristian/projects/azmigrantat/ops/php-deploy/stage1-db-hmac.php
readonly image=azmigrantat-auth-stripe-test:php84
readonly restore_container=etome-stripe-db-restore

key=$(openssl rand -hex 32)
production=$(printf '%s\n' "$key" | ssh -o BatchMode=yes azmigrantat-shared "php $remote_helper production payment_methods")
restored=$(printf '%s\n' "$key" | docker run --rm -i --network "container:$restore_container" \
  -e DB_HOST=127.0.0.1 -e DB_PORT=3306 -e DB_NAME=etome_restore -e DB_USER=root -e DB_PASS= \
  -v "$local_helper:/hmac.php:ro" "$image" php /hmac.php restore payment_methods)
key=''

[[ $production == "$restored" ]] || {
  production=''
  restored=''
  echo 'payment_methods_hmac=mismatch' >&2
  exit 1
}
count=$(sed -n 's/^count=//p' <<< "$production")
production=''
restored=''
[[ $count =~ ^[0-9]+$ ]] || exit 1
printf 'payment_methods_hmac=match\ncount=%s\n' "$count"

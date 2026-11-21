#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly pinned_recipient=D9A4E9319B31C4C61A9756225637C2049F70D829
readonly pinned_public_key_sha256=26ce00e3bc63be07e55be4649de52f5cf0943b48fdbd635be4ba0cc55df5faa6
readonly pinned_manifest_helper_sha256=fabf0123317e76a4971626586b20d55d0c242b78ea016c138a0ffda96f01d177
readonly business_root=/home/azmigran/business.azmigrantat.com
readonly staging_root=/home/azmigran/backups/google-play-release-staging
readonly backup_parent=/home/azmigran/backups/google-play-release

if [[ $# -ne 2 ]]; then
  echo "usage: stripe-business-backup.sh BACKUP_ID PUBLIC_KEY" >&2
  exit 64
fi
readonly backup_id=$1
readonly public_key=$2
[[ $backup_id =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "invalid backup id" >&2; exit 64; }
[[ $(id -un) == azmigran ]] || { echo "must run as azmigran" >&2; exit 77; }
[[ -d $business_root && ! -L $business_root && $(realpath "$business_root") == "$business_root" ]] || { echo "business root identity mismatch" >&2; exit 78; }
[[ $(stat -c %U "$business_root") == azmigran ]] || { echo "business root owner mismatch" >&2; exit 78; }

readonly backup_root=$backup_parent/$backup_id
readonly manifest_helper=$staging_root/stage1-tree-manifest.py
[[ -d $backup_root && ! -L $backup_root && $(realpath "$backup_root") == "$backup_root" ]] || { echo "backup root mismatch" >&2; exit 78; }
[[ $(stat -c %U:%a "$backup_root") == azmigran:700 ]] || { echo "backup root metadata mismatch" >&2; exit 78; }
[[ $(cat "$backup_root/STATE") == awaiting_restore_rehearsal ]] || { echo "backup state mismatch" >&2; exit 65; }
[[ -f $manifest_helper && ! -L $manifest_helper && $(sha256sum "$manifest_helper" | awk '{print $1}') == "$pinned_manifest_helper_sha256" ]] || { echo "manifest helper mismatch" >&2; exit 66; }
[[ -f $public_key && ! -L $public_key && $(sha256sum "$public_key" | awk '{print $1}') == "$pinned_public_key_sha256" ]] || { echo "public key mismatch" >&2; exit 66; }

for output in business.env.gpg business-application.tar.gpg business-manifest.jsonl business-pre-inventory.txt business-post-inventory.txt BUSINESS_SHA256SUMS; do
  [[ ! -e $backup_root/$output ]] || { echo "business backup output exists" >&2; exit 73; }
done

readonly -a exclusions=(
  .env
  public/uploads
  storage/logs
  storage/uploads
  app/storage/cache
  app/storage/logs
  app/storage/sessions
)
readonly inventory_tmp=$staging_root/business-inventory-$backup_id
[[ ! -e $inventory_tmp ]] || { echo "business inventory target exists" >&2; exit 73; }
install -d -m 0700 "$inventory_tmp"
gpg_home=''
trap 'case ${inventory_tmp:-} in /home/azmigran/backups/google-play-release-staging/business-inventory-*) rm -rf -- "$inventory_tmp";; esac; if [[ -n ${gpg_home:-} ]]; then case $gpg_home in /home/azmigran/backups/google-play-release-staging/.gnupg-business-*) rm -rf -- "$gpg_home";; esac; fi' EXIT

python3 "$manifest_helper" "$business_root" "$inventory_tmp/business.pre.jsonl" "${exclusions[@]}" > "$inventory_tmp/business.inventory"
readonly env_before=$(sha256sum "$business_root/.env" | awk '{print $1}')

gpg_home=$(mktemp -d "$staging_root/.gnupg-business-XXXXXX")
chmod 0700 "$gpg_home"
gpg --batch --homedir "$gpg_home" --import "$public_key" >/dev/null 2>&1
readonly imported=$(gpg --batch --homedir "$gpg_home" --with-colons --fingerprint "$pinned_recipient" 2>/dev/null | awk -F: '$1=="fpr"{print $10; exit}')
[[ $imported == "$pinned_recipient" ]] || { echo "recipient mismatch" >&2; exit 65; }

encrypt_file() {
  local source=$1 destination=$2 partial=${2}.partial
  gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$partial" "$source"
  chmod 0600 "$partial"
  sync -f "$partial"
  mv "$partial" "$destination"
}

encrypt_file "$business_root/.env" "$backup_root/business.env.gpg"
tar --acls --xattrs --xattrs-include='*' --numeric-owner -C /home/azmigran \
  --exclude='business.azmigrantat.com/.env' \
  --exclude='business.azmigrantat.com/public/uploads' \
  --exclude='business.azmigrantat.com/storage/logs' \
  --exclude='business.azmigrantat.com/storage/uploads' \
  --exclude='business.azmigrantat.com/app/storage/cache' \
  --exclude='business.azmigrantat.com/app/storage/logs' \
  --exclude='business.azmigrantat.com/app/storage/sessions' \
  -cpf - business.azmigrantat.com | \
  gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$backup_root/business-application.tar.gpg.partial"
chmod 0600 "$backup_root/business-application.tar.gpg.partial"
sync -f "$backup_root/business-application.tar.gpg.partial"
mv "$backup_root/business-application.tar.gpg.partial" "$backup_root/business-application.tar.gpg"

python3 "$manifest_helper" "$business_root" "$backup_root/business-manifest.jsonl.partial" "${exclusions[@]}" > "$backup_root/business-post-inventory.txt"
cmp "$inventory_tmp/business.pre.jsonl" "$backup_root/business-manifest.jsonl.partial"
[[ $env_before == "$(sha256sum "$business_root/.env" | awk '{print $1}')" ]] || { echo "business env changed during backup" >&2; exit 65; }
mv "$backup_root/business-manifest.jsonl.partial" "$backup_root/business-manifest.jsonl"
cp "$inventory_tmp/business.inventory" "$backup_root/business-pre-inventory.txt"
cmp "$backup_root/business-pre-inventory.txt" "$backup_root/business-post-inventory.txt"
chmod 0600 "$backup_root"/business-*.txt "$backup_root/business-manifest.jsonl"

(
  cd "$backup_root"
  sha256sum business.env.gpg business-application.tar.gpg business-manifest.jsonl business-pre-inventory.txt business-post-inventory.txt > BUSINESS_SHA256SUMS.partial
  chmod 0600 BUSINESS_SHA256SUMS.partial
  sync -f BUSINESS_SHA256SUMS.partial
  mv BUSINESS_SHA256SUMS.partial BUSINESS_SHA256SUMS
)
sync -f "$backup_root"
echo "business_backup_status=awaiting_restore_rehearsal"
echo "business_backup_path=$backup_root"

#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly pinned_recipient=D9A4E9319B31C4C61A9756225637C2049F70D829
readonly pinned_public_key_sha256=26ce00e3bc63be07e55be4649de52f5cf0943b48fdbd635be4ba0cc55df5faa6
readonly pinned_db_helper_sha256=981ecdcf0c208c2e45fcd48942f1db9d9747180d1c8db779142d246ebbde698f
readonly pinned_manifest_helper_sha256=fabf0123317e76a4971626586b20d55d0c242b78ea016c138a0ffda96f01d177
readonly api_root=/home/azmigran/users.azmigrantat.com
readonly legal_root=/home/azmigran/public_html
readonly backup_base=/home/azmigran/backups
readonly staging_root=/home/azmigran/backups/google-play-release-staging
readonly backup_parent=/home/azmigran/backups/google-play-release

if [[ $# -ne 3 ]]; then
  echo "usage: stage1-backup.sh BACKUP_ID PUBLIC_KEY prechange|maintenance" >&2
  exit 64
fi
readonly backup_id=$1
readonly public_key=$2
readonly expected_state=$3
[[ $backup_id =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "invalid backup id" >&2; exit 64; }
[[ $expected_state == prechange || $expected_state == maintenance ]] || { echo "invalid expected state" >&2; exit 64; }
[[ $(id -un) == azmigran ]] || { echo "must run as azmigran" >&2; exit 77; }

for root in "$api_root" "$legal_root"; do
  [[ -d $root && ! -L $root && $(realpath "$root") == "$root" ]] || { echo "root identity mismatch" >&2; exit 78; }
  [[ $(stat -c %U "$root") == azmigran ]] || { echo "root owner mismatch" >&2; exit 78; }
done
if [[ $expected_state == prechange ]]; then
  [[ ! -e $api_root/.api-maintenance ]] || { echo "unexpected maintenance state" >&2; exit 65; }
else
  [[ -f $api_root/.api-maintenance && ! -L $api_root/.api-maintenance ]] || { echo "maintenance flag missing" >&2; exit 65; }
  [[ -f $api_root/public/api-maintenance.php && ! -L $api_root/public/api-maintenance.php ]] || { echo "maintenance handler missing" >&2; exit 65; }
fi

readonly db_helper=$staging_root/stage1-db-client.php
readonly manifest_helper=$staging_root/stage1-tree-manifest.py
[[ -f $db_helper && ! -L $db_helper && -f $manifest_helper && ! -L $manifest_helper ]] || { echo "staged helper missing" >&2; exit 66; }
[[ -f $public_key && ! -L $public_key ]] || { echo "public key missing" >&2; exit 66; }
[[ $(realpath "$db_helper") == "$db_helper" && $(realpath "$manifest_helper") == "$manifest_helper" && $(realpath "$public_key") == "$public_key" ]] || { echo "staged path identity mismatch" >&2; exit 66; }
[[ $(sha256sum "$db_helper" | awk '{print $1}') == "$pinned_db_helper_sha256" ]] || { echo "DB helper checksum mismatch" >&2; exit 66; }
[[ $(sha256sum "$manifest_helper" | awk '{print $1}') == "$pinned_manifest_helper_sha256" ]] || { echo "manifest helper checksum mismatch" >&2; exit 66; }
[[ $(sha256sum "$public_key" | awk '{print $1}') == "$pinned_public_key_sha256" ]] || { echo "public key checksum mismatch" >&2; exit 66; }
for helper in "$db_helper" "$manifest_helper" "$public_key"; do
  [[ $(stat -c %U:%a "$helper") == azmigran:600 ]] || { echo "staged helper metadata mismatch" >&2; exit 66; }
done
[[ -d $backup_base && ! -L $backup_base && $(realpath "$backup_base") == "$backup_base" && $(stat -c %U "$backup_base") == azmigran ]] || { echo "backup base identity mismatch" >&2; exit 78; }
[[ -d $backup_parent && ! -L $backup_parent && $(realpath "$backup_parent") == "$backup_parent" && $(stat -c %U:%a "$backup_parent") == azmigran:700 ]] || { echo "backup parent identity mismatch" >&2; exit 78; }
readonly backup_root=$backup_parent/$backup_id
[[ ! -e $backup_root ]] || { echo "backup target already exists" >&2; exit 73; }

python3 - "$api_root" "$legal_root" <<'PY'
import os,sys
roots=[os.path.realpath(p) for p in sys.argv[1:]]
mounts=[]
with open('/proc/self/mountinfo',encoding='utf-8') as source:
    for line in source:
        fields=line.split()
        mount=fields[4].replace('\\040',' ').replace('\\011','\t').replace('\\134','\\')
        mounts.append(os.path.realpath(mount))
for root in roots:
    nested=[m for m in mounts if m != root and os.path.commonpath([root,m]) == root]
    if nested:
        raise SystemExit('nested mount point in backup root')
print('nested_mounts=none')
PY

processes=$(ps -u "$(id -u)" -o comm=,args=) || { echo "process inspection failed" >&2; exit 70; }
if awk '$1 ~ /^(ffmpeg|php|php-cgi)$/ && $0 ~ /(phinx|migrate|queue:|worker|ffmpeg|upload)/ {found=1} END{exit found?0:1}' <<< "$processes"; then
  echo "active upload, worker, or migration process" >&2
  exit 65
fi

readonly inventory_tmp=$staging_root/inventory-$backup_id
[[ ! -e $inventory_tmp ]] || { echo "inventory target already exists" >&2; exit 73; }
install -d -m 0700 "$inventory_tmp"
trap 'case ${inventory_tmp:-} in /home/azmigran/backups/google-play-release-staging/inventory-*) rm -rf -- "$inventory_tmp";; esac; if [[ -n ${gpg_home:-} ]]; then case $gpg_home in /home/azmigran/backups/google-play-release-staging/.gnupg-public-*) rm -rf -- "$gpg_home";; esac; fi' EXIT

readonly -a api_exclusions=(
  .env
  public/uploads
  app/storage/cache
  app/storage/logs
  app/storage/sessions
  .api-maintenance
)
readonly -a legal_exclusions=(
  .env
  public/uploads
  backups
  app/storage/cache
  app/storage/logs
  app/storage/sessions
)

python3 "$manifest_helper" "$api_root" "$inventory_tmp/api.pre.jsonl" "${api_exclusions[@]}" > "$inventory_tmp/api.inventory"
python3 "$manifest_helper" "$legal_root" "$inventory_tmp/legal.pre.jsonl" "${legal_exclusions[@]}" > "$inventory_tmp/legal.inventory"

source_summary=$(python3 - "$inventory_tmp/api.pre.jsonl" "$inventory_tmp/legal.pre.jsonl" <<'PY'
import json,sys
items=[json.loads(line) for name in sys.argv[1:] for line in open(name,encoding='utf-8')]
print(sum(x['size'] for x in items if x['type']=='file'),len(items))
PY
)
read -r source_bytes source_entries <<< "$source_summary"
readonly required_bytes=$((source_bytes * 2 + 2147483648))
readonly required_inodes=$((source_entries * 2 + 10000))
filesystem_summary=$(df -B1 --output=avail,iavail "$backup_parent" | awk 'NR==2{print $1,$2}')
read -r fs_available fs_inodes <<< "$filesystem_summary"
(( fs_available >= required_bytes )) || { echo "insufficient filesystem capacity" >&2; exit 70; }
(( fs_inodes >= required_inodes )) || { echo "insufficient filesystem inodes" >&2; exit 70; }

quota_summary=$(uapi --output=json Quota get_quota_info | python3 -c '
import json,sys
r=json.load(sys.stdin).get("result",{})
if not r.get("status"): raise SystemExit("quota API failed")
d=r.get("data",{})
used=float(d.get("megabytes_used",0)); limit=float(d.get("megabyte_limit",0))
iu=int(d.get("inodes_used",0)); il=int(d.get("inode_limit",0))
print(-1 if limit<=0 else int((limit-used)*1024*1024), -1 if il<=0 else il-iu)
')
read -r quota_available quota_inode_available <<< "$quota_summary"
(( quota_available < 0 || quota_available >= required_bytes )) || { echo "insufficient account quota" >&2; exit 70; }
(( quota_inode_available < 0 || quota_inode_available >= required_inodes )) || { echo "insufficient account inode quota" >&2; exit 70; }

gpg_home=$(mktemp -d "$staging_root/.gnupg-public-XXXXXX")
chmod 0700 "$gpg_home"
gpg --batch --homedir "$gpg_home" --import "$public_key" >/dev/null 2>&1
imported=$(gpg --batch --homedir "$gpg_home" --with-colons --fingerprint "$pinned_recipient" 2>/dev/null | awk -F: '$1=="fpr"{print $10; exit}')
[[ $imported == "$pinned_recipient" ]] || { echo "pinned recipient mismatch" >&2; exit 65; }
gpg --batch --homedir "$gpg_home" --with-colons --list-keys "$pinned_recipient" 2>/dev/null | awk -F: '
  ($1=="pub" || $1=="sub") && $2 !~ /[re]/ && $12 ~ /e/ {ok=1}
  END{exit ok?0:1}
' || { echo "recipient is not usable for encryption" >&2; exit 65; }

install -d -m 0700 "$backup_parent" "$backup_root"
[[ $(stat -c '%U:%a' "$backup_root") == azmigran:700 ]] || { echo "backup root metadata mismatch" >&2; exit 78; }
printf 'incomplete\n' > "$backup_root/STATE"

cat > "$backup_root/exclusions.txt" <<'EOF'
API:.env (separately encrypted)
API:public/uploads (persistent user uploads; no Stage 1 change)
API:app/storage/cache (reproducible runtime cache)
API:app/storage/logs (runtime logs; may contain operational data)
API:app/storage/sessions (ephemeral sessions)
API:.api-maintenance (operational switch; never restored from an application snapshot)
LEGAL:.env (separately encrypted)
LEGAL:public/uploads (persistent user uploads; no Stage 1 change)
LEGAL:backups (pre-existing historical backup tree)
LEGAL:app/storage/cache (reproducible runtime cache)
LEGAL:app/storage/logs (runtime logs; may contain operational data)
LEGAL:app/storage/sessions (ephemeral sessions)
EOF
chmod 0600 "$backup_root/exclusions.txt"

encrypt_file() {
  local source=$1 destination=$2 partial=${2}.partial
  [[ ! -e $destination && ! -e $partial ]]
  gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$partial" "$source"
  chmod 0600 "$partial"
  sync -f "$partial"
  mv "$partial" "$destination"
}

api_env_before=$(sha256sum "$api_root/.env" | awk '{print $1}')
legal_env_before=$(sha256sum "$legal_root/.env" | awk '{print $1}')
php "$db_helper" inventory > "$inventory_tmp/db.pre.txt"
encrypt_file "$api_root/.env" "$backup_root/api.env.gpg"
encrypt_file "$legal_root/.env" "$backup_root/legal.env.gpg"

tar --acls --xattrs --xattrs-include='*' --numeric-owner -C /home/azmigran \
  --exclude='users.azmigrantat.com/.env' \
  --exclude='users.azmigrantat.com/public/uploads' \
  --exclude='users.azmigrantat.com/app/storage/cache' \
  --exclude='users.azmigrantat.com/app/storage/logs' \
  --exclude='users.azmigrantat.com/app/storage/sessions' \
  --exclude='users.azmigrantat.com/.api-maintenance' \
  -cpf - users.azmigrantat.com | \
  gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$backup_root/api-application.tar.gpg.partial"
chmod 0600 "$backup_root/api-application.tar.gpg.partial"
sync -f "$backup_root/api-application.tar.gpg.partial"
mv "$backup_root/api-application.tar.gpg.partial" "$backup_root/api-application.tar.gpg"

tar --acls --xattrs --xattrs-include='*' --numeric-owner -C /home/azmigran \
  --exclude='public_html/.env' \
  --exclude='public_html/public/uploads' \
  --exclude='public_html/backups' \
  --exclude='public_html/app/storage/cache' \
  --exclude='public_html/app/storage/logs' \
  --exclude='public_html/app/storage/sessions' \
  -cpf - public_html | \
  gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$backup_root/legal-application.tar.gpg.partial"
chmod 0600 "$backup_root/legal-application.tar.gpg.partial"
sync -f "$backup_root/legal-application.tar.gpg.partial"
mv "$backup_root/legal-application.tar.gpg.partial" "$backup_root/legal-application.tar.gpg"

php "$db_helper" dump | gpg --batch --yes --homedir "$gpg_home" --trust-model always --recipient "$pinned_recipient" --compress-level 0 --encrypt --output "$backup_root/database.sql.gpg.partial"
chmod 0600 "$backup_root/database.sql.gpg.partial"
sync -f "$backup_root/database.sql.gpg.partial"
mv "$backup_root/database.sql.gpg.partial" "$backup_root/database.sql.gpg"
php "$db_helper" inventory > "$backup_root/db-post-inventory.txt"
cmp "$inventory_tmp/db.pre.txt" "$backup_root/db-post-inventory.txt"
cp "$inventory_tmp/db.pre.txt" "$backup_root/db-pre-inventory.txt"

python3 "$manifest_helper" "$api_root" "$backup_root/api-manifest.jsonl.partial" "${api_exclusions[@]}" > "$backup_root/api-post-inventory.txt"
python3 "$manifest_helper" "$legal_root" "$backup_root/legal-manifest.jsonl.partial" "${legal_exclusions[@]}" > "$backup_root/legal-post-inventory.txt"
cmp "$inventory_tmp/api.pre.jsonl" "$backup_root/api-manifest.jsonl.partial"
cmp "$inventory_tmp/legal.pre.jsonl" "$backup_root/legal-manifest.jsonl.partial"
[[ $api_env_before == "$(sha256sum "$api_root/.env" | awk '{print $1}')" ]] || { echo "API env changed during backup" >&2; exit 65; }
[[ $legal_env_before == "$(sha256sum "$legal_root/.env" | awk '{print $1}')" ]] || { echo "legal env changed during backup" >&2; exit 65; }
mv "$backup_root/api-manifest.jsonl.partial" "$backup_root/api-manifest.jsonl"
mv "$backup_root/legal-manifest.jsonl.partial" "$backup_root/legal-manifest.jsonl"

{
  printf 'backup_id=%s\n' "$backup_id"
  printf 'snapshot_state=%s\n' "$expected_state"
  printf 'completed_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'recipient_fingerprint=%s\n' "$pinned_recipient"
  printf 'source_bytes=%s\nrequired_bytes=%s\nfilesystem_available_bytes=%s\nfilesystem_available_inodes=%s\n' "$source_bytes" "$required_bytes" "$fs_available" "$fs_inodes"
  printf 'quota_available_bytes=%s\nquota_available_inodes=%s\n' "$quota_available" "$quota_inode_available"
  printf 'tar_version=%s\n' "$(tar --version | head -n1)"
  printf 'gpg_version=%s\n' "$(gpg --version | head -n1)"
  printf 'php_version=%s\n' "$(php -r 'echo PHP_VERSION;')"
  printf 'ownership=%s\n' "$(stat -c '%U:%G:%a' "$backup_root")"
} > "$backup_root/backup-metadata.txt"
chmod 0600 "$backup_root/backup-metadata.txt" "$backup_root"/*-inventory.txt

(
  cd "$backup_root"
  sha256sum ./*.gpg ./*-manifest.jsonl ./*-inventory.txt ./exclusions.txt ./backup-metadata.txt > SHA256SUMS.partial
  chmod 0600 SHA256SUMS.partial
  sync -f SHA256SUMS.partial
  mv SHA256SUMS.partial SHA256SUMS
)
printf 'awaiting_restore_rehearsal\n' > "$backup_root/STATE.partial"
sync -f "$backup_root/STATE.partial"
mv "$backup_root/STATE.partial" "$backup_root/STATE"
sync -f "$backup_root"

echo "backup_id=$backup_id"
echo "backup_status=awaiting_restore_rehearsal"
echo "backup_path=$backup_root"

# Production deployment — Етап 1

Статус: **завършен; production е online; maintenance е изключен**  
Интервал: 31 октомври 2026 г., приблизително 03:32–03:58 UTC  
Обхват: само разрешените maintenance, backup/restore, payment guard, migration-route removal, safe smoke и off-host backup операции.

## Резултат

- `PAYMENTS_ENABLED=false` е активен и runtime probe връща `false`.
- Backend service guards блокират card save, checkout и Stripe webhook преди validation/provider logic.
- Payment controllers връщат `payments_disabled` / HTTP `503` при in-process probe с реален active production user object.
- Публичният `/webhooks/stripe` върна три последователни `503 payments_disabled` от web SAPI след OPcache revalidation.
- Публичният `/migrations/migrate` route е премахнат и връща `404`.
- Stripe secret не е конфигуриран; backend-ът няма provider credential за създаване на checkout. Не е правена Stripe API заявка.
- Двата съществуващи `payment_methods` реда са запазени без изтриване или миграция. Post-deploy ephemeral HMAC съвпада с authoritative backup-а.
- Не са изпълнявани DB migrations. Ledger остава `20261022000000`; `content_reports` не съществува.
- Не са deploy-вани moderation/reporting или legal страници. Android package name и Google Play не са променяни.

## Криптирани backups и restore rehearsal

Използван е отделен encryption-only GPG recipient:
`D9A4E9319B31C4C61A9756225637C2049F70D829`.

Acceptance records са подписани с отделен signing-only key:
`56D543844E601AE179574D474A2FF71C4ADAEB52`.

### Pre-change set

- production: `/home/azmigran/backups/google-play-release/20261031T034421Z`
- off-host: `/home/kristian/.local/share/etome-production-backup/encrypted-backups/20261031T034421Z`
- state: `complete`
- acceptance: `stage1-backup-20261031T034421Z-acceptance.txt`

### Authoritative maintenance set

- production: `/home/azmigran/backups/google-play-release/20261031T035207Z`
- off-host: `/home/kristian/.local/share/etome-production-backup/encrypted-backups/20261031T035207Z`
- state: `complete`
- acceptance: `stage1-backup-20261031T035207Z-acceptance.txt`

И двата set-а съдържат stream-encrypted API/legal application archives, отделни encrypted `.env` файлове и full transactional DB dump. Plaintext DB dump не е записван на persistent storage.

Restore доказателство за authoritative set-а:

- safe-path validation: API `50 982` archive members; legal `394`;
- exact tree verification: path, type, SHA-256, mode и numeric owner/group — `0` failures;
- source inventory: няма ACL/xattr entries, hard links, escaping symlinks или special nodes;
- disposable MariaDB: official `mariadb:10.11@sha256:d769e37960821dfdcf096954f6e7ac89f747e116c1bba98e48edd265dfc7deae`;
- isolation: Docker `network none`, tmpfs DB storage, event scheduler `OFF`;
- SQL scan: `3 720` lines / `826 002` bytes, без cross-database/global statements;
- restored DB: `31` таблици, `0` non-InnoDB, schema signature match, ledger `20261022000000`;
- aggregates: payment methods `2`, subscriptions `0`, billing events `0`;
- `payment_methods`: ephemeral-key HMAC match; ключът и HMAC стойностите не са записвани.

Disposable DB containers са премахнати след доказването.

## Точни production промени

| Target | Предишно състояние | Текущо състояние / SHA-256 |
|---|---|---|
| `.htaccess` | API-only maintenance block; `cbde51c…` | full dynamic-route maintenance block; `54560ec90089185cff131d487c8b66003fb422d212fcc7fe3adb76027a997fdf` |
| `public/api-maintenance.php` | липсва | `149dcb580df7c8a8edc365cd303578d1e8f624683d5e60e5977991fcc467edbf` |
| `.env` | без `PAYMENTS_ENABLED` | добавен точно един ред `PAYMENTS_ENABLED=false`; останалите bytes са запазени |
| `app/Services/PaymentsFeature.php` | липсва | `e385b1e3a0f46f55b2124d8460cddf1eb65746e6e96f02c63bbe0c75c74b8cb5` |
| `app/Services/PaymentMethodService.php` | без service guard | `14dea0b46e9824a06088dda907e14ee10a19280670ce48b06feaa62fc19c4ba0` |
| `app/Services/SubscriptionService.php` | без checkout/webhook guard | `5e3e0fc0e73912c704a213df7f7215f3411521c2eb6a62a4b0481dfa7386367e` |
| `app/Controllers/Api/PaymentMethodController.php` | без controller guard | `e0d25b831bb3b1ab8b710d61373eef7c7a196835970332f16522c9f697d77eb3` |
| `app/Controllers/Api/SubscriptionController.php` | без controller guard | `c5729632b5e4aeacaaa727e8c8862e86042f2cbe85e42ffba634f35101156823` |
| `routes/web.php` | публичен `/migrations/migrate` | import-ът и route-ът са премахнати; `b76165e4d70f0195c52d5a32e56fc5253f5ef8fcd8363ea797a35a79a0cf9246` |

Всички live PHP/route/maintenance файлове са `azmigran:azmigran`, mode `0644`; `.env` е mode `0600`. Няма ACL или xattr drift. Maintenance flag е премахнат в края.

## Проверки

| Проверка | Статус | Доказателство / ограничение |
|---|---|---|
| Backup capacity, quota, inodes | PASS | cPanel quota и filesystem capacity са над консервативния two-set threshold |
| Encrypted off-host backup | PASS | SHA-256 verification и signed acceptance в два failure domains |
| Disposable application restore | PASS | exact API/legal trees, `0` failures |
| Disposable DB restore | PASS | isolated MariaDB import, schema/ledger/count/HMAC match |
| Rollback artifacts | PASS | pre-change и authoritative complete/signed sets |
| Maintenance coverage | PASS | root/login/API/subscription/webhook/migration routes → JSON `503`, `Retry-After: 60`; static assets не са прихванати |
| Effective payment flag | PASS | exactly one `PAYMENTS_ENABLED=false`; runtime `false` |
| Service guard | PASS | card save, checkout и webhook fail closed |
| Controller guard | PASS | card store, checkout и webhook → `payments_disabled` / `503` с active user object |
| Public webhook / web OPcache | PASS | 3 × `/webhooks/stripe` → `503 payments_disabled` след maintenance-off |
| Authenticated HTTP card/checkout | **PARTIAL** | няма designated plaintext test credential/token; не е създаван token или DB ред. Unauthenticated boundary е `401`. Не се твърди реален authenticated HTTP test. |
| Stripe/provider audit | **N/A / constrained** | `STRIPE_SECRET_KEY` липсва; provider query не е възможна. Това едновременно премахва checkout capability. |
| Migration endpoint | PASS | route count `0`, public status `404` |
| API/login | PASS | `/` `302`, `/users/login` `200`, protected endpoints `401` |
| Chat/realtime | PASS (read-only) | health `200`, Socket.IO polling open packet; без изпратено съобщение |
| Video | PASS (read-only) | video health `200`, protected metadata/playback boundary `401`; без upload/delete |
| Push/audio/video calls/device behavior | NOT RUN | няма устройство/емулатор и не е част от разрешените state-changing smoke операции |
| DB/schema drift | PASS | signature `a535da2…`, ledger `20261022000000`, `content_reports=no` |
| PAN preservation | PASS | count `2`, post-guard ephemeral HMAC match; без deletion/migration |
| Production logs | PASS | log mtime е 29 октомври 2026 г.; няма нов log write в deployment interval |
| Active jobs/uploads/migrations | PASS | `0` matching processes при final audit |

## Отклонения и fail-closed реакции

1. Първият backup helper опит спря преди backup target/live write, защото shared host няма работещ `/dev/fd`. Helper-ът беше коригиран към `/proc/self/fd/3` и без process substitution; failed target не остана.
2. Първият off-host checksum опит разкри absolute-path `SHA256SUMS`. Set-ът беше проверен чрез безопасно basename mapping; helper-ът беше поправен и authoritative set-ът използва portable relative paths.
3. Първият web canary използва грешен URL `/api/mobile/subscription/webhook` и получи `404`. Fail-closed логиката автоматично включи maintenance. След read-only route сверка точният `/webhooks/stripe` canary мина 3/3 и maintenance беше изключен.
4. Първият header parser не разпозна lowercase `retry-after`; директната header проверка потвърди `Retry-After: 60`.

Нито едно отклонение не е довело до PAN/DB mutation, provider call, moderation/legal deploy или незапазено unsafe live състояние.

## Rollback и готовност за Етап 2

Текущият safe rollback baseline за бъдещ Етап 2 е **този guard-only release**, а не старият код без payment guard. При Stage 2 regression:

1. включи `.api-maintenance` атомично;
2. възстанови guard-only hashes от този record/staged artifact;
3. остави `PAYMENTS_ENABLED=false`;
4. не изпълнявай destructive DB down/drop;
5. изключи maintenance само след web runtime и smoke доказателство.

Operationally guard-only baseline-ът е готов за Етап 2. Преди moderation migration/activation е нужно ново изрично разрешение, защото текущото уточнение изрично ги забранява. За пълно изпълнение на payment smoke gate е нужен designated production test account с plaintext credential/token; без него authenticated HTTP card/checkout проверката остава `PARTIAL`.

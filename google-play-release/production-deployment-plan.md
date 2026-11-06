# Контролиран production deployment plan за „Ето ме“

Статус: **подготовка; не е разрешен production write**  
Дата на read-only preflight: 31 октомври 2026 г.

## 1. Цел и твърди ограничения

Планът покрива бъдещо контролирано публикуване на:

- server-side payment guard с ефективно `PAYMENTS_ENABLED=false`;
- moderation/reporting API и additive migration `20261031000000`;
- публични статични страници `/privacy`, `/terms` и `/account-deletion` на `https://azmigrantat.com`;
- production smoke тестове и доказуем rollback.

До ново изрично разрешение са забранени: production writes, migrations, deployment, DNS промени, промяна на secrets, изтриване или миграция на потребителски/картови данни, качване в Google Play и регистриране на нов Firebase app.

`tasks/plan.md` не се променя.

## 2. Потвърдени production факти

- API root: `/home/azmigran/users.azmigrantat.com`; реална директория, не symlink release.
- Legal site root за `azmigrantat.com`: `/home/azmigran/public_html`; също реална директория.
- И двата root-а са non-atomic deployment targets.
- PHP `8.3.36`, Composer, `mysqldump`, `tar`, `rsync` и `sha256sum` са налични.
- API migration ledger е `phinxlog`; последна версия `20261022000000`.
- `content_reports` не съществува.
- `users.id` е `INT UNSIGNED`; `videos.id` е `BIGINT UNSIGNED`; всички проверени таблици са InnoDB/`utf8mb4_unicode_ci`.
- Migration-ът е коригиран локално: `target_id` е `BIGINT UNSIGNED`, с изрични InnoDB/utf8mb4 настройки и fail-closed поведение при неочаквана съществуваща таблица.
- Production `.env` няма `PAYMENTS_ENABLED` ключ.
- Има 2 реда в `payment_methods`, съдържащи `pan_ciphertext`; стойности не са извеждани.
- Няма subscription или billing-event редове при preflight-а.
- API `.htaccess` има maintenance rewrite marker, но `public/api-maintenance.php` липсва. Maintenance **не трябва да се включва**, преди handler-ът да бъде инсталиран и проверен.
- Съществуващият production route `/migrations/migrate` е рисков: приема password в URL и изпълнява нетаргетирани migrations. Локалният release го премахва; activation изисква отделно разрешение.
- CLI OPcache показва `validate_timestamps=On`, `revalidate_freq=2`; това не доказва настройката на web SAPI/LiteSpeed.
- `azmigrantat.com` и `users.azmigrantat.com` сочат към `185.199.38.40`.
- Реалният `azmigrantat.com` application tree не съвпада с локалния `etome/` проект. Legal страниците затова се подготвят като независими статични директории в `public/`, без промяна на catch-all routes.

## 3. Dependency graph и безопасни граници

```text
read-only baseline
    -> проверен maintenance handler
    -> защитени backups + restore rehearsal
    -> guard-only release
    -> payment API smoke gate
    -> additive moderation migration
    -> moderation code/routes activation
    -> API/chat/video smoke gate
    -> legal static pages
    -> public URL smoke gate
    -> observation window + maintenance off
```

Payment guard-ът е отделна първа release граница. След активирането му rollback на moderation връща до **guard-only** състояние, а не до стар код без guard. Това предотвратява повторно отваряне на payment API при rollback.

## 4. Release artifacts и provenance

Преди бъдещ deployment трябва да се създаде immutable manifest със:

- относителен destination path;
- SHA-256 на всеки файл;
- owner/group/mode от production baseline;
- git commit или изрично описан dirty-worktree snapshot;
- SHA-256 на целия release архив;
- отделни manifests за `guard-only`, `moderation` и `legal-static`.

Архивите не съдържат `.env`, database dumps, user uploads, logs или secrets. Те се качват в staging директория извън docroot и се проверяват с `php -l`, `composer validate`, `composer check-platform-reqs` и сравнение на `composer.lock`. Не се изпълнява `composer install` в production, ако dependency closure-ът не се е променил.

## 5. Backup и restore rehearsal

### 5.1 Backup set

В maintenance window, преди промяна:

1. Създава се timestamped директория извън docroot с mode `0700` и owner `azmigran`.
2. Проверяват се свободни bytes/inodes и quota за поне два backup комплекта.
3. Application snapshot на двата root-а запазва owner/group/modes и ACL metadata, като изключва само ясно изброени runtime caches, sessions и големи user uploads. Списъкът с exclusions се записва в manifest.
4. `.env` на API и legal site се архивират отделно с mode `0600`; не се извеждат и не се включват в release архиви.
5. Database dump е transactionally consistent: `mysqldump --single-transaction --quick --routines --triggers --events --hex-blob`, включва целия application DB и `phinxlog`. Ако има non-InnoDB таблица, deployment-ът спира до отделна consistency стратегия.
6. Всеки backup, съдържащ `payment_methods`, се криптира **при създаването**, преди запис върху persistent storage. Encryption key management, достъпът и retention inventory изискват отделно разрешение; plaintext dump не се оставя на диска.
7. Записват се SHA-256, размер, owner/group/mode и UTC timestamp за всеки backup.
8. Backup-ите се копират в втори failure domain само след отделно разрешение и с encryption at rest.

### 5.2 Доказване на restore

Archive readability не е достатъчна. Преди deployment:

- application tar се извлича в отделна временна директория и manifest hashes/modes се сравняват;
- DB dump се импортва в отделна временна database/schema, след което се проверяват `phinxlog`, ключовите table definitions и безопасни aggregate fingerprints;
- restore helper се изпълнява само срещу временен target;
- записват се очакваното време за restore и командите;
- production restore никога не се репетира върху live root.

За `payment_methods` се сравняват row count и HMAC fingerprint върху canonical serialization на редовете, изчислен с еднократен ключ само в процеса. Не се записват PAN, ciphertext, last4, име или fingerprint, който може да се използва за brute force.

## 6. Maintenance window за fixed docroot

### 6.1 Подготовка

- Handler-ът `public/api-maintenance.php` се staging-ва и lint-ва.
- Rewrite block-ът се разширява/проверява да покрива **всички dynamic application routes**, включително API, login, admin, subscriptions, migration endpoints, webhooks, internal callbacks и uploads. Само maintenance handler и предварително одобрени static asset директории остават достъпни.
- Handler installation и `.htaccess` промяната са atomic temp-file + rename и имат собствен backup/hash.
- При включен flag се очаква JSON `503` и `Retry-After`; public static assets остават налични.
- Преди maintenance се изчакват или се оценяват активни uploads/jobs. Ако има активен upload, migration или file switch не започва.

### 6.2 Non-atomic root strategy

Не се използва `rsync --delete` към live root. Всеки нов файл се копира като sibling temp file, проверява се hash/mode/owner и се активира с atomic `rename(2)`. Maintenance остава включен през целия multi-file switch.

`ops/php-deploy/deploy-fixed-maintenance.sh` и production mode на `restore-snapshot.sh` са локално fail-closed/retired. Те не са част от този runbook. Нови backup/restore helpers трябва да минат отделен review и rehearsal, преди да бъдат разрешени.

Copy order:

1. `PaymentsFeature.php`;
2. guard-натите services;
3. guard-натите controllers;
4. payment guard smoke тест;
5. moderation model/controller/view files, но без routes/sidebar;
6. additive migration;
7. API route, admin route и sidebar последни;
8. OPcache/web-worker refresh или доказана timestamp revalidation;
9. smoke тестове;
10. maintenance off само при всички green gates.

Routes никога не се активират преди класовете и схемата, от които зависят.

## 7. Payment guard deployment gate

### 7.1 Ефективна конфигурация

- `.env` се backup-ва отделно.
- Ако ключът липсва, `PAYMENTS_ENABLED=false` се добавя чрез temp file + atomic rename, със запазени owner/group/mode, line endings и всички други bytes.
- Ако ключът съществува повече от веднъж или стойността не е точно `false`, deployment-ът спира.
- След activation отделен runtime probe потвърждава ефективното `false`, без да извежда други env стойности.

### 7.2 Двойна защита

- HTTP controllers блокират запис на карта и включване на auto-renewal.
- `PaymentMethodService::save()` и `SubscriptionService::createCheckout()` имат втори fail-closed guard.
- Delete/read операции могат да останат налични, за да не се заключват съществуващи данни.
- Web checkout route също стига до guard-натия service.
- Webhook обработката е блокирана със същия `payments_disabled`/`503` отговор, докато feature flag е false; service-ът има втори guard. Това може да предизвика Stripe retries и трябва да се наблюдава. Няма разрешен legacy-event processing path в първата публична версия.

### 7.3 Smoke доказателство

С изрично разрешен production test account:

- authenticated POST към card-store и subscription-checkout връща `payments_disabled` преди validation/provider call;
- auto-renewal=true е блокирано; false остава допустимо;
- `payment_methods`, `subscriptions` и `billing_events` aggregate fingerprints са непроменени;
- няма нов Stripe checkout в provider audit/log за test interval;
- не се изпращат реални PAN/CVC; тялото може да е празно, защото guard-ът трябва да се изпълни преди validation.

Ако няма разрешен test account/provider audit, API-level блокирането не се отбелязва като напълно доказано.

## 8. Moderation migration compatibility

Migration `20261031000000_create_content_reports_table.php` е additive: не променя съществуващи таблици/колони и старата версия на приложението я игнорира. Това позволява schema-first deploy. Използва `up()`, а `down()` спира с exception, така че нормален Phinx rollback не може да изтрие moderation данните.

Preflight условия:

- `phinxlog` latest е точно `20261022000000` и няма други pending migration-и;
- `content_reports` и version `20261031000000` не съществуват;
- DB user има нужните `CREATE`, `INDEX` и `REFERENCES` права;
- `users.id = INT UNSIGNED`, InnoDB/utf8mb4; `target_id = BIGINT UNSIGNED` поради `videos.id`;
- migration се изпълнява с точен target: `php vendor/bin/phinx migrate -e production -t 20261031000000`;
- DDL definition се сравнява с canonical expected schema, включително nullable/default/FK actions/indexes/collation;
- `target_id` се обработва като decimal string в PHP, за да не се truncate-ва unsigned BIGINT;
- `active_key` има unique index и налага един pending/reviewing сигнал за reporter + target дори при concurrent requests;
- при частично DDL състояние migration-ът спира за ръчна reconciliation; не се изпълнява автоматичен `down()`.

Rollback след успешно additive migration:

- moderation routes/code могат да се върнат до guard-only release;
- таблицата и ledger редът остават, защото старият код е съвместим;
- schema deletion изисква отделно destructive approval и не е част от този план.

## 9. Moderation activation и smoke tests

Преди route activation се проверяват:

- unauthenticated request -> `401`;
- malformed target/reason/details -> `422`;
- missing/deleted target -> `404`;
- self-report -> `422`;
- duplicate pending/reviewing -> `409`;
- valid report -> `201`, видим в admin queue;
- admin role boundary, CSRF/spam protection и status transitions.

Валидният report smoke test създава production ред. Той се изпълнява само с отделно разрешение, designated test users/content и маркиран test reason. Редът не се изтрива автоматично; може да бъде оставен като resolved audit record след отделно разрешение.

## 10. API, chat и video smoke matrix

### Read-only тестове

- TLS/redirect/status/body за login и public feed с cache-busting query;
- API authentication boundary;
- съществуващ video metadata endpoint;
- signed playback URL и byte-range `206` за предварително избрано съществуващо test video;
- realtime/chat health и WebSocket handshake без изпращане на съобщение;
- production logs за нови fatal/5xx грешки в ограничен UTC interval.

### State-changing тестове, изискващи отделно разрешение

- login/logout с test account;
- изпращане на маркирано test chat съобщение;
- report creation/status transition;
- video upload/processing/playback/delete lifecycle;
- push notification delivery до test device.

Няма автоматично изтриване на тестови данни. Cleanup се описва и разрешава отделно.

## 11. OPcache и web workers

- CLI OPcache стойностите са само индикативни.
- Преди deployment се установяват web-SAPI `opcache.validate_timestamps`, `revalidate_freq` и възможността за cPanel/LiteSpeed/PHP-FPM graceful restart без промяна на secrets.
- Предпочитан gate: хостинг-контролиран graceful restart/purge след atomic file switch.
- Ако restart не е наличен, изчаква се поне web-SAPI revalidation interval и се доказва новият guard чрез runtime response.
- Не се създава публичен `opcache_reset` endpoint.
- Ако стар и нов код се наблюдават едновременно, maintenance остава включен и се изпълнява rollback.

## 12. Legal pages на azmigrantat.com

Подготвеният подход е independent static directories:

- `/home/azmigran/public_html/public/privacy/index.html`;
- `/home/azmigran/public_html/public/terms/index.html`;
- `/home/azmigran/public_html/public/account-deletion/index.html`.
- `/home/azmigran/public_html/public/legal.css`.

Текущите rewrite правила препращат `/privacy` към `/public/privacy`, а public `.htaccess` не rewrite-ва съществуваща директория. Така legal pages не зависят от несинхронизирания PHP routing tree.

Преди activation се backup-ват евентуални съществуващи target директории и stylesheet. Deployment е temp directory/file + atomic rename. Проверяват се status `200`, final URL без redirect към `/`, `text/html; charset=utf-8`, `/legal.css`, mobile viewport, вътрешни links и съдържание без claims за активни плащания.

Публичното твърдение, че user-initiated account deletion премахва запазените платежни методи, съответства на текущия account-deletion код. Забраната в този етап е операторът да не изтрива или мигрира двата PAN реда. Ако сам потребител упражни правото си на изтриване, inventory count може легитимно да се промени и това не трябва да бъде блокирано.

## 13. Rollback matrix

| Failure point | Safe action |
|---|---|
| Backup/restore rehearsal | Stop; няма production change |
| Maintenance handler test | Atomic restore на handler/.htaccess; flag off |
| Guard file switch | Maintenance остава on; restore guard manifest или приложи emergency route deny; не отваряй payments |
| Guard smoke | Roll back до проверен guard-only artifact; `PAYMENTS_ENABLED=false` остава |
| Migration preflight | Stop moderation stage; guard остава активен |
| Partial migration | Maintenance on; manual schema/ledger reconciliation; без automatic down |
| Moderation activation | Restore routes/code до guard-only; additive table/ledger остават |
| Legal pages | Atomic rename към backup directories; API не се засяга |
| OPcache mixed state | Maintenance on; graceful worker restart или code rollback |
| Chat/video regression | Restore moderation release до guard-only, пази payment guard; investigate before reopening |

## 14. Stop conditions

- checksum/restore rehearsal mismatch;
- недостатъчно място/quota/inodes;
- active uploads/jobs без безопасен drain;
- неизвестен `.env` duplicate или permission drift;
- schema/ledger drift или pending migration извън target-а;
- non-InnoDB table в backup scope без consistency strategy;
- невъзможност за web-SAPI OPcache refresh/revalidation;
- неочаквани 5xx/auth/chat/video regressions;
- всяка промяна извън reviewed manifests.

## 15. Audit record

Бъдещият deployment record трябва да съдържа UTC timestamps, operator, approvals, pre/post hashes, backup paths/checksums/modes, restore rehearsal резултат, migration state, effective payment flag, HTTP smoke results, log interval, rollback decision и всички отклонения. Secrets и чувствителни данни не се записват.

## 16. Необходими отделни бъдещи разрешения

1. Production write за инсталиране/тест на maintenance handler и евентуална `.htaccess` корекция.
2. Създаване на application, `.env` и full-DB backups на production и временна restore database.
3. Добавяне на non-secret `PAYMENTS_ENABLED=false` и guard-only file activation.
4. Премахване на публичния `/migrations/migrate` route в production release.
5. Authenticated payment smoke тест и read-only Stripe/provider audit.
6. Изпълнение на Phinx migration `20261031000000`.
7. Activation на moderation routes/admin UI.
8. State-changing moderation/chat/video/push smoke тестове и отделен cleanup.
9. Публикуване на трите static legal directories и `/legal.css` на `azmigrantat.com`.
10. Graceful web-worker/OPcache restart, ако хостингът го изисква.
11. Копиране на encrypted backups във втори failure domain.

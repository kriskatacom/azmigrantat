# Independent cross-model review record

Дата: 31 октомври 2026 г.  
Reviewer: Codex CLI `0.151.0-alpha.7.1`, модел `gpt-5.6-terra`  
Mode: `--sandbox read-only --ignore-user-config --ignore-rules --ephemeral`  
Workspace writes от reviewer: няма.

Първият run завърши, но terminal trace отряза финалния отговор. Ephemeral session не можеше да бъде resumed (`no rollout found`). Review-ът беше повторен еднократно със същия модел/ограничения и `--output-last-message`, за да се запази само финалният резултат.

## Findings и reconciliation

| Severity | Finding | Класификация | Корекция |
|---|---|---|---|
| Critical | `deploy-fixed-maintenance.sh` е non-atomic и използва `rsync --delete` | Valid/actionable | Script-ът е fail-closed/retired за production; runbook-ът изисква temp/hash/atomic rename |
| Critical | `restore-snapshot.sh` може да премахне maintenance по време на restore | Valid/actionable | Production fixed-root restore е fail-closed в helper-а; нужен е нов reviewed restore |
| High | Maintenance block не покрива admin/dynamic routes | Valid/actionable | Подготвен е full-application maintenance block с изключение само за handler/static assets |
| High | Pre-guard restore може да отвори плащанията | Valid/actionable | Rollback baseline е guard-only; pre-guard restore е забранен без emergency approval |
| High | Backup/restore requirements не са имплементирани от helper-ите | Valid blocker | Планът не разрешава deployment преди нови tools, encryption и disposable restore rehearsal |
| High | `install-maintenance.php` не доказва owner/group/ACL/xattr preservation | Valid blocker | Helper-ът не е одобрен; installation чака host-capability check и reviewed replacement |
| Critical | Phinx `change()` позволява automatic table drop | Valid/actionable | Migration е `up()` + fail-closed `down()` |
| High | BIGINT target се cast-ва към PHP integer | Valid/actionable | `target_id` се валидира/пази като decimal string |
| Medium | Duplicate-report check има race | Valid/actionable | Добавен е unique nullable `active_key`; duplicate-key -> `409` |
| High | Checkout payment-disabled response е inconsistent | Valid/actionable | API checkout използва общ `503` + `payments_disabled` |
| High | Stripe webhook може да мутира billing данни при disabled payments | Valid/actionable | Controller и service guard-ват webhook; retries се документират |
| High | Legal deployment пропуска `/legal.css` | Valid/actionable | Stylesheet е включен в manifest/backup/smoke/rollback scope |
| High | Account deletion може да изтрие един от двата PAN реда | Contract misread | User-initiated deletion остава право на потребителя; забранено е operator retirement. Inventory допуска легитимна промяна |
| High | Новият DB backup не е криптиран при създаване | Valid/actionable | Encryption at creation е hard gate за всеки backup с `payment_methods` |
| High | Публичен `/migrations/migrate` route заобикаля контрола | Valid/actionable | Route/import са премахнати от локалния release; production activation иска разрешение |
| Medium | OPcache consistency не е наложена от стария deploy script | Valid/actionable | Старият script е retired; web-SAPI revalidation/graceful restart е hard gate |
| — | Android/Firebase/EAS plan | No concrete issue | Package/Firebase промяна остава блокирана до final verification |

## Остатъчни blockers след корекциите

1. Няма имплементиран и репетиран owner/ACL-preserving backup/restore tool за fixed root.
2. Няма потвърден web-SAPI/LiteSpeed OPcache reset/revalidation mechanism.
3. Maintenance handler липсва в production; локалният full-app block не е deployed.
4. Няма разрешен test account/provider audit за production payment smoke.
5. Play Console не е доказал наличността на `com.etome.app`.
6. Нов Firebase Android app/config за `com.etome.app` не е създаден.

Тези blockers са stop conditions, не задачи за автоматично заобикаляне.


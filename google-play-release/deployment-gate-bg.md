# Задължителен deployment gate преди Google Play review

Payment guard deployment-ът от Етап 1 е завършен и проверен. Moderation и
legal deployment не са изпълнявани и изискват отделно разрешение.

## Users/Auth API

Не променяйте действащото `PAYMENTS_ENABLED=false`. В бъдещ Етап 2 публикувайте
само moderation/reporting промените и изпълнете migration
`20261031000000_create_content_reports_table.php` след отделно разрешение.

Проверки след deployment с тестов акаунт:

1. Повторете authenticated canary, че checkout и payment-method store отказват
   с `payments_disabled` преди validation/provider logic. Service/controller и
   public webhook probes вече са PASS; липсва designated HTTP test credential.
2. `POST /api/mobile/payment-methods/settings` не позволява включване на
   auto-renewal; изключването остава възможно.
3. Изтриването на стар payment method остава възможно.
4. `POST /api/mobile/reports` приема authenticated user/video сигнал, отказва
   self-report и дублиран pending сигнал.
5. `/admin/moderation` показва сигнала и позволява reviewing/resolved/rejected
   с moderator notes.

## Основен сайт

Публикувайте промените в `etome/` и проверете без login, redirect или
geoblocking:

- `https://azmigrantat.com/privacy`
- `https://azmigrantat.com/terms`
- `https://azmigrantat.com/account-deletion`

Собственикът/юристът трябва да одобри съдържанието, retention формулировките и
публичния contact email преди deployment.

## Payment data cleanup

Не изтривайте production записи без backup и одобрен план. Първо установете
броя на записите в `payment_methods`, retention/legal основанието, backup
копията и възможността за възстановяване. След одобрение изпълнете контролирано
purge/rotation действие и запазете audit доказателство без PAN/CVC.

## Release gate

Не изпращайте AAB за review, докато всички проверки по-горе не са PASS и
report/payment flows не са повторени от Play internal-track build на реално
Android устройство.

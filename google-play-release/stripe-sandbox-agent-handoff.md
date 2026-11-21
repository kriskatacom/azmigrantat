# Handoff: завършване на Stripe Sandbox абонаментите за „Ето ме“

## Цел

Продължи от текущото състояние и завърши проверката на Stripe Sandbox
абонамента от приложението към business сайта, Stripe Checkout, обратно към
сайта и към Android приложението.

Не започвай разработката отначало. Кодът и dormant production deployment-ът
вече са подготвени.

## Задължително прочети първо

1. `google-play-release/stripe-sandbox-deployment-status-2026-11-06.md`
2. `google-play-release/stripe-sandbox-deployment-runbook.md`
3. `tasks/stripe-subscriptions-todo.md`
4. `SPEC-stripe-sandbox-checkout.md`
5. `SPEC-admin-plan-config.md`
6. `CAPABILITY-MAP-stripe-subscriptions.md`

Всички пътища са спрямо:

`/home/kristian/projects/azmigrantat`

## Текущо production състояние

- Stripe Sandbox модулът е разработен и deploy-нат в dormant режим.
- Production е онлайн; maintenance режимът е изключен.
- `PAYMENTS_ENABLED=false`.
- `STRIPE_SANDBOX_ENABLED=false`.
- Миграции `20261106153000` и `20261106154500` са приложени.
- Auth-to-business HMAC secrets са конфигурирани без извеждане на стойностите.
- Stripe Test key, webhook secret, tester allowlist и начална Test Price все още
  не са конфигурирани.
- Production Google Play профилът има
  `EXPO_PUBLIC_ENABLE_STRIPE_SANDBOX=false`.
- Не активирай външния Stripe checkout в публичния Google Play build.

## Непроменими ограничения

- Не активирай реални плащания.
- Не създавай Stripe Live обекти.
- Не променяй `PAYMENTS_ENABLED=false`.
- Не извеждай API ключове, webhook secrets, access tokens, cookies, production
  secrets или чувствителни картови данни.
- Не записвай Stripe credentials в Git, business проекта или мобилното
  приложение.
- Не изтривай и не променяй двата съществуващи криптирани PAN записа.
- Не променяй production backend извън описаната Sandbox конфигурация.
- Не променяй Android package name `com.etome.app`.
- Не публикувай в Google Play.
- Не обявявай Android deep-link потока за потвърден без реален Android тест.
- При неочакван production проблем изключи Sandbox, включи maintenance и
  следвай документирания rollback.

## Първа задача: възстановяване на Chrome управлението

Използвай Chrome интеграцията и съществуващия удостоверен таб:

`Home – Tech Solution sandbox – Stripe [Test]`

Очакван Stripe URL prefix:

`https://dashboard.stripe.com/acct_1UT0FfBAceHEGRPg/test/`

Chrome разширението беше инсталирано от ChatGPT Settings по време на предишен
активен разговор. Това вероятно е оставило стара browser-control сесия.

Предишната диагностика установи:

- Chrome разширението е инсталирано и активно.
- Native-host manifest е правилен.
- Chrome може да бъде стартиран.
- Табовете, title и URL могат да бъдат прочетени.
- DOM snapshot, screenshot, click и field interaction се провалят с:

  `Cannot read properties of undefined (reading 'timeoutMs')`

В новата сесия направи само read-only проверка:

1. Провери, че Chrome работи.
2. Свържи се чрез официалната Chrome/Browser интеграция.
3. Намери и claim-ни точния Stripe Sandbox таб от актуалния списък с табове.
4. Прочети DOM snapshot.
5. Направи screenshot или друга визуална проверка.
6. Потвърди, че акаунтът е Test/Sandbox, а не Live.
7. Не създавай и не променяй Stripe обекти при тази проверка.

Ако интеграцията отново не може да управлява страницата, следвай официалната
Chrome troubleshooting процедура. Не използвай shell/Playwright/друг обходен
механизъм за удостоверената браузърна сесия.

## Задължително потвърждение преди Stripe промени

Създаването на API/restricted key е persistent access. Непосредствено преди
създаването поискай blocking action-time потвърждение от потребителя за точно
следните действия в Stripe Sandbox акаунта:

1. Създаване на least-privilege restricted Test API key.
2. Създаване или повторно използване на един Test Product за платения план.
3. Създаване на първата месечна EUR Test Price.
4. Създаване на Test webhook endpoint към:

   `https://users.azmigrantat.com/webhooks/stripe`

Не приемай предишно общо разрешение като замяна на action-time потвърждението.

Преди действията трябва да се уточнят още:

- точният имейл на съществуващия профил в „Ето ме“, който ще бъде добавен в
  server-side Sandbox allowlist;
- началната тестова цена в EUR/месец.

Не приемай автоматично, че Play tester имейлът е съществуващ app профил.

## Stripe Sandbox конфигурация

След потвърждението:

1. Работи само в Stripe Sandbox/Test режим.
2. Създай restricted key само с необходимите права за Account read,
   Products/Prices, Checkout Sessions и Subscriptions, според реално
   използваните API операции.
3. Не създавай дублиращ Product, ако вече има ясно идентифициран „Ето ме“ Test
   Product.
4. Създай месечната EUR Price чрез deploy-натия admin flow, когато е възможно,
   за да се запише audit ledger и активната локална mapping конфигурация.
5. Създай Test webhook endpoint и използвай само неговия signing secret.
6. Абонирай webhook-а само за необходимите събития, включително:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - необходимите `customer.subscription.*` lifecycle събития
7. Съхрани restricted Test key и webhook secret само в защитената auth
   production `.env`, с атомична промяна и без отпечатване на стойностите.
8. Добави само потвърдения имейл в `STRIPE_SANDBOX_ALLOWED_EMAILS`.
9. Остави `PAYMENTS_ENABLED=false`.
10. Активирай `STRIPE_SANDBOX_ENABLED=true` едва след успешна configuration
    probe и потвърден Test mode.

## Задължителни проверки след конфигурацията

- Stripe account ID съвпада с очаквания Sandbox акаунт.
- Product и Price са `livemode=false`.
- Активната локална Price mapping съвпада със Stripe Test Price.
- Admin страницата показва правилната цена и Sandbox режим.
- Неудостоверените и неподписаните API заявки остават блокирани.
- Само allowlist-натият потребител може да започне checkout.
- Друг потребител получава отказ.
- `PAYMENTS_ENABLED=false` остава непроменено.
- Двата криптирани PAN записа са непроменени; сравни само безопасни aggregate
  стойности/HMAC, без извеждане на съдържание.

## EAS staging build

Вътрешният staging build е:

- Build ID: `593aaafc-2c5f-4363-b0e9-410b2785610f`
- Package: `com.etome.app`
- Version code: `9`
- Distribution: `INTERNAL`
- Profile: `staging`

Провери текущия му EAS статус. Ако е завършен успешно:

1. Изтегли APK артефакта в `google-play-release/` с ясно staging име.
2. Запиши SHA-256.
3. Провери действителния package name.
4. Не го публикувай.

EAS автоматично създаде отделен remote staging keystore, защото staging
профилът нямаше такъв. Production профилът продължава да използва съществуващия
local keystore. Не използвай staging сертификата за Google Play.

## Краен Stripe Test checkout

Извършването на тестова транзакция и въвеждането/предаването на тестови
платежни данни изисква отделно action-time потвърждение непосредствено преди
действието.

След потвърждението:

1. Инсталирай staging APK на реално Android устройство или предостави APK на
   потребителя за инсталиране.
2. Влез с точно allowlist-натия съществуващ app профил.
3. Стартирай платения Test план от приложението.
4. Потвърди app → `business.azmigrantat.com` → Stripe Test Checkout.
5. Използвай само официална Stripe test карта; не използвай и не записвай
   реална карта.
6. Завърши тестовото плащане.
7. Потвърди подписания webhook и idempotent event ledger.
8. Потвърди subscription запис със статус `active` или `trialing`.
9. Потвърди completed checkout handoff.
10. Потвърди site → `chatapp://subscription-result` → app.
11. Потвърди, че мобилният екран проверява subscription API и не вярва само на
    deep-link параметъра.
12. Потвърди, че платеният план се показва активен след refresh/relogin.

Ако няма Android устройство, не обявявай deep-link теста за успешен. Докладвай
го като непотвърден и дай точни стъпки за ръчния тест.

## След теста

- Запази `PAYMENTS_ENABLED=false`.
- По подразбиране изключи `STRIPE_SANDBOX_ENABLED` отново, освен ако
  потребителят изрично поиска ограничен Sandbox тестов прозорец да остане
  активен.
- Не изтривай Stripe Test обекти или тестови DB записи без отделно разрешение.
- Обнови:
  - `google-play-release/stripe-sandbox-deployment-status-2026-11-06.md`
  - `tasks/stripe-subscriptions-todo.md`
- Документирай създадените non-secret Stripe object IDs, build SHA-256,
  проверките, устройството и оставащите ограничения.

## Google Play ограничение

Този поток е само за Stripe Sandbox и вътрешен staging APK. Не включвай външен
checkout за цифров абонамент в публичния Google Play build, докато не бъдат
потвърдени приложимата Google Play програма, user-choice екранът, external
transaction token-ите и изискваното transaction reporting.

## Очакван финален отчет

Отчетът трябва ясно да разделя:

- проверено автоматично;
- проверено в production конфигурацията;
- проверено чрез Stripe Dashboard;
- проверено на реално Android устройство;
- непотвърдено или блокирано;
- точните production промени;
- rollback състоянието;
- оставащите действия на потребителя.

Не представяй Sandbox конфигурацията или checkout-а като завършени, ако няма
действително успешен подписан webhook и активен subscription запис.

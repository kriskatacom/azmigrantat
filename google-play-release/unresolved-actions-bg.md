# Нерешени действия и блокери

## Блокиращи публикуването

1. **UGC reporting/moderation е реализирано локално, но не е deploy-нато.**
   Добавени са report user/video, block/unblock, authenticated report API,
   database migration и admin review queue. Преди review са нужни deployment,
   migration, operational owner/SLA и device acceptance test.

2. **Правните страници са подготвени, но не са deploy-нати.** На 31.10.2026 г.
   `https://azmigrantat.com/privacy` и `/terms` се пренасочват към началната
   страница. Play изисква публична, app-specific, non-editable web policy без
   login/geoblocking.

3. **Web account-deletion ресурсът е само локален.** `/account-deletion` е
   добавен с in-app стъпки и email заявка, но публичният URL още пренасочва.

4. **Payment flow е изключен и server guard е deploy-нат.** Новият AAB скрива
   payment UI и отказва client mutations; production backend е с
   `PAYMENTS_ENABLED=false` и fail-closed guards. Двата исторически encrypted
   PAN записа не са изтрити/мигрирани и остават отделен документиран риск.

5. **Няма реални Android screenshots/device acceptance test.** В средата няма
   устройство или AVD. Не са генерирани фалшиви screenshots. Финалният bundle
   трябва да бъде инсталиран през Play internal track и тестван.

## Трябва да потвърдите

- Потвърдете Google Login и FCM на реално устройство с версията, инсталирана
  от Play Internal testing. Package-ът и Play App Signing fingerprints вече са
  проверени и регистрирани във Firebase/Google OAuth.
- Developer account тип и дата на създаване (за 12 testers/14 days rule).
- Target audience/минимална възраст; в приложението няма age gate.
- Съдържа ли приложението реклами, paid placements или server-driven ads.
- Публичен support email и reviewer demo account без OTP/2FA.
- Data retention, backup deletion, video/provider deletion и log съдържание.
- Service-provider договори и дали данните се „shared“ по Data safety.
- Решение за безопасно изтриване или изолиране на историческите PAN записи и
  проверка за card data в logs, backups и APM.
- Реален moderation owner/SLA и контакт за ескалации.
- Декларации за full-screen intent и foreground services плюс demo videos.

## Неблокиращи, но препоръчителни

- Добавете отделни production E2E tests за mobile auth/chat/video flows.
- Включете crash reporting само след privacy/Data safety оценка.
- Направете security review на auth, payment card handling и media uploads.
- След OAuth propagation тествайте Google Sign-In/FCM от Play build; нов AAB
  не е необходим за добавените server-side fingerprints.

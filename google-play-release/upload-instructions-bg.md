# Качване в Google Play Console — стъпка по стъпка

Тези стъпки не публикуват автоматично приложението.

1. Влезте в Play Console и създайте ново app с име `Ето ме`, default language
   Bulgarian и избрания account type.
2. Потвърдете, че package name при първото качване е `com.etome.app`. След
   качването той не може да бъде сменен за това приложение.
3. Попълнете Main store listing с файловете и текстовете от този пакет.
4. Не продължавайте към review, докато няма минимум 2 реални Android
   screenshots и работещ privacy policy URL.
5. В `Policy and programs > App content` попълнете всички секции от
   `play-console-checklist-bg.md`, включително App access, Data safety,
   account deletion, content rating, target audience и permissions.
6. Декларирайте, че в тази версия няма покупки/плащания. Mobile payment UI и
   mutations са изключени, а production API guard е `PAYMENTS_ENABLED=false`.
   Не добавяйте Play Billing/Stripe за този release.
7. Решете UGC блокера: report user/content и реален moderation процес.
8. Създайте Internal testing release. При първото качване приемете Play App
   Signing. EAS signing key-ът трябва да остане upload key.
9. Качете `.aab` от `build/` чрез `Create new release > App bundles`.
10. Добавете release notes за `bg-BG`.
11. Запазете release-а без production rollout и изчакайте automated checks.
12. Стартирайте Play pre-launch report и проверете резултатите на различни
    Android версии.
13. Инсталирайте точно Play-delivered build-а от internal/closed track на поне
    две реални устройства и изпълнете device checklist-а в
    `verification-report-bg.md`.
14. Ако account-ът е нов personal account, изпълнете 12 testers/14 days closed
    test изискването.
15. Едва след owner review на Data safety, privacy, target audience, content
    rating, payments и UGC натиснете `Send for review`/production rollout.

## Проверка на подписването след качване

След като Play Console приеме първия bundle:

- запишете SHA-1 и SHA-256 на Play App Signing certificate;
- добавете Play signing certificate към Firebase/Google OAuth Android client,
  без да премахвате съществуващия EAS upload certificate;
- изтеглете обновения `google-services.json` само ако Firebase го изисква за
  следваща версия;
- тествайте Google Sign-In и FCM от Play-delivered build, защото Play re-signва
  инсталирания APK.

# Контролен списък за Google Play Console

## Създаване на приложението

- [ ] App name: `Ето ме`.
- [ ] Default language: Bulgarian (`bg-BG`).
- [ ] App/Game: App.
- [ ] Free/Paid: потвърдете бизнес решението; то не може свободно да се върне
  от free към paid след публикуване.
- [ ] Потвърдете package name `com.etome.app` преди първото качване.

## Store listing

- [ ] Копирайте текстовете от `store-listing-bg.md`.
- [ ] Качете `graphics/play-icon-512.png`.
- [ ] Качете `graphics/feature-graphic-1024x500.png`.
- [ ] Качете минимум 2 реални Android screenshots; текущо липсват.
- [ ] Въведете потвърден support email и website.
- [ ] Въведете работещ, публичен, app-specific privacy policy URL.

## App content

- [ ] Deploy-нете и проверете подготвените `/privacy` и `/terms`; текущо
  публичните URL адреси още пренасочват към началната страница.
- [ ] Ads — в клиента не е намерен ads SDK; изберете „No“ само след
  потвърждение, че няма server-driven реклами/платени позиции.
- [ ] App access — дайте постоянен review акаунт без OTP/2FA, с инструкции на
  английски за чат, calls, video upload и profile deletion.
- [ ] Target audience — потвърдете минималната възраст. В регистрацията няма
  age gate; социално приложение с UGC не трябва да се декларира за деца без
  Families-compliant дизайн и процеси.
- [ ] Content rating — отговорете според реални чатове, профили, видеа, live
  streams и UGC; не избирайте отговори по предположение.
- [ ] Data safety — прехвърлете и потвърдете `data-safety-bg.md`.
- [ ] Account deletion — deploy-нете и проверете подготвения
  `/account-deletion`; in-app path съществува.
- [ ] UGC — deploy-нете report API/migration/admin queue, определете owner/SLA
  и тествайте report user/video плюс block user на устройство.
- [ ] News/Health/Financial declarations — изберете само приложимите според
  окончателния scope.

## Permissions declarations

- [ ] Full-screen intent: декларирайте `receiving phone or video calls` и
  предоставете демонстрация на входящо обаждане.
- [ ] Foreground service `camera`, `microphone`, `mediaPlayback`: обосновете
  ongoing audio/video call; видима notification и stop control.
- [ ] Foreground service `dataSync`: обосновете user-initiated video upload;
  notification показва progress и има cancel действие. Подгответе demo video.
- [ ] Camera и microphone: обяснете calls, camera capture и audio messages.
  Card scan/payment UI е изключен. Разрешенията се искат в контекст.
- [ ] Photo/video permissions: bundle-ът не трябва да съдържа broad
  `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`; приложението използва pickers.
- [ ] Прегледайте окончателния merged manifest от `.aab` преди подаване.

## Монетизация

- [x] Release build-ът е с `EXPO_PUBLIC_ENABLE_PAYMENTS=false`; payment CTA,
  card entry и checkout не са достъпни.
- [ ] Преди публичен release deploy-нете server guard-а
  `PAYMENTS_ENABLED=false` и проверете, че checkout/PAN POST заявките се
  отказват.
- [ ] Изберете `No in-app purchases` за тази версия и не конфигурирайте Play
  Billing/Stripe продукт.

## Release и тестване

- [ ] Активирайте Play App Signing при първото качване; upload key остава EAS
  key-ът.
- [ ] Качете финалния `.aab` само след всички блокери и device тестове.
- [ ] Пуснете Internal test и Play pre-launch report.
- [ ] Проверете Android vitals, permission warnings и policy status.
- [ ] Ако developer account е personal и е създаден след 13.11.2023 г.:
  проведете Closed test с поне 12 opted-in testers за 14 последователни дни,
  след което кандидатствайте за Production access.
- [ ] Добавете release notes от `release-notes-bg.md`.
- [ ] Не натискайте `Start rollout to production`, докато checklist-ът не е
  приключен и owner-ът не е одобрил декларациите.

Официални източници:

- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Store assets: https://support.google.com/googleplay/android-developer/answer/9866151
- App review content: https://support.google.com/googleplay/android-developer/answer/9859455
- UGC/permissions/payments policy: https://support.google.com/googleplay/android-developer/answer/18265346
- Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- New personal account testing: https://support.google.com/googleplay/android-developer/answer/14151465

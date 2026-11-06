# Google Play release пакет — „Ето ме“

Дата на проверката: 31.10.2026 г.

Тази директория съдържа проверените материали за първоначално публикуване в
Google Play. Пакетът не е готов за изпращане за review, докато блокиращите
точки в `unresolved-actions-bg.md` не бъдат решени. Не са използвани измислени
screenshots или непотвърдени декларации.

## Съдържание

- `build/eto-me-1.0.0-9-com.etome.app-production.aab` — окончателният подписан
  production Android App Bundle от EAS.
- `graphics/` — Play icon 512×512 и feature graphic 1024×500.
- `screenshots/` — инструкции и статус за реалните Android screenshots.
- `store-listing-bg.md` — български Store Listing текстове.
- `release-notes-bg.md` — бележки за първото издание.
- `data-safety-bg.md` — работна Data safety декларация, базирана на кода.
- `payment-risk-audit-bg.md` — установеният PAN/CVC риск и release controls.
- `deployment-gate-bg.md` — неизпълнените API/site deployment и проверки.
- `production-deployment-plan.md` — коригираният fixed-root backup,
  maintenance, deployment, smoke и rollback runbook.
- `independent-cross-model-review.md` — findings и reconciliation от независим
  read-only review с `gpt-5.6-terra`.
- `pan-retirement-plan-bg.md` — отделен план за бъдещо премахване на двата
  криптирани PAN записа; няма извършено изтриване или миграция.
- `android-package-migration-plan.md` — изпълнената миграция към
  `com.etome.app` и оставащите Play/device стъпки.
- `android-identity-google-login-bg.md` — Firebase/OAuth/signing доказателства
  и инструкция за Play App Signing fingerprints.
- `legal-site/public/` — готови статични legal assets за бъдещо публикуване на
  `azmigrantat.com`; не са deployed.
- `play-console-checklist-bg.md` — контролен списък за Play Console.
- `permissions-declarations-bg.md` — чернови за Android permission forms.
- `reviewer-access-template-en.md` — английски шаблон за reviewer credentials.
- `upload-instructions-bg.md` — стъпки за качване без автоматично публикуване.
- `verification-report-bg.md` — резултати от техническите проверки.
- `unresolved-actions-bg.md` — блокери и потвърждения от собственика.

## Идентичност на Android приложението

- Име: **Ето ме**
- Package name: `com.etome.app`
- Version name: `1.0.0`
- Version code: 9
- Expo SDK: 57.0.0 (`expo` 57.0.31)
- Target/compile SDK: Android API 36
- Min SDK: Android API 24

Android package е мигриран към окончателния `com.etome.app`. iOS identifier не
е променян. Новият Firebase Android app е добавен в съществуващия проект, а
старият app/OAuth credentials са запазени.

## AAB идентификатор

- EAS build: `fb2346db-a452-4693-96fb-37646e7a3cc4`
- SHA-256:
  `c80042d05a669da4c07f9829842ad1939e55c0441c9a04425f294b8163bb97b4`
- Signing certificate SHA-256:
  `99:4B:63:87:9E:0A:74:ED:71:0B:0F:1A:B1:65:71:6D:A1:29:6D:1A:DC:D5:70:19:94:7C:FC:3A:30:53:51:B4`

ZIP целостта, JAR подписът и binary manifest-ът са проверени локално.
Сертификатът е същият съществуващ EAS upload key; нов ключ не е генериран.

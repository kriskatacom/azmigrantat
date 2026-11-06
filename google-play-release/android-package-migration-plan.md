# Android package migration към `com.etome.app`

Статус: **локалната/Firebase/EAS миграция е завършена; Play device acceptance
остава**.

## Завършено

- Expo Android package, native namespace/applicationId и Kotlin package/path са
  `com.etome.app`.
- iOS bundle identifier не е променян.
- Нов Android app `com.etome.app` е регистриран в съществуващия Firebase
  project `etome-realtime-application`; старият Android app е запазен.
- Официалният `google-services.json` съдържа новия Android client, Android
  OAuth client и съществуващия Web OAuth client.
- SHA-1 и SHA-256 на съществуващия EAS upload certificate са регистрирани.
- Play App Signing SHA-1/SHA-256 са регистрирани, а отделният автоматично
  създаден Android OAuth client е проверен за `com.etome.app` и Play SHA-1.
- Съществуващият keystore е използван чрез local EAS credentials; нов ключ не
  е генериран.
- Production EAS build `fb2346db-a452-4693-96fb-37646e7a3cc4` е FINISHED.
- Binary manifest: `com.etome.app`, version `1.0.0 (9)`, SDK 24/36/36.
- Deep-link scheme остава `chatapp`, за да не се променя iOS contract-ът.

## Google Sign-In съвместимост

Mobile и backend използват един и същ Web OAuth client като token audience.
Backend account linking остава по Google `sub` с email fallback. Не са
изтривани Firebase apps/OAuth credentials или потребителски акаунти.

Това е проверено по конфигурация и код, но **не е реално Android тестване**.
Няма свързано устройство/емулатор.

## Остава след Play конфигурацията

1. Изчакайте OAuth propagation.
2. Инсталирайте build-а от Play Internal testing и тествайте Google Sign-In и
   FCM на реално устройство. Нов AAB не е нужен за добавените fingerprints.

## Acceptance criteria преди production rollout

- Play Console приема package `com.etome.app` и AAB build 9.
- Play App Signing fingerprints са добавени във Firebase.
- Google Sign-In: нов и съществуващ акаунт, logout/login и cancel/error flow.
- FCM: foreground, background и killed app.
- Реални Android screenshots са заснети от Play-delivered build.
- Device checklist-ът за chat, calls, video upload/playback и offline mode е
  изпълнен.

Не е извършено ново качване или production публикуване при тази конфигурация.

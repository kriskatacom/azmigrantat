# Android идентичност, Firebase и Google Login

Дата: 06.11.2026 г.

## Проверено автоматично

- Окончателен Android package: `com.etome.app`.
- iOS bundle identifier е запазен: `com.anonymous.chatapp`.
- Firebase project: `etome-realtime-application`.
- Firebase Android App ID: `1:149310026747:android:145a6fc63554a2c8ab915e`.
- Новият официален `google-services.json` съдържа `com.etome.app`; старият
  `com.anonymous.chatapp` client е запазен.
- Android OAuth client за `com.etome.app` е свързан с SHA-1 на upload key-а.
- SHA-1 и SHA-256 на съществуващия EAS upload key са регистрирани във Firebase.
- SHA-1 и SHA-256 на действащия Google Play App Signing certificate са
  регистрирани във Firebase, без да се премахват EAS отпечатъците.
- SHA-1 и SHA-256 на проектния local development keystore са регистрирани към
  `com.etome.app`; development build вече има собствен Android OAuth client.
- Firebase/Google автоматично създаде отделен Android OAuth client за
  `com.etome.app` и Play SHA-1. Това не е ненужен дубликат: двата Android
  клиенти покриват различните local development, EAS upload и Play app-signing
  сертификати.
- Mobile `webClientId` е съществуващият Web OAuth client и съвпада с backend
  `GOOGLE_WEB_CLIENT_ID` contract-а.
- Backend проверява Google ID token срещу Web audience и свързва потребител по
  Google `sub`, с email fallback. Смяната на Android package не създава нова
  потребителска база и запазва съвместимостта на съществуващите акаунти.
- Firebase Authentication Google provider е включен.
- Production AAB е подписан със съществуващия upload keystore; нов ключ не е
  създаван.

## Upload certificate

- SHA-1: `AB:55:52:05:9A:8D:FC:CD:0E:B7:C1:7D:AA:0F:A8:03:27:16:65:FD`
- SHA-256: `99:4B:63:87:9E:0A:74:ED:71:0B:0F:1A:B1:65:71:6D:A1:29:6D:1A:DC:D5:70:19:94:7C:FC:3A:30:53:51:B4`

## Local development certificate

- SHA-1: `21:9F:2A:A5:CF:A1:07:93:9C:3F:1C:CC:96:1F:DD:AF:BB:BD:FB:D2`
- SHA-256: `7E:92:0F:E6:DB:3B:D2:B2:75:FF:6E:36:CB:12:81:D7:F9:EB:0D:5B:AC:04:00:14:87:F4:35:DD:E8:89:7D:D4`
- Android OAuth client за development подписа:
  `149310026747-24kbotpd1tgbqgj8geilea40nmv4u59v.apps.googleusercontent.com`

## Google Play App Signing certificate

- SHA-1: `9D:32:FA:C5:82:65:D8:30:E8:A4:00:FD:E4:CF:EC:DF:00:F0:67:37`
- SHA-256: `54:25:79:86:7B:F1:7D:F2:B7:C1:CC:7E:FF:EC:30:4F:4A:CE:73:66:35:26:26:53:05:CF:97:D5:52:07:22:CE`
- Android OAuth client за Play подписа:
  `149310026747-ot3j192iqkbvgfur5vnlrh0cok2ols1s.apps.googleusercontent.com`
- Package/SHA-1 са проверени директно в Google Auth Platform.

## Нужен ли е нов AAB

Не. Промяната е server-side регистрация на допълнителен подписващ сертификат.
Текущият Play build вече съдържа `com.etome.app`, правилния Firebase App ID и
непроменения Web OAuth client ID. Обновеният `google-services.json` е
синхронизиран локално и съдържа development, EAS и Play Android OAuth
клиентите. Нов AAB не е условие за активиране на Google Login в вече качената
версия.

## Проверено на свързано Android устройство

- Инсталираният package е `com.etome.app`, версия `1.0.0` (`versionCode 1`).
- Инсталираният APK е подписан с local development SHA-1/SHA-256, които са
  регистрирани към същото Firebase Android приложение.
- Реален успешен Google Sign-In все още не е потвърден, защото изборът и
  одобрението на Google профил трябва да бъдат извършени от потребителя.

## Оставаща проверка на устройство

1. На текущия development build изпълнете Google login след разпространение на
   OAuth настройката.
2. Инсталирайте/обновете build 9 чрез Play Internal testing opt-in линка.
3. На Play-инсталирания build изпълнете: clean Google login, logout/login,
   съществуващ Google акаунт, отменен account chooser, FCM foreground,
   background и killed-app push.
4. Едва след PASS приемете Google Login/FCM като device-потвърдени.

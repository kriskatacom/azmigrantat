# Резултати от проверките

Дата: 31.10.2026 г.

## Build конфигурация

| Проверка | Статус | Доказателство/бележка |
|---|---|---|
| App name | PASS | `Ето ме` в Expo config |
| Package name | PASS | `com.etome.app` в Expo, Firebase, EAS metadata и binary AAB manifest |
| Version name | PASS | `1.0.0` |
| Version code | PASS | EAS remote auto-increment до 9 |
| SDK | PASS | Expo SDK 57; RN Android defaults min 24, target/compile 36 |
| Production endpoints | PASS по конфигурация и health | business root 200; realtime `/health` 200 JSON; video `/health` 200 JSON; users root пренасочва към `azmigrantat.com`, затова API acceptance остава за device test |
| Staging leakage | PASS по статичен анализ | production profile е `EXPO_PUBLIC_APP_ENV=production`; validator блокира staging tuple |
| Existing signing | PASS | EAS използва съществуващия local keystore; не е генериран нов key |
| AAB build | PASS | EAS build `fb2346db-a452-4693-96fb-37646e7a3cc4`; `eto-me-1.0.0-9-com.etome.app-production.aab` |
| AAB archive | PASS | 133 MB; ZIP проверката не откри грешки |
| AAB signature | PASS с предупреждения | `jarsigner`: `jar verified`; стандартен self-signed upload certificate без timestamp; виж бележката по-долу |
| AAB SHA-256 | PASS | `c80042d05a669da4c07f9829842ad1939e55c0441c9a04425f294b8163bb97b4` |
| Signing certificate | PASS | SHA-256 `99:4B:63:87:9E:0A:74:ED:71:0B:0F:1A:B1:65:71:6D:A1:29:6D:1A:DC:D5:70:19:94:7C:FC:3A:30:53:51:B4`; валиден до 24.01.2054 г. |
| Final manifest permissions | PASS | build 9 няма `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` или broad `READ_MEDIA_IMAGES/VIDEO` |
| Payments release flag | PASS в AAB конфигурацията | EAS production profile съдържа `EXPO_PUBLIC_ENABLE_PAYMENTS=false`; payment UI/mutations са блокирани |
| Payment server guard | PASS | Stage 1 deploy: `PAYMENTS_ENABLED=false`; card save, checkout и webhook fail closed |
| UGC reporting | PASS по код / BLOCKED до deployment | mobile user/video report, API, migration и admin queue са реализирани; production API още няма endpoint/table |
| Legal pages | PASS по код / BLOCKED до deployment | `/privacy`, `/terms`, `/account-deletion` са добавени локално; публичните URL адреси още пренасочват |

## Автоматични проверки

| Команда | Резултат |
|---|---|
| `npm run validate:environment -- --profile production` | PASS |
| `npm run lint` | PASS след премахване на 2 предупреждения |
| `npx tsc --noEmit` | PASS |
| Vitest (`app/chat-app/tsconfig`) | PASS — 18 файла, 92 теста |
| Realtime service Vitest | PASS — 12 файла, 127 теста |
| Video service tests | PASS — 37 теста |
| PHP backend tests | NOT RUN — PHP runtime не е наличен в работната среда |
| Production JS export | PASS — Android Hermes bundle 6.6 MB, 2399 modules |
| Expo Doctor | 20/21 PASS — остава metadata warning за custom native modules и `react-native-webrtc` New Architecture status |
| `npm audit fix` | PARTIAL — critical finding е премахнато; остават 34 transitive findings (6 high), за които автоматичният fix изисква breaking Expo смяна |
| Expo config resolution | PASS — SDK 57.0.0, Android config се резолвира |

Expo Doctor първоначално откри Hermes memory regression в Expo 57.0.6/RN
0.86.0 и липсващ `expo-asset`. Build 4 беше отменен, зависимостите бяха
изравнени до Expo 57.0.31/RN 0.86.3 и всички проверки бяха повторени преди
build 5.

Преди финалния build беше премахнато отпечатването на целия Expo push token в
production console logs. Build 5 беше отменен, така че тази промяна да присъства
в build 6. Финалната manifest проверка на build 6 откри транзитивно добавено
`SYSTEM_ALERT_WINDOW`; разрешението и legacy storage permissions бяха блокирани
изрично. Build 9 заменя build 8 с окончателния `com.etome.app` и Firebase config.

`jarsigner` потвърждава подписа, но показва очаквани предупреждения за
self-signed Android upload certificate, липса на timestamp и начина, по който
JDK чете някои AAB ZIP атрибути. Това не е failure на подписа; Google Play
проверява upload key-а при качването и при включен Play App Signing подписва
дистрибуционните APK файлове с app signing key.

## Публични URL проверки

| URL | Резултат |
|---|---|
| `https://business.azmigrantat.com` | 200 |
| `https://realtime.azmigrantat.com/health` | 200 JSON |
| `https://video.azmigrantat.com/health` | 200 JSON |
| `https://users.azmigrantat.com` | пренасочва към `https://azmigrantat.com/`; mobile API трябва да се потвърди с acceptance test |
| `https://azmigrantat.com/privacy` | пренасочва към началната страница — BLOCKED |
| `https://azmigrantat.com/terms` | пренасочва към началната страница — BLOCKED |
| `https://azmigrantat.com/account-deletion` | пренасочва към началната страница — BLOCKED |

Първият Vitest опит беше блокиран от sandbox `listen EPERM`; повторното
изпълнение с разрешен локален Supertest socket приключи с 86/86 PASS.
Същото ограничение засегна първия video-service опит; повторното изпълнение с
локален IPC socket приключи с 37/37 PASS.

## Permissions и native функции

| Област | Статус | Бележка |
|---|---|---|
| Camera/microphone | PASS по код | използват се за calls, capture и audio messages; card scan/payment UI е изключен; не е device-тествано |
| Push notifications | PASS по код | FCM + Expo token регистрация; изисква Play/Firebase device test |
| Full-screen incoming call | PASS по код / declaration required | core call use case; Play Console declaration и demo video |
| Background video upload | PASS по код/tests | `dataSync` FGS, progress notification, cancel, wake lock, resumable upload |
| Storage/photo access | PASS по финален manifest | няма broad `READ_MEDIA_IMAGES/VIDEO` или legacy `READ/WRITE_EXTERNAL_STORAGE`; използват се system pickers/selected-media access |
| Overlay permission | FIXED и валидирано | `SYSTEM_ALERT_WINDOW` е блокирано изрично и отсъства от build 9 |

## Функционални проверки

Няма свързано Android устройство и няма наличен AVD. Следните оценки са само
кодова/автоматична проверка и **не са реален Android acceptance test**.

| Функция | Статус | Какво е проверено |
|---|---|---|
| Регистрация | PASS по код | форма, validation, API flow и error handling |
| Вход | PASS по код | password, Google, TOTP/email/device flows; SecureStore session |
| Изход | PASS по код | server logout, token/push cleanup и local session cleanup |
| Чат/съобщения | PASS по код | conversations, send/read/reactions/attachments/socket; backend route tests |
| Push | NOT DEVICE TESTED | FCM/Expo implementation и permissions прегледани |
| Аудио/видео разговори | NOT DEVICE TESTED | WebRTC/mediasoup, incoming call FGS и routes са налични |
| Video upload/processing/playback | PASS по tests, NOT DEVICE TESTED | resumable upload, retry/origin guards, processing polling и player recovery tests |
| Прекъснат интернет | PASS по код, NOT DEVICE TESTED | NetInfo + global network guard + blocking offline screen |
| Изтриване на акаунт | PASS по код, DEPLOYMENT BLOCKED | in-app UI и backend purge/soft-delete; web ресурсът е подготвен, но не е публично deploy-нат; retention остава за потвърждение |
| Плащания | PASS | няма достъпен payment UI/checkout в build 9; production API guard е активен; historical PAN рискът е документиран |
| Докладване/модерация | PASS по код, API BLOCKED | report user/video и admin queue са добавени; migration/API deployment и device test остават |
| Error handling/stability | PARTIAL | lint/typecheck/tests pass; няма device soak, crash/ANR или Play pre-launch report |

## Device acceptance checklist (остава)

- [ ] Clean install от Play internal track на Android 14, 15 и 16 поне където е налично.
- [ ] Регистрация, email/password login, Google login и logout.
- [ ] Два реални акаунта: двупосочен чат, image/file/audio attachment, read status.
- [ ] Push при foreground, background и killed app.
- [ ] Incoming/outgoing audio и video call; deny camera/mic; Bluetooth route.
- [ ] Full-screen incoming call при locked screen и permission-off fallback.
- [ ] Video upload в foreground/background, cancel, network loss/resume, processing, playback.
- [ ] Offline/online transition без загуба или двойно изпращане.
- [ ] Account deletion и повторен login с изтрития акаунт.
- [ ] Low storage, permission denial, token expiry и server error cases.
- [ ] Play pre-launch report, Android vitals, crash/ANR и accessibility review.

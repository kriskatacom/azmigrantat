# „Ето ме“ — Google Sign-In handoff за development компютър

## Цел

Този документ описва как Google Sign-In да заработи в Android development build на друг компютър, без да се променя или прекъсва production Google входът.

Основната причина Google входът да не работи на нов development компютър обикновено е различен автоматично генериран Android debug keystore. Google разпознава Android приложението по комбинацията от package name и SHA-1 на подписващия сертификат.

## Задължителни стойности

- Android package: `com.etome.app`
- Регистриран development SHA-1: `21:9F:2A:A5:CF:A1:07:93:9C:3F:1C:CC:96:1F:DD:AF:BB:BD:FB:D2`
- Google Web OAuth Client ID: `149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com`
- Google Sign-In: `EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN=true`
- Development API в текущата обща конфигурация: `https://users.azmigrantat.com`

## Забранени действия

1. Не създавай нов Google Web OAuth client.
2. Не променяй backend `GOOGLE_WEB_CLIENT_ID`.
3. Не променяй Android package името `com.etome.app`.
4. Не заменяй `google-services.json` с конфигурация само за `com.anonymous.chatapp`.
5. Не променяй Google Play App Signing сертификата.
6. Не добавяй `debug.keystore`, release keystore, пароли или токени в Git.
7. Не показвай ID token-и, access token-и, пароли или съдържание на keystore в логове или чат.
8. Не тествай native Google Sign-In през Expo Go.

## Стъпка 1 — Получаване на актуалния код

Преди `pull` провери дали на development компютъра има незапазени локални промени. Не ги презаписвай.

```bash
cd /път/до/azmigrantat
git status --short --branch
git pull --ff-only origin main
cd app/chat-app
npm ci
```

## Стъпка 2 — Проверка на общата конфигурация

В `app/chat-app/.env.local` или активната environment конфигурация трябва да присъстват следните стойности:

```env
EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN=true
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com
```

Не задавай различен Google Web Client ID само за новия компютър.

Изпълни committed environment проверката:

```bash
npm run validate:environment -- --profile development
```

Проверката трябва да завърши с:

```text
Environment validation passed for development.
```

Ако проверката не мине, не заобикаляй валидирането. Установи коя стойност или конфигурационен файл се различава.

## Стъпка 3 — Генериране на native Android проекта

От `app/chat-app` изпълни:

```bash
npx expo prebuild --clean --platform android
```

`prebuild --clean` пресъздава игнорираната `android/` директория. Затова development keystore трябва да бъде поставен след тази команда.

## Стъпка 4 — Защитено прехвърляне на development keystore

На оригиналния development компютър регистрираният ключ се намира на:

```text
/home/kristian/projects/azmigrantat/app/chat-app/android/app/debug.keystore
```

Прехвърли файла по защитен локален канал, например криптиран носител или защитена връзка между двата компютъра. Не използвай Git, публичен cloud линк или чат съобщение.

На новия компютър го постави на:

```text
app/chat-app/android/app/debug.keystore
```

Ограничи правата му:

```bash
chmod 600 android/app/debug.keystore
```

Този development ключ не е production signing key, но въпреки това не трябва да се публикува.

## Стъпка 5 — Проверка на SHA-1

От `app/chat-app` изпълни:

```bash
keytool -list -v \
  -alias androiddebugkey \
  -keystore android/app/debug.keystore \
  -storepass android \
  -keypass android
```

Очакваният SHA-1 е:

```text
21:9F:2A:A5:CF:A1:07:93:9C:3F:1C:CC:96:1F:DD:AF:BB:BD:FB:D2
```

Ако SHA-1 е различен, не променяй production конфигурацията. Постави правилния development keystore или спри и докладвай получения SHA-1.

## Стъпка 6 — Проверка на native конфигурацията

Потвърди следното:

```bash
grep -n "applicationId\|namespace" android/app/build.gradle
```

И `namespace`, и `applicationId` трябва да бъдат:

```text
com.etome.app
```

Провери, че native Google конфигурацията е създадена:

```bash
test -f android/app/google-services.json
```

Root конфигурацията, използвана от Expo, е:

```text
app/chat-app/google-services.json
```

Тя вече съдържа Android OAuth записите за development, EAS upload и Google Play App Signing сертификатите. Не редактирай ръчно генерираното копие в `android/app/`.

## Стъпка 7 — Изграждане и инсталиране на development build

Свържи Android телефона с разрешен USB debugging и изпълни:

```bash
npx expo run:android --device --port 8081
```

Google Sign-In използва native модул и няма да работи през Expo Go. Необходим е development build, създаден чрез `expo run:android` или EAS development profile.

Ако на телефона вече има development приложение със същия package, но подписано с друг сертификат, Android няма да позволи обновяване върху него. Деинсталирай само development инсталацията и инсталирай новия build. Това изтрива локалните данни на тази инсталация, затова първо се увери, че няма нужни непубликувани данни.

След първото успешно native изграждане Metro може да се стартира с:

```bash
npm run start:dev:clear
```

## Стъпка 8 — Ръчна проверка

1. Отвори development build-а на телефона.
2. Отвори страницата за вход.
3. Натисни „Продължете с Google“.
4. Избери тестов Google профил.
5. Потвърди, че приложението се връща от Google chooser и създава валидна сесия.
6. Излез от профила и повтори входа веднъж, за да се изключи еднократен кеширан успех.

Не създавай автоматизиран E2E тест за тази проверка. Не записвай върнатия ID token.

## Диагностика при неуспех

### `DEVELOPER_ERROR` или код `10`

Най-често означава несъответствие между:

- `com.etome.app`;
- SHA-1 на действително използвания `android/app/debug.keystore`;
- Android OAuth клиента в `google-services.json`.

Провери отново Стъпки 4–6 и направи пълен native rebuild.

### Приложението не може да се инсталира върху съществуващата версия

Вероятно съществуващата инсталация е подписана с различен сертификат. Деинсталирай само development инсталацията и инсталирай отново.

### Бутонът липсва

Провери:

```env
EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN=true
```

След промяна на `EXPO_PUBLIC_*` стойност направи restart на Metro с изчистен кеш и при необходимост rebuild на native приложението.

### Backend връща „Невалиден Google ID token“

Не сменяй backend клиента. Провери дали приложението използва точно общия Web Client ID:

```text
149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com
```

Backend проверява ID token-а срещу същата audience стойност.

### Node не се намира при Gradle build

Ако Gradle показва `A problem occurred starting process 'command node'`, стартирай терминала със зареден Node.js environment и провери:

```bash
command -v node
node --version
```

След това стартирай `npx expo run:android` от същия терминал. Не добавяй машинно-специфични абсолютни Node пътища в committed Gradle конфигурацията.

За ограничена диагностика може да се използва `adb logcat`, но филтрирай изхода и не съхранявай OAuth token-и или лични данни.

## Влияние върху production

Горната процедура не променя production Google Sign-In.

Production приложението използва Google Play App Signing SHA-1:

```text
9D:32:FA:C5:82:65:D8:30:E8:A4:00:FD:4C:FE:CD:F0:0F:06:73:7
```

Development debug сертификатът и Google Play App Signing сертификатът са отделни Android OAuth идентичности. Използването на вече регистрирания development keystore не заменя и не обезсилва production сертификата.

Важно: текущият development profile използва общия production auth API:

```text
https://users.azmigrantat.com
```

Следователно development Google входът няма да прекъсне production входа, но ще използва реалната production потребителска база. Тестовият вход може да създаде или използва реален акаунт и реална сесия. Не извършвай разрушителни тестове и не използвай чужди потребителски профили.

## Критерии за завършване

- `npm run validate:environment -- --profile development` минава успешно.
- Android package е `com.etome.app`.
- Development build е подписан със SHA-1 `21:9F:2A:A5:CF:A1:07:93:9C:3F:1C:CC:96:1F:DD:AF:BB:BD:FB:D2`.
- Google chooser се отваря и връща приложението без `DEVELOPER_ERROR`.
- Backend приема Google ID token-а и създава сесия.
- Не са променени production Web Client ID, backend Google client, Play App Signing или production release credentials.
- Не са добавени keystore файлове, пароли или token-и в Git.


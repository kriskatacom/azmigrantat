# Data safety — работна декларация

Дата на анализа: 31.10.2026 г.

Това е работен документ, изведен от клиентския и наличния backend код. Той не
замества потвърждение от администратора на production системите, договорите с
подизпълнители и реалните retention/moderation практики. Google изисква да се
декларират и данните, обработвани от SDK библиотеки.

Официални указания:

- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/13327111

## Общи отговори — предложени

- Приложението събира или предава потребителски данни: **Да**.
- Всички предавани данни криптирани ли са при пренос: **Да за проверените
  production URL адреси (HTTPS/WSS); потвърдете TLS конфигурацията на всички
  крайни услуги**.
- Потребителят може ли да поиска изтриване: **Да по код** — има in-app
  изтриване и е подготвен `/account-deletion`; публичният отговор остава
  блокиран до deployment и проверка на URL адреса.
- Независим security review: **Не е установен; отговорете „Не“, освен ако има
  валиден външен одит**.

## Данни, установени в кода

| Play категория | Конкретни данни | Цел | Задължителни/по избор | Бележка |
|---|---|---|---|---|
| Лична информация | име, фамилия, имейл | създаване и управление на акаунт | задължителни | регистрация и вход |
| Лична информация | телефон | профил и потвърждение | по избор | може да се показва според настройка |
| Лична информация | пол, държава, град, адрес, биография | потребителски профил | по избор | адресът е Physical address в Data safety |
| User IDs | вътрешен user ID, public code, username | акаунт, чат, профил | автоматично/по избор | |
| Снимки и видеа | профилна/cover снимка, чат медия, качени видеа и thumbnails | профил, чат, видео споделяне | по избор | |
| Аудио | аудио съобщения и media stream при разговор | чат и разговори | по избор | |
| Файлове и документи | чат прикачени файлове | чат | по избор | |
| Съобщения | текст, реакции, metadata, статус delivered/read | комуникация | по избор | потребителско съдържание |
| App activity | видео гледания, известия, чат/call събития | функционалност и комуникация | автоматично | потвърдете analytics/log retention |
| Device or other IDs | генериран device UUID, push token, модел/производител | сигурност на входа и push | автоматично | FCM и Expo Push |
| Financial info | няма ново събиране в release build-а | не се използва | не се събира | `EXPO_PUBLIC_ENABLE_PAYMENTS=false`; UI и клиентските mutations са блокирани; server-side guard е подготвен, но изисква deployment. Историческият backend съхранява криптиран PAN — виж `payment-risk-audit-bg.md` |
| Authentication info | password, refresh/access token, device secret, PIN/TOTP настройки | вход и защита | задължително/по избор | не декларирайте паролата като публично споделяна |
| Diagnostics | грешки и server logs | стабилност и сигурност | автоматично | няма установен analytics/crash SDK; потвърдете server logging |

## Трети страни / service providers, видими в проекта

- Google Firebase Cloud Messaging — device/push token и notification metadata.
- Expo Push Service — Expo push token и notification metadata.
- Google Sign-In — Google account authentication, когато потребителят го избере.
- Backblaze B2 и/или отделна video storage/processing услуга — потребителски
  медии и технически metadata според активния provider.
- Realtime/mediasoup инфраструктура — чат/call signaling и медийни потоци.

Дали това е „shared“ по смисъла на Data safety зависи от договорната роля и
използването на данните. Потвърдете, че всяка страна действа само като service
provider; в противен случай маркирайте съответните категории като споделяни.

## Изтриване и retention

Кодът съдържа in-app път `Профил > Изтриване на профила`. Backend логиката:

- изтрива изпратените чат съобщения и техните B2 файлове;
- изтрива payment methods, push tokens, social links, TOTP pending записи,
  блокирания и access tokens;
- анонимизира основни полета и soft-deletes потребителя.

Не е потвърдено дали се изтриват всички качени short videos, thumbnails,
backups, audit/security logs, video-view записи и записи при външни providers.
Подготвен е публичен `/account-deletion` ресурс с in-app стъпки и заявка по
имейл. Той не е достъпен публично до отделен deployment на основния сайт.

## Задължителни потвърждения преди подаване

1. Реалните retention срокове по тип данни и backup.
2. Дали данни се използват за analytics, реклама, профилиране или marketing.
3. Договорната роля на Google/Expo/Backblaze/video providers.
4. Изтрити/изолирани ли са историческите card records; CVC не се съхранява по
   намерения код, но трябва да се провери в logs/APM/backups.
5. Изтриват ли се всички видеа и provider копия при изтриване на акаунт.
6. Дали production logs съдържат IP адреси, имейли, tokens или message content.
7. Работещ публичен URL за политика и отделен URL за account deletion.

# Абонаментни планове и плащания за „Ето ме“

## Текущо безопасно състояние

- В приложението има два представени плана: безплатен и бъдещ платен.
- Безплатният план е планът по подразбиране.
- Цена и платени възможности не са измислени и не са активирани.
- `EXPO_PUBLIC_ENABLE_PAYMENTS=false` остава задължително за текущите build профили.
- Мобилният и backend payment guard остават активни.
- Не се събират нови картови данни и не се променят съществуващи записи.

## Важен избор преди реална интеграция

Платен план, който отключва функционалности в Android приложението, представлява дигитален абонамент. За версията, разпространявана чрез Google Play, има два допустими основни модела:

1. **Google Play Billing** — препоръчаният и най-пряк вариант за Play версията.
2. **Stripe като alternative billing** — само след успешно записване на приложението в приложимата Google Play програма за съответните пазари и интегриране на изискваните Play alternative-billing API, потребителски екрани и отчитане на транзакциите.

Stripe Checkout линк или Stripe форма в Play приложението не трябва да се активира самостоятелно без избрания и одобрен Google Play режим.

## Препоръчана архитектура

### Единен entitlement модел

Backend-ът трябва да бъде единственият източник на истина за достъпа:

- `plan`: `free` или `paid`;
- `status`: `active`, `grace_period`, `on_hold`, `cancelled`, `expired`;
- `provider`: `google_play` или `stripe`;
- `current_period_end`;
- непроменим идентификатор на покупката/абонамента;
- регистър на обработените webhook/notification събития за идемпотентност.

Мобилното приложение не трябва да отключва платена функция само по локален резултат от checkout. То трябва да прочете потвърден entitlement от backend-а.

### Google Play поток

1. Продуктът и base plan се създават в Play Console.
2. Приложението стартира Play Billing purchase flow.
3. Purchase token се изпраща към backend-а.
4. Backend-ът валидира покупката чрез Google Play Developer API.
5. Backend-ът записва entitlement и потвърждава/acknowledge-ва покупката.
6. Real-time Developer Notifications поддържат статуса при подновяване, отказ, grace period, hold и изтичане.

### Stripe поток при допустим alternative-billing режим

1. Приложението получава required external transaction token от Play alternative-billing API.
2. Backend-ът създава Stripe Checkout Session или PaymentSheet само за определения продукт и потребител.
3. Stripe webhook е източникът за успешно плащане и промени в абонамента.
4. Backend-ът активира entitlement след проверен webhook, а не след redirect от клиента.
5. Транзакцията се отчита към Google Play в изисквания срок.
6. Управлението и прекратяването на Stripe абонамента се предоставят чрез защитен customer portal.

## Сигурност

- Да не се въвеждат PAN/CVC в собствени React Native полета и да не се изпращат към API на „Ето ме“.
- При Stripe да се използват Stripe-hosted UI/SDK и токенизация.
- Stripe secret key и webhook signing secret се пазят само на backend-а.
- Webhook-ите се валидират криптографски и се обработват идемпотентно.
- Съществуващите два криптирани PAN записа не се изтриват или мигрират в този етап; за тях остава необходим отделен контролиран план.

## Необходими решения преди активиране

- точните функции на платения план;
- цена, валута и период — месечен, годишен или и двата;
- trial, grace period и refund правила;
- пазари, в които планът ще се предлага;
- Google Play Billing или записване в applicable alternative-billing програма за Stripe;
- юридическо лице/merchant of record, VAT и текстове за автоматично подновяване;
- URL за управление и прекратяване на абонамента;
- окончателни продуктови идентификатори в Play Console и/или Stripe.

## Операции, които изискват ново разрешение

- активиране на `EXPO_PUBLIC_ENABLE_PAYMENTS` или backend `PAYMENTS_ENABLED`;
- създаване на реални Stripe продукти, цени, API ключове и webhook endpoints;
- създаване и активиране на Google Play subscription products;
- записване в Google Play alternative-billing програма;
- deployment на subscription migrations или payment backend;
- реална тестова или production транзакция.

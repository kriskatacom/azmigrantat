# Отделен безопасен план за премахване на съхранените PAN

Статус: **само оценка; без изтриване или миграция**.

## Потвърден риск

- Production има 2 реда в `payment_methods`.
- Схемата съдържа `pan_ciphertext`, а приложният код криптира пълен PAN с AES-256-GCM.
- CVC се валидира в request-а, но не се подава към save/encryption и няма CVC колона.
- Ключът е `CARD_ENCRYPTION_KEY`, но при липса кодът пада към споделения `REALTIME_INTERNAL_SECRET`. Това затруднява безопасното унищожаване на card key без риск за realtime инфраструктурата.
- Не е доказано дали номерата са реални или тестови; не са decrypt-вани или извеждани в този етап.
- Backups, access logs, error logs и исторически exports не са проверени за PAN leakage.
- User-initiated account deletion по текущия contract може легитимно да изтрие съответния payment-method ред. Този consumer-right flow не трябва да се блокира; забраната тук е за операторско bulk/targeted retirement без отделно разрешение.

## Целево състояние

- приложението никога не приема PAN/CVC;
- няма decryptable PAN в active DB, logs, caches или operational exports;
- бъдещи плащания, ако бъдат одобрени, използват PCI-съвместим provider tokenization/hosted fields;
- минимални display данни като brand/last4 се пазят само при потвърдена правна и продуктова необходимост.

## Предложени фази

1. **Containment:** deploy и докажи `PAYMENTS_ENABLED=false`; ограничи DB/log/backup access; инвентаризирай местата без извеждане на стойности. Всички нови backups с PAN ciphertext се криптират при създаване.
2. **Forensic aggregate audit:** в изолиран процес класифицирай decryptability, Luhn validity и known-test-number match; изведи само counts. Изисква отделно разрешение за обработване на PAN.
3. **Key separation:** премахни fallback-а към `REALTIME_INTERNAL_SECRET`; създай отделен card key само ако е нужен за контролирано четене преди retirement. Това е secret change и изисква отделно разрешение.
4. **Schema preparation:** направи `pan_ciphertext` nullable или добави нова tokenized таблица; deploy-ни код, който никога не чете/пише PAN.
5. **Approved retirement:** в transaction и след verified backup задай PAN ciphertext към `NULL` или изтрий payment-method редовете според правно решение. Това е destructive data operation и изисква изрично разрешение.
6. **Backups/retention:** документирай кои backups съдържат PAN, срокове и криптографско изтриване. Не унищожавай backup/key без legal/incident-retention approval.
7. **Verification:** aggregate DB scans, log scans и application tests; никакви чувствителни стойности в output.

## Stop conditions

- card key е споделен с друга услуга;
- няма проверен backup/restore;
- не е установен legal retention срок;
- операцията би променила повече от двата идентифицирани реда;
- audit tool може да логва plaintext/ciphertext;
- няма независим review на destructive SQL.

## Разрешения, които ще бъдат нужни

- aggregate decrypt/classification на двата PAN в изолиран процес;
- read-only log/backup scan;
- промяна/ротация на card encryption secret;
- schema migration;
- PAN nullification или row deletion;
- backup expiration/crypto-erasure.

# Одит на риска при платежни данни

Дата: 31.10.2026 г.

## Release решение

- Мобилен flag: `EXPO_PUBLIC_ENABLE_PAYMENTS=false` във всички EAS профили.
- Payment entry е скрит; direct routes показват, че плащанията не са активни.
- Client mutations за карта, auto-renewal, default card и checkout отказват.
- Backend guard: `PAYMENTS_ENABLED=false` по подразбиране; `createCheckout()` и
  `PaymentMethodService::save()` отказват преди Stripe/PAN обработка.
- Не е добавян Google Play Billing, Stripe SDK или друг оператор.

## Установен исторически риск

Съществуващият backend endpoint приема пълен PAN, срок, CVC и име. CVC се
валидира, но не се предава към storage service. Пълният PAN се съхранява като
AES-256-GCM ciphertext в `payment_methods.pan_ciphertext`; brand, last4, срок и
име се пазят отделно. Encryption key може да fallback-не към
`REALTIME_INTERNAL_SECRET`, което увеличава blast radius при компрометиране.

Не е проверена production базата и не може да се твърди, че няма исторически
реални карти. Не са проверени reverse-proxy/app/APM logs, database backups или
error dumps за PAN/CVC.

## Задължителни действия

1. След отделно одобрение deploy-нете backend guard-а и задайте изрично
   `PAYMENTS_ENABLED=false` в production.
2. Проверете дали `payment_methods` съдържа записи; изработете одобрен,
   recoverable purge/retention план. Не извършвайте ad-hoc delete.
3. Проверете logs/APM/backups за card payloads и приложете redaction.
4. Ротирайте отделен `CARD_ENCRYPTION_KEY`; не използвайте realtime secret като
   fallback при бъдеща payment реализация.
5. Ако плащанията бъдат върнати, използвайте provider-hosted tokenization и не
   приемайте PAN/CVC в собствената инфраструктура без доказан PCI DSS обхват.

До изпълнение на server deployment production API може все още да приема
старите заявки. Новият AAB не ги изпраща, но това не е защита срещу директен API
клиент.

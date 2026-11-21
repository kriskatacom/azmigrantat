<?php

namespace App\Services;

interface StripeCatalogue
{
    /** @return array{account_id:string, livemode:bool} */
    public function account(): array;

    /** @return array{id:string, livemode:bool} */
    public function ensureProduct(?string $existingProductId, string $name): array;

    /** @return array{id:string, product_id:string, amount_cents:int, currency:string, interval:string, interval_count:int, livemode:bool} */
    public function createRecurringPrice(
        string $productId,
        int $amountCents,
        string $idempotencyKey
    ): array;

    public function archivePrice(string $priceId): void;
}

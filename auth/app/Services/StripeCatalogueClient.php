<?php

namespace App\Services;

use RuntimeException;

final class StripeCatalogueClient implements StripeCatalogue
{
    private string $secretKey;

    public function __construct(?string $secretKey = null)
    {
        $this->secretKey = trim((string) ($secretKey
            ?? $_ENV['STRIPE_TEST_SECRET_KEY']
            ?? getenv('STRIPE_TEST_SECRET_KEY')
            ?: ''));

        if (!preg_match('/^(?:sk|rk)_test_[A-Za-z0-9]+$/', $this->secretKey)) {
            throw new RuntimeException('Stripe Sandbox не е конфигуриран.');
        }
    }

    public function account(): array
    {
        $account = $this->request('GET', 'account');
        $accountId = trim((string) ($account['id'] ?? ''));
        if (!str_starts_with($accountId, 'acct_')) {
            throw new RuntimeException('Stripe акаунтът не може да бъде потвърден.');
        }

        return ['account_id' => $accountId, 'livemode' => false];
    }

    public function ensureProduct(?string $existingProductId, string $name): array
    {
        if ($existingProductId && str_starts_with($existingProductId, 'prod_')) {
            $product = $this->request('GET', 'products/' . rawurlencode($existingProductId));
            if (($product['active'] ?? false) === true && ($product['livemode'] ?? true) === false) {
                return ['id' => (string) $product['id'], 'livemode' => false];
            }
        }

        $product = $this->request('POST', 'products', [
            'name' => $name,
            'metadata[application]' => 'etome',
            'metadata[plan]' => PaidPlanService::PLAN_KEY,
        ], 'etome-product-' . hash('sha256', $name));

        if (($product['livemode'] ?? true) !== false || !str_starts_with((string) ($product['id'] ?? ''), 'prod_')) {
            throw new RuntimeException('Stripe върна невалиден Sandbox продукт.');
        }

        return ['id' => (string) $product['id'], 'livemode' => false];
    }

    public function createRecurringPrice(
        string $productId,
        int $amountCents,
        string $idempotencyKey
    ): array {
        $price = $this->request('POST', 'prices', [
            'product' => $productId,
            'unit_amount' => (string) $amountCents,
            'currency' => PaidPlanPricePolicy::CURRENCY,
            'recurring[interval]' => PaidPlanPricePolicy::INTERVAL,
            'recurring[interval_count]' => (string) PaidPlanPricePolicy::INTERVAL_COUNT,
            'metadata[application]' => 'etome',
            'metadata[plan]' => PaidPlanService::PLAN_KEY,
        ], 'etome-price-' . hash('sha256', $idempotencyKey));

        $valid = ($price['livemode'] ?? true) === false
            && ($price['product'] ?? null) === $productId
            && (int) ($price['unit_amount'] ?? -1) === $amountCents
            && ($price['currency'] ?? null) === PaidPlanPricePolicy::CURRENCY
            && ($price['recurring']['interval'] ?? null) === PaidPlanPricePolicy::INTERVAL
            && (int) ($price['recurring']['interval_count'] ?? 0) === PaidPlanPricePolicy::INTERVAL_COUNT
            && str_starts_with((string) ($price['id'] ?? ''), 'price_');

        if (!$valid) {
            throw new RuntimeException('Stripe върна невалидна Sandbox цена.');
        }

        return [
            'id' => (string) $price['id'],
            'product_id' => $productId,
            'amount_cents' => $amountCents,
            'currency' => PaidPlanPricePolicy::CURRENCY,
            'interval' => PaidPlanPricePolicy::INTERVAL,
            'interval_count' => PaidPlanPricePolicy::INTERVAL_COUNT,
            'livemode' => false,
        ];
    }

    public function archivePrice(string $priceId): void
    {
        if (!str_starts_with($priceId, 'price_')) {
            return;
        }

        $price = $this->request('POST', 'prices/' . rawurlencode($priceId), [
            'active' => 'false',
        ]);

        if (($price['active'] ?? true) !== false) {
            throw new RuntimeException('Предишната Stripe цена не можа да бъде архивирана.');
        }
    }

    private function request(
        string $method,
        string $path,
        array $data = [],
        ?string $idempotencyKey = null
    ): array {
        $headers = [
            'Authorization: Bearer ' . $this->secretKey,
            'Content-Type: application/x-www-form-urlencoded',
        ];
        if ($idempotencyKey !== null) {
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }

        $ch = curl_init('https://api.stripe.com/v1/' . ltrim($path, '/'));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_POSTFIELDS => $method === 'GET' ? null : http_build_query($data),
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_errno($ch);
        curl_close($ch);

        $decoded = json_decode((string) $raw, true);
        if ($curlError !== 0 || $status < 200 || $status >= 300 || !is_array($decoded)) {
            throw new RuntimeException('Stripe Sandbox заявката не беше успешна.');
        }

        return $decoded;
    }
}

<?php

namespace App\Services;

use RuntimeException;

final class StripeSubscriptionClient
{
    private string $secretKey;

    public function __construct()
    {
        if (PaymentsFeature::isEnabled() || !StripeSandboxFeature::enabled()) {
            throw new RuntimeException('Разрешени са само Stripe Sandbox абонаменти.');
        }
        $this->secretKey = trim((string) ($_ENV['STRIPE_TEST_SECRET_KEY'] ?? getenv('STRIPE_TEST_SECRET_KEY') ?: ''));
        if (!preg_match('/^(?:sk|rk)_test_[A-Za-z0-9]+$/', $this->secretKey)) {
            throw new RuntimeException('Stripe абонаментите не са конфигурирани.');
        }
    }

    public function retrieve(string $subscriptionId): array
    {
        return $this->validate($subscriptionId, $this->request('GET', $subscriptionId));
    }

    public function setAutoRenewal(string $subscriptionId, bool $enabled): array
    {
        return $this->validate($subscriptionId, $this->request('POST', $subscriptionId, [
            'cancel_at_period_end' => $enabled ? 'false' : 'true',
        ]));
    }

    public function cancelImmediately(string $subscriptionId): array
    {
        $subscription = $this->validate(
            $subscriptionId,
            $this->request('DELETE', $subscriptionId)
        );
        if (($subscription['status'] ?? null) !== 'canceled') {
            throw new RuntimeException('Stripe не потвърди прекратяването на абонамента.');
        }
        return $subscription;
    }

    private function request(string $method, string $subscriptionId, array $data = []): array
    {
        if (!str_starts_with($subscriptionId, 'sub_')) {
            throw new RuntimeException('Невалиден Stripe абонамент.');
        }
        $ch = curl_init('https://api.stripe.com/v1/subscriptions/' . rawurlencode($subscriptionId));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/x-www-form-urlencoded',
            ],
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
            throw new RuntimeException('Настройката не можа да бъде потвърдена от Stripe.');
        }
        return $decoded;
    }

    private function validate(string $subscriptionId, array $subscription): array
    {
        if (($subscription['id'] ?? null) !== $subscriptionId
            || ($subscription['livemode'] ?? true) !== false) {
            throw new RuntimeException('Stripe върна невалиден абонамент.');
        }
        return $subscription;
    }
}

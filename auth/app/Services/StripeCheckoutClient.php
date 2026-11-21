<?php

namespace App\Services;

use RuntimeException;

final class StripeCheckoutClient
{
    private string $secretKey;

    public function __construct()
    {
        $this->secretKey = trim((string) ($_ENV['STRIPE_TEST_SECRET_KEY'] ?? getenv('STRIPE_TEST_SECRET_KEY') ?: ''));
        if (!preg_match('/^(?:sk|rk)_test_[A-Za-z0-9]+$/', $this->secretKey)) {
            throw new RuntimeException('Stripe Sandbox не е конфигуриран.');
        }
    }

    public function createSubscriptionSession(
        string $priceId,
        string $email,
        int $userId,
        string $publicId
    ): array {
        $businessUrl = rtrim((string) ($_ENV['BUSINESS_PUBLIC_URL'] ?? 'https://business.azmigrantat.com'), '/');
        $data = [
            'mode' => 'subscription',
            'customer_email' => $email,
            'client_reference_id' => (string) $userId,
            'line_items[0][price]' => $priceId,
            'line_items[0][quantity]' => '1',
            'success_url' => $businessUrl . '/subscriptions/result?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $businessUrl . '/subscriptions/result?status=cancelled&checkout=' . rawurlencode($publicId),
            'metadata[user_id]' => (string) $userId,
            'metadata[plan]' => PaidPlanService::PLAN_KEY,
            'metadata[checkout_handoff]' => $publicId,
            'subscription_data[metadata][user_id]' => (string) $userId,
            'subscription_data[metadata][plan]' => PaidPlanService::PLAN_KEY,
            'subscription_data[metadata][checkout_handoff]' => $publicId,
            'subscription_data[metadata][renewal_default]' => 'off',
            'expires_at' => (string) (time() + 1800),
        ];

        $session = $this->request('POST', 'checkout/sessions', $data, 'etome-checkout-' . $publicId);
        if (($session['livemode'] ?? true) !== false
            || !str_starts_with((string) ($session['id'] ?? ''), 'cs_test_')
            || !str_starts_with((string) ($session['url'] ?? ''), 'https://checkout.stripe.com/')) {
            throw new RuntimeException('Stripe върна невалидна Sandbox Checkout сесия.');
        }

        return ['id' => (string) $session['id'], 'url' => (string) $session['url']];
    }

    public function retrieveSubscriptionSession(
        string $sessionId,
        int $userId,
        string $publicId
    ): array {
        if (!str_starts_with($sessionId, 'cs_test_')) {
            throw new RuntimeException('Невалидна Stripe Sandbox Checkout сесия.');
        }

        $session = $this->request(
            'GET',
            'checkout/sessions/' . rawurlencode($sessionId),
            [],
            null
        );
        if (($session['livemode'] ?? true) !== false
            || ($session['id'] ?? null) !== $sessionId
            || ($session['mode'] ?? null) !== 'subscription'
            || (string) ($session['client_reference_id'] ?? '') !== (string) $userId
            || (string) ($session['metadata']['checkout_handoff'] ?? '') !== $publicId) {
            throw new RuntimeException('Stripe Sandbox Checkout сесията не съответства на профила.');
        }

        $status = (string) ($session['status'] ?? '');
        $url = (string) ($session['url'] ?? '');
        if ($status === 'open' && !str_starts_with($url, 'https://checkout.stripe.com/')) {
            throw new RuntimeException('Stripe върна невалиден Sandbox Checkout адрес.');
        }

        return ['id' => $sessionId, 'status' => $status, 'url' => $url];
    }

    private function request(
        string $method,
        string $path,
        array $data,
        ?string $idempotencyKey
    ): array
    {
        $headers = [
            'Authorization: Bearer ' . $this->secretKey,
            'Content-Type: application/x-www-form-urlencoded',
        ];
        if ($idempotencyKey !== null) {
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }

        $ch = curl_init('https://api.stripe.com/v1/' . $path);
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
        $result = json_decode((string) $raw, true);

        if ($curlError !== 0 || $status < 200 || $status >= 300 || !is_array($result)) {
            throw new RuntimeException('Stripe Sandbox Checkout не можа да бъде създаден.');
        }

        return $result;
    }
}

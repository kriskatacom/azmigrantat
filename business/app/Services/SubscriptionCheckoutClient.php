<?php

namespace App\Services;

use RuntimeException;

final class SubscriptionCheckoutClient
{
    public function start(string $token): string
    {
        $data = $this->request('/api/internal/subscription-checkout/start', ['token' => $token]);
        $url = (string) ($data['checkout_url'] ?? '');
        if (!str_starts_with($url, 'https://checkout.stripe.com/')) {
            throw new RuntimeException('Получен е невалиден Stripe Checkout адрес.');
        }
        return $url;
    }

    public function status(?string $sessionId, ?string $checkout): array
    {
        return $this->request('/api/internal/subscription-checkout/status', [
            'session_id' => $sessionId,
            'checkout' => $checkout,
        ]);
    }

    private function request(string $path, array $payload): array
    {
        $baseUrl = rtrim((string) ($_ENV['AUTH_SERVER_URL'] ?? ''), '/');
        $secret = trim((string) ($_ENV['BILLING_CHECKOUT_SHARED_SECRET'] ?? ''));
        if (!str_starts_with($baseUrl, 'https://') || strlen($secret) < 32) {
            throw new RuntimeException('Тестовият Checkout не е конфигуриран.');
        }

        $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $timestamp = time();
        $canonical = "POST\n{$path}\n{$timestamp}\n" . hash('sha256', $body);
        $signature = hash_hmac('sha256', $canonical, $secret);

        $ch = curl_init($baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'X-Etome-Timestamp: ' . $timestamp,
                'X-Etome-Signature: ' . $signature,
            ],
            CURLOPT_POSTFIELDS => $body,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_errno($ch);
        curl_close($ch);

        $response = json_decode((string) $raw, true);
        if ($curlError !== 0 || !is_array($response)) {
            throw new RuntimeException('Checkout сървърът не отговори.');
        }
        if ($status < 200 || $status >= 300 || ($response['success'] ?? false) !== true) {
            throw new RuntimeException((string) ($response['message'] ?? 'Checkout не е достъпен.'));
        }

        return (array) ($response['data'] ?? []);
    }
}


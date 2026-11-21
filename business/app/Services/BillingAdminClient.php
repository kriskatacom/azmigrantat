<?php

namespace App\Services;

use RuntimeException;

final class BillingAdminClient
{
    private const PATH = '/api/admin/paid-plan';

    public function getPlan(string $actorEmail): array
    {
        return $this->request('GET', $actorEmail);
    }

    public function updatePlan(string $actorEmail, array $payload): array
    {
        return $this->request('POST', $actorEmail, $payload);
    }

    private function request(string $method, string $actorEmail, array $payload = []): array
    {
        $baseUrl = rtrim((string) ($_ENV['AUTH_SERVER_URL'] ?? ''), '/');
        $secret = trim((string) ($_ENV['BILLING_ADMIN_SHARED_SECRET'] ?? ''));
        $email = strtolower(trim($actorEmail));

        if (!str_starts_with($baseUrl, 'https://') || strlen($secret) < 32) {
            throw new RuntimeException('Управлението на абонамента не е конфигурирано.');
        }

        $body = $method === 'GET'
            ? ''
            : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $timestamp = time();
        $canonical = $method . "\n"
            . self::PATH . "\n"
            . $timestamp . "\n"
            . $email . "\n"
            . hash('sha256', $body);
        $signature = hash_hmac('sha256', $canonical, $secret);

        $ch = curl_init($baseUrl . self::PATH);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'X-Etome-Admin-Email: ' . $email,
                'X-Etome-Timestamp: ' . $timestamp,
                'X-Etome-Signature: ' . $signature,
            ],
            CURLOPT_POSTFIELDS => $method === 'GET' ? null : $body,
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_errno($ch);
        curl_close($ch);

        $response = json_decode((string) $raw, true);
        if ($curlError !== 0 || !is_array($response)) {
            throw new RuntimeException('Billing сървърът не отговори.');
        }
        if ($status < 200 || $status >= 300 || ($response['success'] ?? false) !== true) {
            throw new RuntimeException((string) ($response['message'] ?? 'Настройката не можа да бъде записана.'));
        }

        return (array) ($response['data'] ?? []);
    }
}


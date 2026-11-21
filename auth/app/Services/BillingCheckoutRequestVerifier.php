<?php

namespace App\Services;

final class BillingCheckoutRequestVerifier
{
    public function verify(string $method, string $path, string $body): bool
    {
        $secret = trim((string) (
            $_ENV['BILLING_CHECKOUT_SHARED_SECRET']
            ?? getenv('BILLING_CHECKOUT_SHARED_SECRET')
            ?: ''
        ));
        $timestamp = (int) ($_SERVER['HTTP_X_ETOME_TIMESTAMP'] ?? 0);
        $signature = strtolower(trim((string) ($_SERVER['HTTP_X_ETOME_SIGNATURE'] ?? '')));

        if (strlen($secret) < 32
            || $timestamp <= 0
            || abs(time() - $timestamp) > 300
            || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
            return false;
        }

        $canonical = strtoupper($method) . "\n"
            . $path . "\n"
            . $timestamp . "\n"
            . hash('sha256', $body);

        return hash_equals(hash_hmac('sha256', $canonical, $secret), $signature);
    }
}


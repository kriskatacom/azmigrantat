<?php

namespace App\Services;

use App\Models\User;

final class BillingAdminRequestVerifier
{
    public function verify(string $method, string $path, string $body): ?User
    {
        $secret = trim((string) (
            $_ENV['BILLING_ADMIN_SHARED_SECRET']
            ?? getenv('BILLING_ADMIN_SHARED_SECRET')
            ?: ''
        ));
        $email = strtolower(trim((string) ($_SERVER['HTTP_X_ETOME_ADMIN_EMAIL'] ?? '')));
        $timestamp = (int) ($_SERVER['HTTP_X_ETOME_TIMESTAMP'] ?? 0);
        $signature = strtolower(trim((string) ($_SERVER['HTTP_X_ETOME_SIGNATURE'] ?? '')));

        if (strlen($secret) < 32
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || $timestamp <= 0
            || abs(time() - $timestamp) > 300
            || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
            return null;
        }

        $canonical = strtoupper($method) . "\n"
            . $path . "\n"
            . $timestamp . "\n"
            . $email . "\n"
            . hash('sha256', $body);
        $expected = hash_hmac('sha256', $canonical, $secret);

        if (!hash_equals($expected, $signature)) {
            return null;
        }

        return User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('role', User::ROLE_ADMIN)
            ->where('is_active', true)
            ->first();
    }
}


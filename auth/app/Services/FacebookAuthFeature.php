<?php

namespace App\Services;

final class FacebookAuthFeature
{
    public static function isEnabled(): bool
    {
        $environment = strtolower(trim((string) (
            $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: ''
        )));
        if ($environment !== 'development') {
            return false;
        }

        $value = $_ENV['FACEBOOK_AUTH_ENABLED'] ?? getenv('FACEBOOK_AUTH_ENABLED') ?: 'false';

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function allowsClientId(string $clientId): bool
    {
        $configured = (string) (
            $_ENV['FACEBOOK_ALLOWED_CLIENT_IDS']
            ?? getenv('FACEBOOK_ALLOWED_CLIENT_IDS')
            ?: ''
        );
        $allowed = array_values(array_filter(array_map('trim', explode(',', $configured))));

        return self::isEnabled() && $allowed !== [] && in_array(trim($clientId), $allowed, true);
    }
}

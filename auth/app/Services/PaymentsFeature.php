<?php

namespace App\Services;

use RuntimeException;

final class PaymentsFeature
{
    public static function isEnabled(): bool
    {
        $value = $_ENV['PAYMENTS_ENABLED'] ?? getenv('PAYMENTS_ENABLED') ?: 'false';

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function assertEnabled(): void
    {
        if (!self::isEnabled()) {
            throw new RuntimeException('Плащанията не са достъпни в тази версия.');
        }
    }
}

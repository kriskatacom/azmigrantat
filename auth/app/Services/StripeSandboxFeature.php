<?php

namespace App\Services;

use App\Models\User;

final class StripeSandboxFeature
{
    public static function enabled(): bool
    {
        $value = $_ENV['STRIPE_SANDBOX_ENABLED'] ?? getenv('STRIPE_SANDBOX_ENABLED') ?: 'false';
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function enabledFor(User $user): bool
    {
        return self::enabled() && (bool) $user->is_active;
    }
}

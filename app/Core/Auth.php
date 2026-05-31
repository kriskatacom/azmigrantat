<?php

namespace App\Core;

use App\Models\User;

class Auth
{
    public static function check(): bool
    {
        return isset($_SESSION['user_id']);
    }

    public static function user(): ?User
    {
        if (!self::check()) {
            return null;
        }

        static $currentUser = null;

        if ($currentUser === null) {
            $currentUser = User::find($_SESSION['user_id']);
        }

        return $currentUser;
    }

    public static function id(): ?int
    {
        return $_SESSION['user_id'] ?? null;
    }

    public static function hasRole(string $role): bool
    {
        return isset($_SESSION['user_role']) && $_SESSION['user_role'] === $role;
    }

    public static function isAdmin(): bool
    {
        return self::hasRole('admin');
    }

    public static function name(): string
    {
        return $_SESSION['user_name'] ?? 'Гост';
    }
}

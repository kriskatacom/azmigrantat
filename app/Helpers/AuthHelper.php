<?php

namespace App\Helpers;

use App\Core\Session;

class AuthHelper
{
    public static function check(): bool
    {
        return Session::has('user');
    }

    public static function user()
    {
        return Session::get('user');
    }

    public static function id(): ?int
    {
        $user = self::user();
        return $user ? (int) ($user['id'] ?? $user->id ?? null) : null;
    }

    public static function role(): ?string
    {
        $user = self::user();
        // Поддържаме и масив, и обект в зависимост от това как си го записал
        return $user['role'] ?? ($user->role ?? null);
    }

    public static function isAdmin(): bool
    {
        return self::role() === 'admin';
    }

    public static function isModerator(): bool
    {
        return self::role() === 'moderator' || self::isAdmin();
    }
}

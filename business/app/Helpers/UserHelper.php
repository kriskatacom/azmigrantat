<?php

namespace App\Helpers;

use App\Models\User;

class UserHelper
{
    public static function generateUsername(string $email, ?string $username = null): string
    {
        if (!empty(trim($username))) {
            return preg_replace('/[^a-zA-Z0-9_.]/', '', $username);
        }

        $base = explode('@', $email)[0];

        $base = preg_replace('/[^a-zA-Z0-9_]/', '', $base);

        $finalUsername = $base;
        $counter = 1;

        while (User::where('username', $finalUsername)->exists()) {
            $finalUsername = $base . '_' . $counter;
            $counter++;
        }

        return $finalUsername;
    }
}

<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Carbon\Carbon;

final class PushTokenService
{
    public function register(
        User $user,
        string $token,
        string $platform,
        ?string $deviceId = null
    ): PushToken {
        $pushToken = PushToken::query()
            ->where('token', $token)
            ->first();

        if (!$pushToken) {
            $pushToken = new PushToken();
            $pushToken->token = $token;
        }

        $pushToken->user_id = (int) $user->id;
        $pushToken->platform = $platform;
        $pushToken->device_id = $deviceId;
        $pushToken->last_used_at = Carbon::now();

        $pushToken->save();

        return $pushToken->refresh();
    }

    public function unregister(
        User $user,
        string $token
    ): bool {
        return PushToken::query()
            ->where('user_id', (int) $user->id)
            ->where('token', $token)
            ->delete() > 0;
    }

    public function unregisterAll(User $user): int
    {
        return PushToken::query()
            ->where('user_id', (int) $user->id)
            ->delete();
    }
}
<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Capsule\Manager as DB;

final class PushTokenService
{
    public function register(
        User $user,
        string $token,
        string $platform,
        ?string $deviceId = null,
        string $provider = 'expo'
    ): PushToken {
        return DB::connection()->transaction(function () use (
            $user, $token, $platform, $deviceId, $provider
        ): PushToken {
            $pushToken = PushToken::query()
                ->where('token', $token)
                ->where('provider', $provider)
                ->lockForUpdate()
                ->first() ?? new PushToken();

            $now = Carbon::now();
            $pushToken->user_id = (int) $user->id;
            $pushToken->token = $token;
            $pushToken->platform = $platform;
            $pushToken->provider = $provider;
            $pushToken->device_id = $deviceId;
            $pushToken->is_active = true;
            $pushToken->deactivated_reason = null;
            $pushToken->last_seen_at = $now;
            $pushToken->last_used_at = $now;
            $pushToken->save();

            return $pushToken->refresh();
        });
    }

    public function unregister(
        User $user,
        string $token,
        string $provider = 'expo',
        string $reason = 'logout'
    ): bool {
        PushToken::query()
            ->where('user_id', (int) $user->id)
            ->where('token', $token)
            ->where('provider', $provider)
            ->update([
                'is_active' => false,
                'deactivated_reason' => $reason,
                'updated_at' => Carbon::now(),
            ]);

        return true;
    }

    public function getActiveFcmTokensForUser(int $userId): array
    {
        return PushToken::query()
            ->where('user_id', $userId)
            ->where('provider', 'fcm')
            ->where('platform', 'android')
            ->where('is_active', true)
            ->get(['token', 'platform', 'provider'])
            ->map(static fn (PushToken $token): array => [
                'token' => $token->token,
                'platform' => $token->platform,
                'provider' => $token->provider,
            ])->all();
    }

    public function deactivateByProvider(
        string $token,
        string $provider,
        string $reason
    ): bool {
        PushToken::query()
            ->where('token', $token)
            ->where('provider', $provider)
            ->update([
                'is_active' => false,
                'deactivated_reason' => $reason,
                'updated_at' => Carbon::now(),
            ]);

        return true;
    }

    public function unregisterAll(User $user): int
    {
        return PushToken::query()
            ->where('user_id', (int) $user->id)
            ->update([
                'is_active' => false,
                'deactivated_reason' => 'logout',
                'updated_at' => Carbon::now(),
            ]);
    }
}

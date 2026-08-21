<?php

namespace App\Services;

use App\Models\RateLimit;
use Carbon\Carbon;

final class AuthRateLimiter
{
    public const ACTION_LOGIN_IP = 'login_ip';
    public const ACTION_LOGIN_EMAIL = 'login_email';
    public const ACTION_REGISTER_IP = 'register_ip';
    public const ACTION_GOOGLE_IP = 'google_ip';
    public const ACTION_REFRESH_IP = 'refresh_ip';

    public function tooMany(string $action, string $identifier): bool
    {
        try {
            $identifier = $this->normalize($identifier);

            if ($identifier === '') {
                return false;
            }

            $row = $this->freshRow($action, $identifier);

            return $row !== null && $row->attempts >= $this->maxAttempts($action);
        } catch (\Throwable $exception) {
            error_log('[AuthRateLimiter] tooMany failed: ' . $exception->getMessage());
            return false;
        }
    }

    public function hit(string $action, string $identifier): void
    {
        try {
            $identifier = $this->normalize($identifier);

            if ($identifier === '') {
                return;
            }

            $now = Carbon::now();
            $bucket = $this->bucket($action, $identifier);
            $row = RateLimit::query()->where('bucket', $bucket)->first();

            if (!$row || $this->windowExpired($row, $action, $now)) {
                RateLimit::query()->updateOrCreate(
                    ['bucket' => $bucket],
                    [
                        'attempts' => 1,
                        'window_starts_at' => $now,
                        'updated_at' => $now,
                    ]
                );
                $this->pruneOldWindows();
                return;
            }

            $row->attempts = (int) $row->attempts + 1;
            $row->updated_at = $now;
            $row->save();
        } catch (\Throwable $exception) {
            error_log('[AuthRateLimiter] hit failed: ' . $exception->getMessage());
        }
    }

    public function clear(string $action, string $identifier): void
    {
        try {
            $identifier = $this->normalize($identifier);

            if ($identifier === '') {
                return;
            }

            RateLimit::query()
                ->where('bucket', $this->bucket($action, $identifier))
                ->delete();
        } catch (\Throwable $exception) {
            error_log('[AuthRateLimiter] clear failed: ' . $exception->getMessage());
        }
    }

    public function retryAfterSeconds(string $action, string $identifier): int
    {
        try {
            $identifier = $this->normalize($identifier);
            $row = $this->freshRow($action, $identifier);

            if (!$row) {
                return 0;
            }

            $endsAt = $row->window_starts_at->copy()->addSeconds($this->windowSeconds($action));

            return max(1, $endsAt->getTimestamp() - Carbon::now()->getTimestamp());
        } catch (\Throwable $exception) {
            error_log('[AuthRateLimiter] retryAfter failed: ' . $exception->getMessage());
            return 60;
        }
    }

    public static function clientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';

        return is_string($ip) && $ip !== '' ? $ip : '0.0.0.0';
    }

    private function freshRow(string $action, string $identifier): ?RateLimit
    {
        $row = RateLimit::query()
            ->where('bucket', $this->bucket($action, $identifier))
            ->first();

        if (!$row || $this->windowExpired($row, $action, Carbon::now())) {
            return null;
        }

        return $row;
    }

    private function windowExpired(RateLimit $row, string $action, Carbon $now): bool
    {
        if ($row->window_starts_at === null) {
            return true;
        }

        return $row->window_starts_at->copy()->addSeconds($this->windowSeconds($action))->lte($now);
    }

    private function maxAttempts(string $action): int
    {
        return match ($action) {
            self::ACTION_REGISTER_IP => 5,
            self::ACTION_GOOGLE_IP => 10,
            self::ACTION_REFRESH_IP => 20,
            default => 5,
        };
    }

    private function windowSeconds(string $action): int
    {
        return match ($action) {
            self::ACTION_REGISTER_IP => 3600,
            default => 900,
        };
    }

    private function bucket(string $action, string $identifier): string
    {
        return $action . ':' . hash('sha256', $identifier);
    }

    private function normalize(string $identifier): string
    {
        return strtolower(trim($identifier));
    }

    private function pruneOldWindows(): void
    {
        RateLimit::query()
            ->where('window_starts_at', '<', Carbon::now()->subDays(2))
            ->delete();
    }
}

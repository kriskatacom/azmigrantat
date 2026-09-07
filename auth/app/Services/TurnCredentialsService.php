<?php

namespace App\Services;

final class TurnCredentialsService
{
    public const DEFAULT_HOST = 'turn.azmigrantat.com';
    public const DEFAULT_TTL_SECONDS = 3600;
    public const MIN_TTL_SECONDS = 60;
    public const MAX_TTL_SECONDS = 86400;

    /**
     * @return array{
     *     iceServers: list<array<string, mixed>>,
     *     expires_at: int,
     *     ttl: int
     * }
     */
    public function issue(int $userId, int $now): array
    {
        $ttl = $this->ttlSeconds();
        $expiresAt = $now + $ttl;
        $host = $this->host();
        $stunServers = [
            [
                'urls' => ['stun:stun.l.google.com:19302'],
            ],
        ];

        $secret = $this->staticAuthSecret();
        if ($secret === '') {
            return [
                'iceServers' => $stunServers,
                'expires_at' => $expiresAt,
                'ttl' => $ttl,
            ];
        }

        $username = $expiresAt . ':' . $userId;
        $credential = $this->credential($username, $secret);

        return [
            'iceServers' => [
                ...$stunServers,
                [
                    'urls' => [
                        'turn:' . $host . ':3478?transport=udp',
                        'turn:' . $host . ':3478?transport=tcp',
                    ],
                    'username' => $username,
                    'credential' => $credential,
                ],
            ],
            'expires_at' => $expiresAt,
            'ttl' => $ttl,
        ];
    }

    public function hasTurnSecret(): bool
    {
        return $this->staticAuthSecret() !== '';
    }

    public function credential(string $username, string $secret): string
    {
        return base64_encode(hash_hmac('sha1', $username, $secret, true));
    }

    private function staticAuthSecret(): string
    {
        return $this->env('TURN_STATIC_AUTH_SECRET');
    }

    private function host(): string
    {
        $host = $this->env('TURN_HOST');

        return $host !== '' ? $host : self::DEFAULT_HOST;
    }

    private function ttlSeconds(): int
    {
        $raw = $this->env('TURN_TTL_SECONDS');
        if ($raw === '' || !ctype_digit($raw)) {
            return self::DEFAULT_TTL_SECONDS;
        }

        $ttl = (int) $raw;

        return max(self::MIN_TTL_SECONDS, min(self::MAX_TTL_SECONDS, $ttl));
    }

    private function env(string $key): string
    {
        if (array_key_exists($key, $_ENV) && $_ENV[$key] !== null && (string) $_ENV[$key] !== '') {
            return trim((string) $_ENV[$key]);
        }

        $value = getenv($key);

        return $value === false || $value === '' ? '' : trim((string) $value);
    }
}

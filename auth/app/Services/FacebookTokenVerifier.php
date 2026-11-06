<?php

namespace App\Services;

use App\Exceptions\FacebookServiceException;
use App\Exceptions\FacebookTokenException;

final class FacebookTokenVerifier
{
    private const GRAPH_VERSION = 'v24.0';
    private const GRAPH_HOST = 'https://graph.facebook.com';
    private const CONNECT_TIMEOUT_SECONDS = 3;
    private const REQUEST_TIMEOUT_SECONDS = 8;
    private const MAX_RESPONSE_BYTES = 262144;

    /**
     * @return array{id: string, email: ?string, name: string, first_name: string, last_name: string}
     */
    public function verify(string $accessToken): array
    {
        $accessToken = trim($accessToken);
        if ($accessToken === '' || strlen($accessToken) > 4096) {
            throw new FacebookTokenException('Невалиден Facebook access token.');
        }

        $appId = trim((string) ($_ENV['FACEBOOK_APP_ID'] ?? getenv('FACEBOOK_APP_ID') ?: ''));
        $appSecret = trim((string) ($_ENV['FACEBOOK_APP_SECRET'] ?? getenv('FACEBOOK_APP_SECRET') ?: ''));
        if ($appId === '' || $appSecret === '') {
            throw new FacebookServiceException('Facebook authentication не е конфигурирана.');
        }

        $appAccessToken = $appId . '|' . $appSecret;
        $debug = $this->request(
            '/debug_token',
            $appAccessToken,
            ['input_token' => $accessToken],
            true
        );
        $data = is_array($debug['data'] ?? null) ? $debug['data'] : [];

        $expiresAt = $this->positiveEpoch($data['expires_at'] ?? null);
        $dataAccessExpiresAt = $this->positiveEpoch(
            $data['data_access_expires_at']
            ?? $data['data_access_expiration_time']
            ?? null
        );
        $scopes = is_array($data['scopes'] ?? null) ? $data['scopes'] : [];
        $userId = trim((string) ($data['user_id'] ?? ''));

        if (
            ($data['is_valid'] ?? false) !== true
            || !hash_equals($appId, (string) ($data['app_id'] ?? ''))
            || $userId === ''
            || $expiresAt === null
            || $expiresAt <= time()
            || $dataAccessExpiresAt === null
            || $dataAccessExpiresAt <= time()
            || strtoupper((string) ($data['type'] ?? '')) !== 'USER'
            || !in_array('public_profile', $scopes, true)
            || !in_array('email', $scopes, true)
        ) {
            throw new FacebookTokenException('Facebook сесията е невалидна или няма необходимите разрешения.');
        }

        $profile = $this->request(
            '/me',
            $accessToken,
            [
                'fields' => 'id,name,first_name,last_name,email',
                'appsecret_proof' => hash_hmac('sha256', $accessToken, $appSecret),
            ]
        );

        if (!hash_equals($userId, trim((string) ($profile['id'] ?? '')))) {
            throw new FacebookTokenException('Facebook профилът не съответства на access token-а.');
        }

        $email = isset($profile['email']) ? strtolower(trim((string) $profile['email'])) : null;
        if ($email === '' || ($email !== null && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255))) {
            $email = null;
        }

        return [
            'id' => substr($userId, 0, 255),
            'email' => $email,
            'name' => $this->boundedText($profile['name'] ?? '', 100),
            'first_name' => $this->boundedText($profile['first_name'] ?? '', 100),
            'last_name' => $this->boundedText($profile['last_name'] ?? '', 100),
        ];
    }

    /** @return array<string, mixed> */
    private function request(string $path, string $bearerToken, array $parameters, bool $post = false): array
    {
        $url = self::GRAPH_HOST . '/' . self::GRAPH_VERSION . $path;
        if (!$post && $parameters !== []) {
            $url .= '?' . http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);
        }

        $body = '';
        $curl = curl_init($url);
        if ($curl === false) {
            throw new FacebookServiceException('Facebook услугата временно не е достъпна.');
        }

        curl_setopt_array($curl, [
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Authorization: Bearer ' . $bearerToken,
            ],
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_CONNECTTIMEOUT => self::CONNECT_TIMEOUT_SECONDS,
            CURLOPT_TIMEOUT => self::REQUEST_TIMEOUT_SECONDS,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
                if (strlen($body) + strlen($chunk) > self::MAX_RESPONSE_BYTES) {
                    return 0;
                }
                $body .= $chunk;
                return strlen($chunk);
            },
        ]);

        if ($post) {
            curl_setopt($curl, CURLOPT_POST, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($parameters, '', '&', PHP_QUERY_RFC3986));
        }

        $ok = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_errno($curl);
        curl_close($curl);

        if ($ok === false || $curlError !== 0 || $status === 429 || $status >= 500) {
            throw new FacebookServiceException('Facebook услугата временно не е достъпна.');
        }

        $decoded = json_decode($body, true);
        if ($status < 200 || $status >= 300 || !is_array($decoded) || isset($decoded['error'])) {
            throw new FacebookTokenException('Facebook сесията е невалидна.');
        }

        return $decoded;
    }

    private function boundedText(mixed $value, int $limit): string
    {
        $value = trim((string) $value);
        return function_exists('mb_substr') ? mb_substr($value, 0, $limit) : substr($value, 0, $limit);
    }

    private function positiveEpoch(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }
        if (!is_string($value) || !preg_match('/^[1-9][0-9]{0,10}$/', $value)) {
            return null;
        }

        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        return is_int($parsed) && $parsed > 0 ? $parsed : null;
    }
}

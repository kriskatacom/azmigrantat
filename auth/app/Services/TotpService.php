<?php

namespace App\Services;

use App\Models\OauthApp;
use App\Models\TotpAuthPending;
use App\Models\User;
use RuntimeException;

final class TotpService
{
    private const PENDING_TTL_SECONDS = 180;
    private const STEP_SECONDS = 30;
    private const ISSUER = 'Etome';
    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function isRequired(User $user): bool
    {
        return $user->totpEnabled();
    }

    public function status(User $user): array
    {
        return [
            'enabled' => $user->totpEnabled(),
            'pending' => $user->totpPendingSecret() !== null,
        ];
    }

    /**
     * @return array{secret: string, otpauth_url: string, account: string}
     */
    public function startSetup(User $user): array
    {
        if ($user->totpEnabled()) {
            throw new RuntimeException('Google Authenticator вече е включен.');
        }

        $secret = $this->generateSecret();
        $user->setTotpPendingSecret($this->encrypt($secret));

        return [
            'secret' => $secret,
            'otpauth_url' => $this->otpauthUrl($user, $secret),
            'account' => (string) $user->email,
            'issuer' => self::ISSUER,
        ];
    }

    public function confirmSetup(User $user, string $code): void
    {
        $pending = $user->totpPendingSecret();

        if ($pending === null) {
            throw new RuntimeException('Първо стартирайте настройката на Google Authenticator.');
        }

        $secret = $this->decrypt($pending);

        if (!$this->codeMatches($secret, $code)) {
            throw new RuntimeException('Кодът е невалиден. Опитайте с текущия код от Google Authenticator.');
        }

        $user->enableTotp($this->encrypt($secret));
    }

    public function disable(User $user, string $code): void
    {
        if (!$user->totpEnabled()) {
            $user->clearTotp();
            return;
        }

        $secret = $this->decrypt((string) $user->totpSecret());

        if (!$this->codeMatches($secret, $code)) {
            throw new RuntimeException('Кодът е невалиден. Въведете текущия код от Google Authenticator.');
        }

        $user->clearTotp();
    }

    public function createPendingAuth(User $user, OauthApp $app, bool $rememberMe): array
    {
        TotpAuthPending::query()
            ->where('user_id', $user->id)
            ->where('expires_at', '<', date('Y-m-d H:i:s'))
            ->delete();

        $plain = bin2hex(random_bytes(32));

        TotpAuthPending::create([
            'user_id' => $user->id,
            'oauth_app_id' => $app->id,
            'remember_me' => $rememberMe,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => date('Y-m-d H:i:s', time() + self::PENDING_TTL_SECONDS),
        ]);

        return [
            'success' => true,
            'requires_totp' => true,
            'pending_token' => $plain,
            'expires_in' => self::PENDING_TTL_SECONDS,
        ];
    }

    public function findPending(string $pendingToken): ?TotpAuthPending
    {
        $hash = hash('sha256', $pendingToken);
        $pending = TotpAuthPending::query()->where('token_hash', $hash)->first();

        if (!$pending) {
            return null;
        }

        if ($pending->expires_at && $pending->expires_at->getTimestamp() < time()) {
            $pending->delete();
            return null;
        }

        return $pending;
    }

    public function verifyLoginCode(User $user, string $code): bool
    {
        if (!$user->totpEnabled() || $user->totpSecret() === null) {
            return false;
        }

        try {
            $secret = $this->decrypt((string) $user->totpSecret());
        } catch (RuntimeException) {
            return false;
        }

        return $this->codeMatches($secret, $code);
    }

    public function codeMatches(string $secret, string $code): bool
    {
        $normalized = preg_replace('/\D/', '', $code) ?? '';

        if (strlen($normalized) !== 6) {
            return false;
        }

        $step = intdiv(time(), self::STEP_SECONDS);

        foreach ([$step - 1, $step, $step + 1] as $window) {
            if (hash_equals($this->hotp($secret, $window), $normalized)) {
                return true;
            }
        }

        return false;
    }

    private function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    private function otpauthUrl(User $user, string $secret): string
    {
        $label = rawurlencode(self::ISSUER . ':' . $user->email);

        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            $label,
            $secret,
            rawurlencode(self::ISSUER)
        );
    }

    private function hotp(string $secret, int $counter): string
    {
        $key = $this->base32Decode($secret);
        $bin = pack('N*', 0) . pack('N*', $counter);
        $hash = hash_hmac('sha1', $bin, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = (
            ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $value, 6, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $bytes): string
    {
        $buffer = 0;
        $bits = 0;
        $output = '';

        foreach (str_split($bytes) as $char) {
            $buffer = ($buffer << 8) | ord($char);
            $bits += 8;

            while ($bits >= 5) {
                $bits -= 5;
                $output .= self::BASE32[($buffer >> $bits) & 31];
            }
        }

        if ($bits > 0) {
            $output .= self::BASE32[($buffer << (5 - $bits)) & 31];
        }

        return $output;
    }

    private function base32Decode(string $input): string
    {
        $input = strtoupper(preg_replace('/[^A-Z2-7]/', '', $input) ?? '');
        $buffer = 0;
        $bits = 0;
        $output = '';

        foreach (str_split($input) as $char) {
            $index = strpos(self::BASE32, $char);

            if ($index === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $index;
            $bits += 5;

            if ($bits >= 8) {
                $bits -= 8;
                $output .= chr(($buffer >> $bits) & 0xFF);
            }
        }

        return $output;
    }

    private function encrypt(string $plain): string
    {
        $key = $this->encryptionKey();
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($cipher === false || $tag === '') {
            throw new RuntimeException('Ключът не можа да бъде шифрован.');
        }

        return base64_encode($iv . $tag . $cipher);
    }

    private function decrypt(string $payload): string
    {
        $raw = base64_decode($payload, true);

        if ($raw === false || strlen($raw) < 29) {
            throw new RuntimeException('Ключът е повреден.');
        }

        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $cipher = substr($raw, 28);
        $plain = openssl_decrypt($cipher, 'aes-256-gcm', $this->encryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);

        if ($plain === false) {
            throw new RuntimeException('Ключът не можа да бъде прочетен.');
        }

        return $plain;
    }

    private function encryptionKey(): string
    {
        $raw = (string) (
            ($_ENV['CARD_ENCRYPTION_KEY'] ?? getenv('CARD_ENCRYPTION_KEY'))
            ?: ($_ENV['REALTIME_INTERNAL_SECRET'] ?? getenv('REALTIME_INTERNAL_SECRET'))
        );

        if ($raw === '') {
            throw new RuntimeException('Липсва ключ за шифроване.');
        }

        return hash('sha256', $raw, true);
    }
}

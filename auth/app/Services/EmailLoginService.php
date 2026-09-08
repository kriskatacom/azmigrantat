<?php

namespace App\Services;

use App\Models\EmailAuthPending;
use App\Models\OauthApp;
use App\Models\User;
use InvalidArgumentException;
use RuntimeException;

final class EmailLoginService
{
    public const PENDING_TTL_SECONDS = 600;

    public function isRequired(User $user): bool
    {
        return $user->emailLoginEnabled();
    }

    public function setEnabled(User $user, bool $enabled): void
    {
        $options = is_array($user->options) ? $user->options : [];
        $options['email_login_enabled'] = $enabled;
        $user->options = $options;
        $user->save();
    }

    /**
     * @return array{success: true, requires_email_code: true, pending_token: string, expires_in: int}
     */
    public function createPendingAuth(User $user, OauthApp $app, bool $rememberMe): array
    {
        EmailAuthPending::query()
            ->where('user_id', $user->id)
            ->delete();

        $plain = bin2hex(random_bytes(32));
        $code = $this->generateCode();

        EmailAuthPending::create([
            'user_id' => $user->id,
            'oauth_app_id' => $app->id,
            'remember_me' => $rememberMe,
            'token_hash' => hash('sha256', $plain),
            'code_hash' => hash('sha256', $code),
            'expires_at' => date('Y-m-d H:i:s', time() + self::PENDING_TTL_SECONDS),
        ]);

        $this->sendCode($user, $code);

        return [
            'success' => true,
            'requires_email_code' => true,
            'pending_token' => $plain,
            'expires_in' => self::PENDING_TTL_SECONDS,
        ];
    }

    public function findPending(string $pendingToken): ?EmailAuthPending
    {
        $hash = hash('sha256', $pendingToken);
        $pending = EmailAuthPending::query()->where('token_hash', $hash)->first();

        if (!$pending) {
            return null;
        }

        if ($pending->expires_at && $pending->expires_at->getTimestamp() < time()) {
            $pending->delete();
            return null;
        }

        return $pending;
    }

    public function resend(EmailAuthPending $pending, User $user): void
    {
        $code = $this->generateCode();
        $pending->code_hash = hash('sha256', $code);
        $pending->expires_at = date('Y-m-d H:i:s', time() + self::PENDING_TTL_SECONDS);
        $pending->save();
        $this->sendCode($user, $code);
    }

    public function verify(EmailAuthPending $pending, string $code): void
    {
        $normalized = preg_replace('/\D/', '', $code) ?? '';

        if (strlen($normalized) !== 6) {
            throw new InvalidArgumentException('Въведете 6-цифрения код от имейла.');
        }

        if (!hash_equals((string) $pending->code_hash, hash('sha256', $normalized))) {
            throw new RuntimeException('Кодът е невалиден.');
        }
    }

    private function sendCode(User $user, string $code): void
    {
        EmailService::send(
            $user->email,
            'Код за вход: ' . $code,
            'login-email-code',
            [
                'name' => $user->name ?: $user->email,
                'code' => $code,
                'otpCode' => $code,
                'otpOriginLines' => EmailService::otpOriginLines($code),
            ]
        );
    }

    private function generateCode(): string
    {
        if ($this->isTestMode()) {
            return '123456';
        }

        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function isTestMode(): bool
    {
        return filter_var($_ENV['APP_TEST_MODE'] ?? getenv('APP_TEST_MODE') ?: false, FILTER_VALIDATE_BOOLEAN);
    }
}

<?php

namespace App\Services;

use App\Models\OauthAccessToken;
use App\Models\User;

final class PasswordResetService
{
    private const CODE_TTL_SECONDS = 900;
    private const MAX_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;
    private const GENERIC_REQUEST_MESSAGE =
        'Ако има профил с този имейл, ще получиш код за възстановяване.';

    public function issueAndSend(User $user): void
    {
        try {
            $code = $this->isTestMode()
                ? '123456'
                : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            $user->password_reset_hash = hash('sha256', $this->pepper() . $code);
            $user->password_reset_expires_at = date('Y-m-d H:i:s', time() + self::CODE_TTL_SECONDS);
            $user->password_reset_sent_at = date('Y-m-d H:i:s');
            $user->password_reset_attempts = 0;
            $user->password_reset_locked_until = null;
            $user->save();

            app_log('[PasswordReset] code stored user_id=' . (int) $user->id);

            $sent = EmailService::send(
                $user->email,
                'Код за възстановяване: ' . $code,
                'forgot-password-code',
                [
                    'name' => $user->name ?: $user->email,
                    'code' => $code,
                    'otpCode' => $code,
                    'otpOriginLines' => EmailService::otpOriginLines($code),
                ]
            );

            app_log(
                '[PasswordReset] email '
                . ($sent ? 'sent' : 'FAILED')
                . ' user_id=' . (int) $user->id
                . ' to=' . $user->email
            );
        } catch (\Throwable $exception) {
            app_log(
                '[PasswordReset] issueAndSend exception user_id=' . (int) $user->id
                . ' class=' . $exception::class
                . ' message=' . $exception->getMessage()
            );
        }
    }

    /**
     * @return array{ok: bool, status: int, message: string}
     */
    public function reset(User $user, string $code, string $password): array
    {
        if ($this->isLocked($user)) {
            return [
                'ok' => false,
                'status' => 429,
                'message' => 'Твърде много грешни опити. Опитайте отново след 15 минути.',
            ];
        }

        $normalizedCode = preg_replace('/\D/', '', $code) ?? '';

        if (strlen($normalizedCode) !== 6) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Въведете 6-цифрения код от имейла.',
            ];
        }

        if (
            !$user->password_reset_hash
            || !$user->password_reset_expires_at
            || strtotime((string) $user->password_reset_expires_at) < time()
        ) {
            return [
                'ok' => false,
                'status' => 400,
                'message' => 'Кодът е невалиден или е изтекъл. Изпратете нов код.',
            ];
        }

        $expected = hash('sha256', $this->pepper() . $normalizedCode);

        if (!hash_equals((string) $user->password_reset_hash, $expected)) {
            $user->password_reset_attempts = (int) $user->password_reset_attempts + 1;

            if ($user->password_reset_attempts >= self::MAX_ATTEMPTS) {
                $user->password_reset_locked_until = date(
                    'Y-m-d H:i:s',
                    strtotime('+' . self::LOCK_MINUTES . ' minutes')
                );
                $user->save();

                return [
                    'ok' => false,
                    'status' => 429,
                    'message' => 'Твърде много грешни опити. Опитайте отново след 15 минути.',
                ];
            }

            $user->save();

            return [
                'ok' => false,
                'status' => 401,
                'message' => 'Невалиден код за възстановяване.',
            ];
        }

        if (
            isset($user->password_hash)
            && password_verify($password, $user->password_hash)
        ) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Новата парола трябва да бъде различна от текущата.',
            ];
        }

        $user->password_hash = $password;
        $this->clearResetState($user);
        $user->save();
        $this->revokeAllSessions((int) $user->id);

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Паролата беше променена успешно. Вече можете да влезете.',
        ];
    }

    public function genericRequestMessage(): string
    {
        return self::GENERIC_REQUEST_MESSAGE;
    }

    public function genericInvalidCodeMessage(): string
    {
        return 'Невалиден код за възстановяване.';
    }

    private function clearResetState(User $user): void
    {
        $user->password_reset_hash = null;
        $user->password_reset_expires_at = null;
        $user->password_reset_sent_at = null;
        $user->password_reset_attempts = 0;
        $user->password_reset_locked_until = null;
        $user->reset_token = null;
    }

    private function revokeAllSessions(int $userId): void
    {
        $tokens = OauthAccessToken::query()
            ->where('user_id', $userId)
            ->get();

        $notifier = null;

        foreach ($tokens as $token) {
            $tokenHash = (string) $token->token;
            $token->delete();

            try {
                $notifier ??= new RealtimeNotifier();
                $notifier->notifySessionRevoked($userId, $tokenHash, 'password_reset');
            } catch (\Throwable $exception) {
                error_log('[PasswordReset] session revoke failed user_id=' . $userId);
            }
        }
    }

    private function isLocked(User $user): bool
    {
        return $user->password_reset_locked_until
            && strtotime((string) $user->password_reset_locked_until) > time();
    }

    private function isTestMode(): bool
    {
        return filter_var($_ENV['PASSWORD_RESET_TEST_MODE'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    private function pepper(): string
    {
        return (string) (
            $_ENV['PASSWORD_RESET_PEPPER']
            ?? $_ENV['PHONE_VERIFY_PEPPER']
            ?? $_ENV['REALTIME_INTERNAL_SECRET']
            ?? 'eto-me-password-reset'
        );
    }
}

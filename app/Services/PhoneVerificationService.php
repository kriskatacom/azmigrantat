<?php

namespace App\Services;

use App\Models\User;

final class PhoneVerificationService
{
    private const CODE_TTL_SECONDS = 600;
    private const SEND_COOLDOWN_SECONDS = 60;
    private const MAX_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;

    public function __construct(
        private readonly SmsApiService $smsApi,
        private readonly WhatsAppCloudService $whatsApp,
    ) {
    }

    public static function make(): self
    {
        return new self(new SmsApiService(), new WhatsAppCloudService());
    }

    public function isTestMode(): bool
    {
        return filter_var($_ENV['PHONE_VERIFY_TEST_MODE'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function normalizePhone(string $raw): ?string
    {
        $value = preg_replace('/[^\d+]/', '', trim($raw)) ?? '';
        $value = str_replace('+', '', $value);

        if (str_starts_with($value, '00')) {
            $value = substr($value, 2);
        }

        if (preg_match('/^0[1-9]\d{7,8}$/', $value)) {
            $value = '359' . substr($value, 1);
        }

        if (!preg_match('/^[1-9]\d{7,14}$/', $value)) {
            return null;
        }

        return $value;
    }

    /**
     * @return array{ok: bool, status: int, message: string, channel?: string, retry_after?: int}
     */
    public function send(User $user, string $rawPhone, string $preferredChannel = 'whatsapp'): array
    {
        if ($this->isLocked($user)) {
            return [
                'ok' => false,
                'status' => 429,
                'message' => 'Твърде много опити. Опитайте отново след 15 минути.',
            ];
        }

        $phone = $this->normalizePhone($rawPhone);
        if ($phone === null) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Въведете валиден телефонен номер с код на държавата, например +359888123456.',
            ];
        }

        $taken = User::query()
            ->where('id', '!=', (int) $user->id)
            ->where('phone', $phone)
            ->whereNotNull('phone_verified_at')
            ->exists();

        if ($taken) {
            return [
                'ok' => false,
                'status' => 409,
                'message' => 'Този телефонен номер вече е потвърден от друг профил.',
            ];
        }

        if (
            $user->phone === $phone
            && $user->phone_verified_at
        ) {
            return [
                'ok' => true,
                'status' => 200,
                'message' => 'Номерът вече е потвърден.',
                'channel' => 'already_verified',
            ];
        }

        if ($user->phone_verification_sent_at) {
            $elapsed = time() - strtotime((string) $user->phone_verification_sent_at);
            if ($elapsed >= 0 && $elapsed < self::SEND_COOLDOWN_SECONDS) {
                $retryAfter = self::SEND_COOLDOWN_SECONDS - $elapsed;
                return [
                    'ok' => false,
                    'status' => 429,
                    'message' => 'Моля, изчакайте ' . $retryAfter . ' секунди преди следващо изпращане.',
                    'retry_after' => $retryAfter,
                ];
            }
        }

        $code = $this->isTestMode()
            ? '123456'
            : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->phone_verification_phone = $phone;
        $user->phone_verification_hash = hash('sha256', $this->pepper() . $code);
        $user->phone_verification_expires_at = date('Y-m-d H:i:s', time() + self::CODE_TTL_SECONDS);
        $user->phone_verification_sent_at = date('Y-m-d H:i:s');
        $user->two_factor_attempts = 0;
        $user->save();

        $channel = $this->isTestMode()
            ? ($preferredChannel === 'sms' ? 'sms' : 'whatsapp')
            : $this->deliver($phone, $code, $preferredChannel);

        if ($channel === null) {
            return [
                'ok' => false,
                'status' => 502,
                'message' => 'Кодът не можа да бъде изпратен. Проверете SMSAPI и WhatsApp настройките.',
            ];
        }

        $label = $channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Изпратихме код чрез ' . $label . '. Валиден е 10 минути.',
            'channel' => $channel,
        ];
    }

    /**
     * @return array{ok: bool, status: int, message: string}
     */
    public function verify(User $user, string $rawPhone, string $code): array
    {
        if ($this->isLocked($user)) {
            return [
                'ok' => false,
                'status' => 429,
                'message' => 'Твърде много грешни опити. Опитайте отново след 15 минути.',
            ];
        }

        $phone = $this->normalizePhone($rawPhone);
        $normalizedCode = preg_replace('/\D/', '', $code) ?? '';

        if ($phone === null || strlen($normalizedCode) !== 6) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Въведете 6-цифрения код и валиден телефонен номер.',
            ];
        }

        if (
            $user->phone_verification_phone !== $phone
            || !$user->phone_verification_hash
            || !$user->phone_verification_expires_at
            || strtotime((string) $user->phone_verification_expires_at) < time()
        ) {
            return [
                'ok' => false,
                'status' => 400,
                'message' => 'Кодът е изтекъл. Изпратете нов код.',
            ];
        }

        $expected = hash('sha256', $this->pepper() . $normalizedCode);
        if (!hash_equals((string) $user->phone_verification_hash, $expected)) {
            $user->two_factor_attempts = (int) $user->two_factor_attempts + 1;
            if ($user->two_factor_attempts >= self::MAX_ATTEMPTS) {
                $user->two_factor_locked_until = date(
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
                'message' => 'Грешен код.',
            ];
        }

        $user->phone = $phone;
        $user->phone_verified_at = date('Y-m-d H:i:s');
        $user->phone_verification_hash = null;
        $user->phone_verification_expires_at = null;
        $user->phone_verification_sent_at = null;
        $user->phone_verification_phone = null;
        $user->two_factor_attempts = 0;
        $user->two_factor_locked_until = null;
        $user->save();

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Телефонният номер е потвърден.',
        ];
    }

    public function isPhoneVerified(User $user): bool
    {
        return $user->phone
            && $user->phone_verified_at
            && $user->phone_verification_phone === null;
    }

    private function deliver(string $phone, string $code, string $preferredChannel): ?string
    {
        $message = 'Ето ме: кодът за потвърждение е ' . $code . '. Валиден 10 минути.';
        $wantWhatsApp = $preferredChannel !== 'sms';

        if ($wantWhatsApp && $this->whatsApp->sendOtp($phone, $code)) {
            return 'whatsapp';
        }

        if ($this->smsApi->sendSms($phone, $message)) {
            return 'sms';
        }

        return null;
    }

    private function isLocked(User $user): bool
    {
        return $user->two_factor_locked_until
            && strtotime((string) $user->two_factor_locked_until) > time();
    }

    private function pepper(): string
    {
        return (string) ($_ENV['PHONE_VERIFY_PEPPER'] ?? $_ENV['REALTIME_INTERNAL_SECRET'] ?? 'eto-me-phone');
    }
}

<?php

namespace App\Services;

use App\Models\DeviceAuthPending;
use App\Models\OauthApp;
use App\Models\User;
use App\Models\UserDevice;
use Carbon\Carbon;
use InvalidArgumentException;
use RuntimeException;

final class DeviceAuthService
{
    public const PENDING_TTL_SECONDS = 600;
    public const EMAIL_CODE_TTL_SECONDS = 900;

    /**
     * @return array{uuid: string, platform: string, name: string|null}
     */
    public function deviceFromInput(array $input): array
    {
        $uuid = trim((string) ($input['device_uuid'] ?? ''));

        if ($uuid === '' || strlen($uuid) < 8) {
            throw new InvalidArgumentException('Липсва идентификатор на устройството.');
        }

        $platform = strtolower(trim((string) ($input['platform'] ?? 'android')));
        if (!in_array($platform, [UserDevice::PLATFORM_ANDROID, UserDevice::PLATFORM_IOS], true)) {
            $platform = UserDevice::PLATFORM_ANDROID;
        }

        $name = trim((string) ($input['device_name'] ?? ''));

        return [
            'uuid' => $uuid,
            'platform' => $platform,
            'name' => $name !== '' ? mb_substr($name, 0, 255) : null,
        ];
    }

    public function isTrusted(User $user, string $deviceUuid): bool
    {
        $device = $this->findDevice($user, $deviceUuid);

        return $device !== null && $device->is_trusted && $device->is_active;
    }

    public function hasOtherTrustedDevices(User $user, string $deviceUuid): bool
    {
        return UserDevice::query()
            ->where('user_id', $user->id)
            ->where('is_trusted', true)
            ->where('is_active', true)
            ->where('device_uuid', '!=', $deviceUuid)
            ->exists();
    }

    public function needsNewDeviceChallenge(User $user, string $deviceUuid): bool
    {
        if ($this->isTrusted($user, $deviceUuid)) {
            return false;
        }

        return $this->hasOtherTrustedDevices($user, $deviceUuid);
    }

    /**
     * @param array{uuid: string, platform: string, name: string|null} $deviceInfo
     * @return array{device_trusted: bool, device_secret: string, has_pin: bool}
     */
    public function trustDevice(User $user, array $deviceInfo): array
    {
        $device = $this->findDevice($user, $deviceInfo['uuid']);
        $secret = bin2hex(random_bytes(32));

        $attributes = [
            'platform' => $deviceInfo['platform'],
            'device_name' => $deviceInfo['name'],
            'is_active' => true,
            'is_trusted' => true,
            'trusted_at' => Carbon::now(),
            'login_secret_hash' => hash('sha256', $secret),
            'last_seen_at' => Carbon::now(),
        ];

        if ($device) {
            $device->fill($attributes);
            $device->save();
        } else {
            UserDevice::create(array_merge($attributes, [
                'user_id' => $user->id,
                'device_uuid' => $deviceInfo['uuid'],
                'push_token' => null,
            ]));
        }

        return [
            'device_trusted' => true,
            'device_secret' => $secret,
            'has_pin' => $this->hasPin($user),
        ];
    }

    /**
     * @param array{uuid: string, platform: string, name: string|null} $deviceInfo
     */
    public function createPending(
        User $user,
        OauthApp $app,
        bool $rememberMe,
        array $deviceInfo
    ): array {
        DeviceAuthPending::query()
            ->where('user_id', $user->id)
            ->where('new_device_uuid', $deviceInfo['uuid'])
            ->delete();

        $token = bin2hex(random_bytes(32));

        $pending = DeviceAuthPending::create([
            'user_id' => $user->id,
            'oauth_app_id' => $app->id,
            'remember_me' => $rememberMe,
            'token_hash' => hash('sha256', $token),
            'new_device_uuid' => $deviceInfo['uuid'],
            'platform' => $deviceInfo['platform'],
            'device_name' => $deviceInfo['name'],
            'expires_at' => Carbon::now()->addSeconds(self::PENDING_TTL_SECONDS),
        ]);

        $this->notifyTrustedDevices($user, $pending);

        return [
            'success' => true,
            'requires_device_verification' => true,
            'pending_token' => $token,
            'expires_in' => self::PENDING_TTL_SECONDS,
            'methods' => ['previous_device', 'email'],
            'device_name' => $deviceInfo['name'],
        ];
    }

    public function findPendingByToken(string $token): ?DeviceAuthPending
    {
        $normalized = trim($token);
        if ($normalized === '') {
            return null;
        }

        $pending = DeviceAuthPending::query()
            ->where('token_hash', hash('sha256', $normalized))
            ->first();

        if (!$pending || $pending->isExpired()) {
            return null;
        }

        return $pending;
    }

    public function pendingStatus(DeviceAuthPending $pending): array
    {
        return [
            'success' => true,
            'approved' => $pending->isApproved(),
            'expires_in' => max(0, $pending->expires_at->getTimestamp() - time()),
        ];
    }

    public function approvePending(User $approver, string $token, string $approverDeviceUuid): void
    {
        $pending = $this->findPendingByToken($token);

        if (!$pending || (int) $pending->user_id !== (int) $approver->id) {
            throw new RuntimeException('Заявката за ново устройство не е намерена.');
        }

        $this->assertApproverDevice($approver, $approverDeviceUuid);

        $pending->approved_at = Carbon::now();
        $pending->save();
    }

    public function approvePendingById(User $approver, int $pendingId, string $approverDeviceUuid): void
    {
        $pending = DeviceAuthPending::query()
            ->where('id', $pendingId)
            ->where('user_id', $approver->id)
            ->first();

        if (!$pending || $pending->isExpired()) {
            throw new RuntimeException('Заявката за ново устройство не е намерена.');
        }

        $this->assertApproverDevice($approver, $approverDeviceUuid);

        $pending->approved_at = Carbon::now();
        $pending->save();
    }

    public function sendEmailCode(DeviceAuthPending $pending): void
    {
        $user = $pending->user;
        if (!$user) {
            throw new RuntimeException('Потребителят не е намерен.');
        }

        $code = $this->isTestMode()
            ? '123456'
            : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $pending->email_code_hash = hash('sha256', $code);
        $pending->email_code_expires_at = Carbon::now()->addSeconds(self::EMAIL_CODE_TTL_SECONDS);
        $pending->save();

        EmailService::send(
            $user->email,
            'Код за ново устройство: ' . $code,
            'device-login-code',
            [
                'name' => $user->name ?: $user->email,
                'code' => $code,
                'otpCode' => $code,
                'device_name' => $pending->device_name ?: 'ново устройство',
                'otpOriginLines' => EmailService::otpOriginLines($code),
            ]
        );
    }

    public function verifyEmailCode(DeviceAuthPending $pending, string $code): void
    {
        $normalized = preg_replace('/\D/', '', $code) ?? '';

        if (strlen($normalized) !== 6) {
            throw new InvalidArgumentException('Въведете 6-цифрения код от имейла.');
        }

        if (
            !$pending->email_code_hash
            || $pending->email_code_expires_at === null
            || $pending->email_code_expires_at->getTimestamp() <= time()
        ) {
            throw new RuntimeException('Първо изпратете код към имейла.');
        }

        if (!hash_equals((string) $pending->email_code_hash, hash('sha256', $normalized))) {
            throw new RuntimeException('Кодът е невалиден.');
        }

        $pending->approved_at = Carbon::now();
        $pending->save();
    }

    public function listPendingForUser(User $user): array
    {
        return DeviceAuthPending::query()
            ->where('user_id', $user->id)
            ->whereNull('approved_at')
            ->where('expires_at', '>', Carbon::now())
            ->orderByDesc('id')
            ->get()
            ->map(static function (DeviceAuthPending $pending): array {
                return [
                    'id' => (int) $pending->id,
                    'device_name' => $pending->device_name,
                    'platform' => $pending->platform,
                    'created_at' => $pending->created_at?->format('c'),
                    'expires_at' => $pending->expires_at?->format('c'),
                ];
            })
            ->all();
    }

    public function verifyDeviceSecret(User $user, string $deviceUuid, string $secret): bool
    {
        $device = $this->findDevice($user, $deviceUuid);

        if (!$device || !$device->is_trusted || !$device->login_secret_hash) {
            return false;
        }

        return hash_equals(
            (string) $device->login_secret_hash,
            hash('sha256', $secret)
        );
    }

    public function hasPin(User $user): bool
    {
        $options = is_array($user->options) ? $user->options : [];
        $hash = $options['login_pin_hash'] ?? '';

        return is_string($hash) && $hash !== '';
    }

    public function isPinLoginEnabled(User $user): bool
    {
        $options = is_array($user->options) ? $user->options : [];

        return $this->hasPin($user)
            && filter_var($options['login_pin_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function setPinLoginEnabled(User $user, bool $enabled): void
    {
        if ($enabled && !$this->hasPin($user)) {
            throw new InvalidArgumentException(
                'Първо задайте PIN код, преди да го изисквате при вход.'
            );
        }

        $options = is_array($user->options) ? $user->options : [];
        $options['login_pin_enabled'] = $enabled;
        $user->options = $options;
        $user->save();
    }

    public function setPin(User $user, string $pin): void
    {
        $normalized = preg_replace('/\D/', '', $pin) ?? '';

        if (strlen($normalized) < 4 || strlen($normalized) > 6) {
            throw new InvalidArgumentException('PIN кодът трябва да е между 4 и 6 цифри.');
        }

        $options = is_array($user->options) ? $user->options : [];
        $options['login_pin_hash'] = password_hash($normalized, PASSWORD_DEFAULT);
        $user->options = $options;
        $user->save();
    }

    public function verifyPin(User $user, string $pin): bool
    {
        $options = is_array($user->options) ? $user->options : [];
        $hash = $options['login_pin_hash'] ?? '';

        if (!is_string($hash) || $hash === '') {
            return false;
        }

        $normalized = preg_replace('/\D/', '', $pin) ?? '';

        return password_verify($normalized, $hash);
    }

    public function clearPin(User $user): void
    {
        $options = is_array($user->options) ? $user->options : [];
        unset($options['login_pin_hash'], $options['login_pin_enabled']);
        $user->options = $options;
        $user->save();
    }

    public function deviceInfoFromPending(DeviceAuthPending $pending): array
    {
        return [
            'uuid' => (string) $pending->new_device_uuid,
            'platform' => (string) ($pending->platform ?: UserDevice::PLATFORM_ANDROID),
            'name' => $pending->device_name,
        ];
    }

    private function assertApproverDevice(User $approver, string $deviceUuid): void
    {
        if (!$this->isTrusted($approver, $deviceUuid)) {
            throw new RuntimeException(
                'Потвърждението трябва да е от вече доверено устройство.'
            );
        }
    }

    private function findDevice(User $user, string $deviceUuid): ?UserDevice
    {
        return UserDevice::query()
            ->where('user_id', $user->id)
            ->where('device_uuid', $deviceUuid)
            ->first();
    }

    private function notifyTrustedDevices(User $user, DeviceAuthPending $pending): void
    {
        $deviceName = $pending->device_name ?: 'ново устройство';

        try {
            (new PushNotificationService())->sendToUser(
                $user,
                'Ново устройство',
                'Някой се опитва да влезе от ' . $deviceName . '. Отворете приложението, за да потвърдите.',
                [
                    'type' => 'device_login_approval',
                    'pending_id' => (string) $pending->id,
                    'device_name' => $deviceName,
                ],
                null,
                'chat_message'
            );
        } catch (\Throwable $exception) {
            error_log('[DeviceAuth] push failed: ' . $exception->getMessage());
        }
    }

    private function isTestMode(): bool
    {
        return filter_var($_ENV['APP_TEST_MODE'] ?? getenv('APP_TEST_MODE') ?: false, FILTER_VALIDATE_BOOLEAN);
    }
}

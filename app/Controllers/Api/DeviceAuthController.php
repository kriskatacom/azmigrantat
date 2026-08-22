<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthApp;
use App\Models\User;
use App\Services\AuthRateLimiter;
use App\Services\DeviceAuthService;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use RuntimeException;

final class DeviceAuthController extends BaseController
{
    private DeviceAuthService $devices;

    public function __construct()
    {
        $this->devices = new DeviceAuthService();
    }

    public function options()
    {
        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'client_id' => 'required|string',
            'email' => 'required|email',
            'device_uuid' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        if (!$this->resolvePublicApplication((string) $input['client_id'])) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $email = strtolower(trim((string) $input['email']));
        $user = User::where('email', $email)->first();
        $deviceUuid = trim((string) $input['device_uuid']);

        if (!$user || !$user->is_active) {
            return $this->json([
                'success' => true,
                'trusted' => false,
                'has_pin' => false,
            ]);
        }

        return $this->json([
            'success' => true,
            'trusted' => $this->devices->isTrusted($user, $deviceUuid),
            'has_pin' => $this->devices->isPinLoginEnabled($user),
        ]);
    }

    public function pendingStatus()
    {
        $input = $this->jsonInput();
        $pending = $this->devices->findPendingByToken((string) ($input['pending_token'] ?? ''));

        if ($pending === null) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
            ], 401);
        }

        return $this->json($this->devices->pendingStatus($pending));
    }

    public function completePending()
    {
        $input = $this->jsonInput();
        $pending = $this->devices->findPendingByToken((string) ($input['pending_token'] ?? ''));

        if ($pending === null) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
            ], 401);
        }

        if (!$pending->isApproved()) {
            return $this->json([
                'success' => false,
                'message' => 'Чака се потвърждение от предишното устройство или код по имейл.',
            ], 409);
        }

        return $this->issueFromPending($pending);
    }

    public function sendEmailCode()
    {
        $input = $this->jsonInput();
        $pending = $this->devices->findPendingByToken((string) ($input['pending_token'] ?? ''));

        if ($pending === null) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
            ], 401);
        }

        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();

        if ($limiter->tooMany(AuthRateLimiter::ACTION_PASSWORD_FORGOT_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_PASSWORD_FORGOT_IP,
                $ip
            );
        }

        $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_FORGOT_IP, $ip);

        try {
            $this->devices->sendEmailCode($pending);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->json([
            'success' => true,
            'message' => 'Изпратихме 6-цифрен код на имейла на профила.',
        ]);
    }

    public function verifyEmailCode()
    {
        $input = $this->jsonInput();
        $pending = $this->devices->findPendingByToken((string) ($input['pending_token'] ?? ''));

        if ($pending === null) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
            ], 401);
        }

        try {
            $this->devices->verifyEmailCode($pending, (string) ($input['code'] ?? ''));
        } catch (InvalidArgumentException | RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $exception instanceof InvalidArgumentException ? 422 : 401);
        }

        return $this->issueFromPending($pending);
    }

    public function listPending()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        return $this->json([
            'success' => true,
            'pending' => $this->devices->listPendingForUser($user),
        ]);
    }

    public function approve()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $pendingId = (int) ($input['pending_id'] ?? 0);
        $deviceUuid = trim((string) ($input['device_uuid'] ?? ''));

        if ($pendingId <= 0 || $deviceUuid === '') {
            return $this->json([
                'success' => false,
                'message' => 'Липсват данни за потвърждението.',
            ], 422);
        }

        try {
            $this->devices->approvePendingById($user, $pendingId, $deviceUuid);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        }

        return $this->json([
            'success' => true,
            'message' => 'Устройството е потвърдено.',
        ]);
    }

    public function setPin()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        try {
            $this->devices->setPin($user, (string) ($input['pin'] ?? ''));
        } catch (InvalidArgumentException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->json([
            'success' => true,
            'has_pin' => true,
            'pin_login_enabled' => $this->devices->isPinLoginEnabled($user),
            'message' => 'PIN кодът за вход е записан.',
        ]);
    }

    public function setPinLoginEnabled()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $enabled = filter_var($input['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);

        try {
            $this->devices->setPinLoginEnabled($user, $enabled);
        } catch (InvalidArgumentException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        $user->refresh();

        return $this->json([
            'success' => true,
            'has_pin' => $this->devices->hasPin($user),
            'pin_login_enabled' => $this->devices->isPinLoginEnabled($user),
            'message' => $enabled
                ? 'При вход ще се иска PIN код.'
                : 'При вход няма да се иска PIN код.',
        ]);
    }

    public function clearPin()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $this->devices->clearPin($user);

        return $this->json([
            'success' => true,
            'has_pin' => false,
            'pin_login_enabled' => false,
            'message' => 'PIN кодът за вход е премахнат.',
        ]);
    }

    public function loginPin()
    {
        $input = $this->jsonInput();
        $auth = $this->validateTrustedLogin($input);

        if ($auth !== null) {
            return $auth;
        }

        $user = User::where('email', strtolower(trim((string) $input['email'])))->first();
        $deviceInfo = $this->devices->deviceFromInput($input);

        if (
            !$user
            || !$user->is_active
            || !$this->devices->isTrusted($user, $deviceInfo['uuid'])
            || !$this->devices->isPinLoginEnabled($user)
            || !$this->devices->verifyPin($user, (string) ($input['pin'] ?? ''))
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден PIN код или устройство.',
            ], 401);
        }

        $app = $this->resolvePublicApplication((string) $input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        return (new MobileAuthController())->issueAuthenticatedSession(
            $user,
            $app,
            $this->rememberMeFromInput($input),
            $deviceInfo,
            true
        );
    }

    public function loginDevice()
    {
        $input = $this->jsonInput();
        $auth = $this->validateTrustedLogin($input);

        if ($auth !== null) {
            return $auth;
        }

        $user = User::where('email', strtolower(trim((string) $input['email'])))->first();
        $deviceInfo = $this->devices->deviceFromInput($input);
        $secret = (string) ($input['device_secret'] ?? '');

        if (
            !$user
            || !$user->is_active
            || $secret === ''
            || !$this->devices->verifyDeviceSecret($user, $deviceInfo['uuid'], $secret)
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Това устройство вече не е доверено. Влезте с имейл и парола.',
            ], 401);
        }

        $app = $this->resolvePublicApplication((string) $input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        return (new MobileAuthController())->issueAuthenticatedSession(
            $user,
            $app,
            $this->rememberMeFromInput($input),
            $deviceInfo,
            true
        );
    }

    /**
     * @return mixed|null
     */
    private function validateTrustedLogin(array $input)
    {
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        $email = strtolower(trim((string) ($input['email'] ?? '')));

        if (
            $limiter->tooMany(AuthRateLimiter::ACTION_LOGIN_IP, $ip)
            || $limiter->tooMany(AuthRateLimiter::ACTION_LOGIN_EMAIL, $email)
        ) {
            $action = $limiter->tooMany(AuthRateLimiter::ACTION_LOGIN_IP, $ip)
                ? AuthRateLimiter::ACTION_LOGIN_IP
                : AuthRateLimiter::ACTION_LOGIN_EMAIL;
            $identifier = $action === AuthRateLimiter::ACTION_LOGIN_IP ? $ip : $email;

            return $this->jsonTooManyAuthAttempts($limiter, $action, $identifier);
        }

        $validator = Validator::make($input, [
            'client_id' => 'required|string',
            'email' => 'required|email',
            'device_uuid' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        if (!$this->resolvePublicApplication((string) $input['client_id'])) {
            $limiter->hit(AuthRateLimiter::ACTION_LOGIN_IP, $ip);

            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        try {
            $this->devices->deviceFromInput($input);
        } catch (InvalidArgumentException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return null;
    }

    private function issueFromPending(\App\Models\DeviceAuthPending $pending)
    {
        $user = User::query()->find($pending->user_id);
        $app = OauthApp::query()->find($pending->oauth_app_id);

        if (!$user || !$app || !$user->is_active) {
            $pending->delete();

            return $this->json([
                'success' => false,
                'message' => 'Проверката не е валидна.',
            ], 401);
        }

        $deviceInfo = $this->devices->deviceInfoFromPending($pending);
        $rememberMe = (bool) $pending->remember_me;
        $pending->delete();

        return (new MobileAuthController())->issueAuthenticatedSession(
            $user,
            $app,
            $rememberMe,
            $deviceInfo,
            true
        );
    }

    private function resolvePublicApplication(string $clientId): ?OauthApp
    {
        $app = OauthApp::where('client_id', trim($clientId))
            ->where('is_active', 1)
            ->first();

        if (!$app) {
            return null;
        }

        $options = is_array($app->options) ? $app->options : [];

        return ($options['client_type'] ?? null) === 'public' ? $app : null;
    }

    private function rememberMeFromInput(array $input): bool
    {
        return filter_var($input['remember_me'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        return is_array($input) ? $input : [];
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }
}

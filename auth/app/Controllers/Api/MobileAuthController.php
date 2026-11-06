<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Exceptions\FacebookServiceException;
use App\Exceptions\FacebookTokenException;
use App\Models\OauthAccessToken;
use App\Models\OauthApp;
use App\Models\User;
use App\Models\UserSocialAccount;
use App\Services\AuthRateLimiter;
use App\Services\DeviceAuthService;
use App\Services\EmailLoginService;
use App\Services\FacebookAuthFeature;
use App\Services\FacebookTokenVerifier;
use App\Services\PasswordResetService;
use App\Services\RealtimeNotifier;
use App\Services\TotpService;
use Illuminate\Support\Facades\Validator;
use Google\Client as GoogleClient;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\QueryException;
use InvalidArgumentException;

final class MobileAuthController extends BaseController
{
    private const ACCESS_TTL_SECONDS = 2592000;
    private const REFRESH_TTL_SECONDS = 5184000;
    private const SESSION_TTL_SECONDS = 86400;

    public function login()
    {
        $input = $this->jsonInput();
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
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $user = User::where('email', $email)->first();

        if (!$user || !isset($user->password_hash) || !password_verify($input['password'], $user->password_hash)) {
            $limiter->hit(AuthRateLimiter::ACTION_LOGIN_IP, $ip);
            $limiter->hit(AuthRateLimiter::ACTION_LOGIN_EMAIL, $email);

            return $this->json([
                'success' => false,
                'message' => 'Невалиден имейл или парола.',
            ], 401);
        }

        if (!$user->is_active) {
            $limiter->hit(AuthRateLimiter::ACTION_LOGIN_IP, $ip);
            $limiter->hit(AuthRateLimiter::ACTION_LOGIN_EMAIL, $email);

            return $this->json([
                'success' => false,
                'message' => 'Профилът е деактивиран.',
            ], 403);
        }

        $limiter->clear(AuthRateLimiter::ACTION_LOGIN_EMAIL, $email);

        return $this->finishInteractiveLogin(
            $user,
            $app,
            $this->rememberMeFromInput($input),
            $input
        );
    }

    public function register()
    {
        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();

        if ($limiter->tooMany(AuthRateLimiter::ACTION_REGISTER_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_REGISTER_IP,
                $ip
            );
        }

        $limiter->hit(AuthRateLimiter::ACTION_REGISTER_IP, $ip);

        $validator = Validator::make(
            $input,
            [
                'client_id' => 'required|string',
                'firstName' => 'required|string|min:2|max:100',
                'lastName' => 'required|string|min:2|max:100',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'passwordConfirmation' => 'required|string',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'email' => 'Полето :attribute трябва да съдържа валиден имейл адрес.',
                'unique' => 'Вече съществува потребител с този :attribute.',
                'min' => 'Полето :attribute трябва да съдържа поне :min символа.',
                'max' => 'Полето :attribute не може да съдържа повече от :max символа.',
            ],
            [
                'client_id' => 'идентификатор на приложението',
                'firstName' => 'име',
                'lastName' => 'фамилия',
                'email' => 'имейл',
                'password' => 'парола',
                'passwordConfirmation' => 'потвърждение на паролата',
            ]
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        if ($input['password'] !== $input['passwordConfirmation']) {
            return $this->json([
                'success' => false,
                'message' => 'Паролите не съвпадат.',
            ], 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $firstName = trim($input['firstName']);
        $lastName = trim($input['lastName']);

        try {
            $deviceInfo = (new DeviceAuthService())->deviceFromInput($input);
        } catch (InvalidArgumentException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        $user = User::create([
            'name' => $firstName . ' ' . $lastName,
            'first_name' => $firstName,
            'last_name' => $lastName,

            'email' => strtolower(trim($input['email'])),
            'password_hash' => $input['password'],
            'role' => 'user',
            'is_active' => true,
        ]);

        return $this->json(
            $this->completeAuthenticatedLogin($user, $app, true, $deviceInfo, true) + [
                'message' => 'Профилът беше създаден успешно.',
            ],
            201
        );
    }

    public function me()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден или изтекъл access token.',
            ], 401);
        }

        return $this->json([
            'success' => true,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function logout()
    {
        $accessToken = $this->resolveAccessToken();

        if ($accessToken) {
            $userId = (int) $accessToken->user_id;
            $tokenHash = (string) $accessToken->token;
            $accessToken->delete();
            $this->revokeRealtimeSession($userId, $tokenHash);
        }

        return $this->json([
            'success' => true,
            'message' => 'Излязохте успешно.',
        ]);
    }

    public function refresh()
    {
        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();

        if ($limiter->tooMany(AuthRateLimiter::ACTION_REFRESH_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_REFRESH_IP,
                $ip
            );
        }

        $validator = Validator::make($input, [
            'client_id' => 'required|string',
            'refresh_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);

        if (!$app) {
            $limiter->hit(AuthRateLimiter::ACTION_REFRESH_IP, $ip);

            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $current = OauthAccessToken::findByRefreshToken($input['refresh_token']);

        if (
            !$current ||
            $current->isRefreshExpired() ||
            (int) $current->app_id !== (int) $app->id ||
            !$current->user ||
            !$current->user->is_active
        ) {
            $limiter->hit(AuthRateLimiter::ACTION_REFRESH_IP, $ip);

            return $this->json([
                'success' => false,
                'message' => 'Невалиден или изтекъл refresh token.',
            ], 401);
        }

        $userId = (int) $current->user_id;
        $tokenHash = (string) $current->token;
        $user = $current->user;
        $rememberMe = (bool) $current->remember_me;
        $refreshExpiresAt = $current->refresh_expires_at
            ? $current->refresh_expires_at->format('Y-m-d H:i:s')
            : null;
        $current->delete();
        $this->revokeRealtimeSession($userId, $tokenHash, 'rotated');

        return $this->json($this->authPayload($user, $app, $rememberMe, $refreshExpiresAt));
    }

    public function google()
    {
        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();

        if ($limiter->tooMany(AuthRateLimiter::ACTION_GOOGLE_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_GOOGLE_IP,
                $ip
            );
        }

        $limiter->hit(AuthRateLimiter::ACTION_GOOGLE_IP, $ip);

        $validator = Validator::make(
            $input,
            [
                'client_id' => 'required|string',
                'id_token' => 'required|string',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
            ],
            [
                'client_id' => 'client_id',
                'id_token' => 'Google ID token',
            ]
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $oauthApp = OauthApp::query()
            ->where('client_id', $input['client_id'])
            ->where('is_active', true)
            ->first();

        if (
            !$oauthApp ||
            ($oauthApp->options['client_type'] ?? null) !== 'public'
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно приложение.',
            ], 401);
        }

        $googleClientId = (string) (
            $_ENV['GOOGLE_WEB_CLIENT_ID'] ?? ''
        );

        if ($googleClientId === '') {
            return $this->json([
                'success' => false,
                'message' => 'Google authentication не е конфигурирана.',
            ], 500);
        }

        try {
            $google = new GoogleClient([
                'client_id' => $googleClientId,
            ]);

            $payload = $google->verifyIdToken(
                $input['id_token']
            );

            if (!$payload) {
                return $this->json([
                    'success' => false,
                    'message' => 'Невалиден Google ID token.',
                ], 401);
            }

            if (
                empty($payload['email']) ||
                empty($payload['sub'])
            ) {
                return $this->json([
                    'success' => false,
                    'message' => 'Google профилът няма необходимите данни.',
                ], 422);
            }

            if (
                isset($payload['email_verified']) &&
                !$payload['email_verified']
            ) {
                return $this->json([
                    'success' => false,
                    'message' => 'Google email адресът не е потвърден.',
                ], 401);
            }

            $email = strtolower(
                trim($payload['email'])
            );

            $socialAccount = UserSocialAccount::query()
                ->where('provider', 'google')
                ->where(
                    'provider_user_id',
                    (string) $payload['sub']
                )
                ->with('user')
                ->first();

            if ($socialAccount) {
                $user = $socialAccount->user;
            } else {
                $user = User::query()
                    ->where('email', $email)
                    ->first();

                if (!$user) {
                    $firstName = trim(
                        (string) ($payload['given_name'] ?? '')
                    );

                    $lastName = trim(
                        (string) ($payload['family_name'] ?? '')
                    );

                    $name = trim(
                        (string) ($payload['name'] ?? '')
                    );

                    if ($name === '') {
                        $name = trim(
                            $firstName . ' ' . $lastName
                        );
                    }

                    if ($name === '') {
                        $name = $email;
                    }

                    $user = User::create([
                        'email' => $email,
                        'name' => $name,
                        'first_name' => $firstName !== ''
                            ? $firstName
                            : null,
                        'last_name' => $lastName !== ''
                            ? $lastName
                            : null,
                        'role' => User::ROLE_USER,
                        'is_active' => true,
                        'email_verified' => true,
                    ]);
                }

                UserSocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => 'google',
                    'provider_user_id' => (string) $payload['sub'],
                    'email' => $email,
                ]);
            }

            if (!$user->is_active) {
                return $this->json([
                    'success' => false,
                    'message' => 'Потребителският профил е деактивиран.',
                ], 403);
            }

            return $this->finishInteractiveLogin(
                $user,
                $oauthApp,
                $this->rememberMeFromInput($input),
                $input
            );
        } catch (\Throwable $exception) {
            error_log(
                'Google authentication error: '
                . get_class($exception)
                . ': '
                . $exception->getMessage()
                . PHP_EOL
                . $exception->getTraceAsString()
            );

            return $this->json([
                'success' => false,
                'message' => 'Google входът не можа да бъде завършен.',
            ], 500);
        }
    }

    public function facebook()
    {
        try {
            return $this->facebookRequest();
        } catch (QueryException) {
            error_log('[FacebookAuth] login database failure');
            return $this->facebookError('facebook_internal_error', 'Facebook входът временно не може да бъде завършен.', 500);
        }
    }

    private function facebookRequest()
    {
        if (!FacebookAuthFeature::isEnabled()) {
            return $this->facebookError('facebook_auth_disabled', 'Facebook входът все още не е активиран за тази среда.', 503);
        }

        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        if ($limiter->tooMany(AuthRateLimiter::ACTION_FACEBOOK_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts($limiter, AuthRateLimiter::ACTION_FACEBOOK_IP, $ip);
        }
        $limiter->hit(AuthRateLimiter::ACTION_FACEBOOK_IP, $ip);

        $validator = Validator::make($input, [
            'client_id' => 'required|string|max:255',
            'access_token' => 'required|string|max:4096',
        ]);
        if ($validator->fails()) {
            return $this->facebookError('facebook_invalid_request', $validator->errors()->first(), 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);
        if (!$app) {
            return $this->facebookError('facebook_invalid_client', 'Невалидно приложение.', 401);
        }
        if (!FacebookAuthFeature::allowsClientId((string) $app->client_id)) {
            return $this->facebookError('facebook_client_not_allowed', 'Facebook входът не е разрешен за това приложение.', 403);
        }

        try {
            $profile = (new FacebookTokenVerifier())->verify($input['access_token']);
        } catch (FacebookTokenException $exception) {
            return $this->facebookError('facebook_invalid_token', $exception->getMessage(), 401);
        } catch (FacebookServiceException) {
            return $this->facebookError('facebook_service_unavailable', 'Facebook услугата временно не е достъпна.', 503);
        }

        $social = UserSocialAccount::query()
            ->where('provider', 'facebook')
            ->where('provider_user_id', $profile['id'])
            ->first();

        if ($social) {
            $user = User::withTrashed()->find((int) $social->user_id);
            if (!$user || $user->trashed()) {
                return $this->facebookError('facebook_account_recovery_required', 'Този Facebook профил е свързан с изтрит акаунт.', 409);
            }
            if (!$user->is_active) {
                return $this->facebookError('facebook_account_inactive', 'Профилът е деактивиран.', 403);
            }

            return $this->finishInteractiveLogin($user, $app, $this->rememberMeFromInput($input), $input);
        }

        if ($profile['email'] === null) {
            return $this->facebookError(
                'facebook_email_required',
                'Facebook не предостави имейл. Регистрирайте се с имейл и свържете Facebook от Сигурност.',
                422
            );
        }

        $existingUser = User::withTrashed()->where('email', $profile['email'])->first();
        if ($existingUser) {
            return $this->facebookError(
                $existingUser->trashed() ? 'facebook_account_recovery_required' : 'facebook_link_required',
                $existingUser->trashed()
                    ? 'Съществува изтрит акаунт с този имейл.'
                    : 'Влезте по досегашния начин и свържете Facebook от Профил → Сигурност.',
                409
            );
        }

        try {
            $user = Capsule::connection()->transaction(function () use ($profile): User {
                $name = $profile['name'] !== ''
                    ? $profile['name']
                    : trim($profile['first_name'] . ' ' . $profile['last_name']);
                $user = User::create([
                    'email' => $profile['email'],
                    'name' => $name !== '' ? $name : $profile['email'],
                    'first_name' => $profile['first_name'] !== '' ? $profile['first_name'] : null,
                    'last_name' => $profile['last_name'] !== '' ? $profile['last_name'] : null,
                    'role' => User::ROLE_USER,
                    'is_active' => true,
                    'email_verified' => false,
                ]);
                UserSocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => 'facebook',
                    'provider_user_id' => $profile['id'],
                    'email' => $profile['email'],
                ]);
                return $user;
            });
        } catch (QueryException $exception) {
            if (!$this->isDuplicateKey($exception)) {
                error_log('[FacebookAuth] account creation database failure');
                return $this->facebookError('facebook_internal_error', 'Facebook входът временно не може да бъде завършен.', 500);
            }
            $social = UserSocialAccount::query()
                ->where('provider', 'facebook')
                ->where('provider_user_id', $profile['id'])
                ->first();
            $user = $social ? User::withTrashed()->find((int) $social->user_id) : null;
            if (!$user) {
                return $this->facebookError('facebook_identity_conflict', 'Facebook профилът или имейлът вече се използва.', 409);
            }
            if ($user->trashed()) {
                return $this->facebookError('facebook_account_recovery_required', 'Facebook профилът е свързан с изтрит акаунт.', 409);
            }
            if (!$user->is_active) {
                return $this->facebookError('facebook_account_inactive', 'Профилът е деактивиран.', 403);
            }
        }

        return $this->finishInteractiveLogin($user, $app, $this->rememberMeFromInput($input), $input);
    }

    public function facebookStatus()
    {
        try {
            return $this->facebookStatusRequest();
        } catch (QueryException) {
            error_log('[FacebookAuth] status database failure');
            return $this->facebookError('facebook_internal_error', 'Статусът на Facebook временно не е достъпен.', 500);
        }
    }

    private function facebookStatusRequest()
    {
        $user = $this->authenticatedUser();
        $session = $this->resolveAccessToken();
        $clientId = trim((string) ($session?->application?->client_id ?? ''));

        return $this->json([
            'success' => true,
            'linked' => $user !== null && UserSocialAccount::query()
                ->where('user_id', (int) $user->id)
                ->where('provider', 'facebook')
                ->exists(),
            'enabled' => FacebookAuthFeature::allowsClientId($clientId),
        ]);
    }

    public function linkFacebook()
    {
        try {
            return $this->linkFacebookRequest();
        } catch (QueryException) {
            error_log('[FacebookAuth] linking database failure');
            return $this->facebookError('facebook_internal_error', 'Facebook профилът временно не може да бъде свързан.', 500);
        }
    }

    private function linkFacebookRequest()
    {
        if (!FacebookAuthFeature::isEnabled()) {
            return $this->facebookError('facebook_auth_disabled', 'Facebook входът все още не е активиран за тази среда.', 503);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->facebookError('facebook_unauthenticated', 'Сесията е изтекла.', 401);
        }
        $session = $this->resolveAccessToken();
        $clientId = trim((string) ($session?->application?->client_id ?? ''));
        if (!FacebookAuthFeature::allowsClientId($clientId)) {
            return $this->facebookError('facebook_client_not_allowed', 'Facebook свързването не е разрешено за това приложение.', 403);
        }

        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        $userKey = (string) $user->id;
        foreach ([
            [AuthRateLimiter::ACTION_FACEBOOK_LINK_IP, $ip],
            [AuthRateLimiter::ACTION_FACEBOOK_LINK_USER, $userKey],
        ] as [$action, $identifier]) {
            if ($limiter->tooMany($action, $identifier)) {
                return $this->jsonTooManyAuthAttempts($limiter, $action, $identifier);
            }
        }
        $limiter->hit(AuthRateLimiter::ACTION_FACEBOOK_LINK_IP, $ip);
        $limiter->hit(AuthRateLimiter::ACTION_FACEBOOK_LINK_USER, $userKey);

        $validator = Validator::make($input, [
            'access_token' => 'required|string|max:4096',
            'current_password' => 'required|string|max:1024',
        ]);
        if ($validator->fails()) {
            return $this->facebookError('facebook_reauthentication_required', $validator->errors()->first(), 422);
        }

        $passwordHash = (string) ($user->getAttributes()['password_hash'] ?? '');
        if ($passwordHash === '') {
            return $this->facebookError('facebook_password_required', 'Задайте парола, преди да свържете Facebook.', 409);
        }
        if (!password_verify($input['current_password'], $passwordHash)) {
            return $this->facebookError('facebook_reauthentication_failed', 'Текущата парола е неправилна.', 401);
        }

        try {
            $profile = (new FacebookTokenVerifier())->verify($input['access_token']);
        } catch (FacebookTokenException $exception) {
            return $this->facebookError('facebook_invalid_token', $exception->getMessage(), 401);
        } catch (FacebookServiceException) {
            return $this->facebookError('facebook_service_unavailable', 'Facebook услугата временно не е достъпна.', 503);
        }

        $identity = UserSocialAccount::query()
            ->where('provider', 'facebook')
            ->where('provider_user_id', $profile['id'])
            ->first();
        if ($identity) {
            if ((int) $identity->user_id === (int) $user->id) {
                return $this->json(['success' => true, 'linked' => true]);
            }
            return $this->facebookError('facebook_identity_conflict', 'Този Facebook профил вече е свързан другаде.', 409);
        }

        if (UserSocialAccount::query()->where('provider', 'facebook')->where('user_id', (int) $user->id)->exists()) {
            return $this->facebookError('facebook_identity_conflict', 'Към профила вече е свързан друг Facebook акаунт.', 409);
        }

        try {
            UserSocialAccount::create([
                'user_id' => $user->id,
                'provider' => 'facebook',
                'provider_user_id' => $profile['id'],
                'email' => $profile['email'],
            ]);
        } catch (QueryException $exception) {
            if (!$this->isDuplicateKey($exception)) {
                error_log('[FacebookAuth] identity linking database failure user_id=' . (int) $user->id);
                return $this->facebookError('facebook_internal_error', 'Facebook профилът временно не може да бъде свързан.', 500);
            }
            $identity = UserSocialAccount::query()
                ->where('provider', 'facebook')
                ->where('provider_user_id', $profile['id'])
                ->first();
            if (!$identity || (int) $identity->user_id !== (int) $user->id) {
                return $this->facebookError('facebook_identity_conflict', 'Facebook профилът беше свързан другаде.', 409);
            }
        }

        return $this->json(['success' => true, 'linked' => true]);
    }

    public function forgotPassword()
    {
        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $resets = new PasswordResetService();

        $limited = $this->firstTooManyPasswordForgot($limiter, $ip, $email);

        if ($limited !== null) {
            return $this->jsonTooManyAuthAttempts($limiter, $limited['action'], $limited['identifier']);
        }

        $validator = Validator::make($input, [
            'client_id' => 'required|string',
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_FORGOT_IP, $ip);
        $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_FORGOT_EMAIL, $email);
        $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_FORGOT_COOLDOWN, $email);

        $user = User::where('email', $email)->first();

        if ($user && $user->is_active) {
            app_log('[PasswordReset] forgot matched user_id=' . (int) $user->id . ' email=' . $email);
            $resets->issueAndSend($user);
        } else {
            app_log(
                '[PasswordReset] forgot skipped email=' . $email
                . ' found=' . ($user ? 'yes' : 'no')
                . ' active=' . ($user && $user->is_active ? 'yes' : 'no')
            );
        }

        return $this->json([
            'success' => true,
            'message' => $resets->genericRequestMessage(),
        ]);
    }

    public function resetPassword()
    {
        $input = $this->jsonInput();
        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $resets = new PasswordResetService();

        if (
            $limiter->tooMany(AuthRateLimiter::ACTION_PASSWORD_RESET_IP, $ip)
            || $limiter->tooMany(AuthRateLimiter::ACTION_PASSWORD_RESET_EMAIL, $email)
        ) {
            $action = $limiter->tooMany(AuthRateLimiter::ACTION_PASSWORD_RESET_IP, $ip)
                ? AuthRateLimiter::ACTION_PASSWORD_RESET_IP
                : AuthRateLimiter::ACTION_PASSWORD_RESET_EMAIL;
            $identifier = $action === AuthRateLimiter::ACTION_PASSWORD_RESET_IP ? $ip : $email;

            return $this->jsonTooManyAuthAttempts($limiter, $action, $identifier);
        }

        $validator = Validator::make(
            $input,
            [
                'client_id' => 'required|string',
                'email' => 'required|email',
                'code' => 'required|string',
                'password' => 'required|string|min:6',
                'passwordConfirmation' => 'required|string',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'email' => 'Полето :attribute трябва да съдържа валиден имейл адрес.',
                'min' => 'Полето :attribute трябва да съдържа поне :min символа.',
            ],
            [
                'client_id' => 'идентификатор на приложението',
                'email' => 'имейл',
                'code' => 'код',
                'password' => 'парола',
                'passwordConfirmation' => 'потвърждение на паролата',
            ]
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        if ($input['password'] !== $input['passwordConfirmation']) {
            return $this->json([
                'success' => false,
                'message' => 'Паролите не съвпадат.',
            ], 422);
        }

        $app = $this->resolvePublicApplication($input['client_id']);

        if (!$app) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидно или неактивно мобилно приложение.',
            ], 401);
        }

        $user = User::where('email', $email)->first();

        if (!$user || !$user->is_active) {
            $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_RESET_IP, $ip);
            $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_RESET_EMAIL, $email);

            return $this->json([
                'success' => false,
                'message' => $resets->genericInvalidCodeMessage(),
            ], 401);
        }

        $result = $resets->reset($user, (string) $input['code'], (string) $input['password']);

        if (!$result['ok']) {
            if ($result['status'] === 401 || $result['status'] === 400) {
                $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_RESET_IP, $ip);
                $limiter->hit(AuthRateLimiter::ACTION_PASSWORD_RESET_EMAIL, $email);
            }

            return $this->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        $limiter->clear(AuthRateLimiter::ACTION_PASSWORD_RESET_EMAIL, $email);

        return $this->json([
            'success' => true,
            'message' => $result['message'],
        ]);
    }

    /**
     * @return array{action: string, identifier: string}|null
     */
    private function firstTooManyPasswordForgot(AuthRateLimiter $limiter, string $ip, string $email): ?array
    {
        $checks = [
            [AuthRateLimiter::ACTION_PASSWORD_FORGOT_IP, $ip],
            [AuthRateLimiter::ACTION_PASSWORD_FORGOT_EMAIL, $email],
            [AuthRateLimiter::ACTION_PASSWORD_FORGOT_COOLDOWN, $email],
        ];

        foreach ($checks as [$action, $identifier]) {
            if ($limiter->tooMany($action, $identifier)) {
                return ['action' => $action, 'identifier' => $identifier];
            }
        }

        return null;
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

    public function totpAuthJson(User $user, OauthApp $app, bool $rememberMe, array $input = [])
    {
        return $this->json(
            $this->completeAuthenticatedLogin(
                $user,
                $app,
                $rememberMe,
                $this->deviceInfoFromInput($input),
                true,
                false
            )
        );
    }

    public function emailAuthJson(User $user, OauthApp $app, bool $rememberMe, array $input = [])
    {
        return $this->json(
            $this->completeAuthenticatedLogin(
                $user,
                $app,
                $rememberMe,
                $this->deviceInfoFromInput($input),
                true,
                true
            )
        );
    }

    public function issueAuthenticatedSession(
        User $user,
        OauthApp $app,
        bool $rememberMe,
        ?array $deviceInfo,
        bool $skipTotp
    ) {
        return $this->json(
            $this->completeAuthenticatedLogin(
                $user,
                $app,
                $rememberMe,
                $deviceInfo,
                $skipTotp,
                $skipTotp
            )
        );
    }

    private function finishInteractiveLogin(
        User $user,
        OauthApp $app,
        bool $rememberMe,
        array $input
    ) {
        $devices = new DeviceAuthService();

        try {
            $deviceInfo = $devices->deviceFromInput($input);
        } catch (InvalidArgumentException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($devices->needsNewDeviceChallenge($user, $deviceInfo['uuid'])) {
            return $this->json($devices->createPending($user, $app, $rememberMe, $deviceInfo));
        }

        return $this->json(
            $this->completeAuthenticatedLogin($user, $app, $rememberMe, $deviceInfo, false, false)
        );
    }

    public function completeAuthenticatedLogin(
        User $user,
        OauthApp $app,
        bool $rememberMe,
        ?array $deviceInfo,
        bool $skipTotp,
        bool $skipEmail = false
    ): array {
        if (!$skipTotp) {
            $totp = new TotpService();

            if ($totp->isRequired($user)) {
                return $totp->createPendingAuth($user, $app, $rememberMe);
            }
        }

        if (!$skipEmail) {
            $emailLogin = new EmailLoginService();

            if ($emailLogin->isRequired($user)) {
                return $emailLogin->createPendingAuth($user, $app, $rememberMe);
            }
        }

        $devicePayload = [];

        if ($deviceInfo) {
            $devicePayload = (new DeviceAuthService())->trustDevice($user, $deviceInfo);
        }

        return $this->authPayload($user, $app, $rememberMe) + $devicePayload;
    }

    private function deviceInfoFromInput(array $input): ?array
    {
        try {
            return (new DeviceAuthService())->deviceFromInput($input);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    private function rememberMeFromInput(array $input): bool
    {
        return filter_var($input['remember_me'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    private function authPayload(
        User $user,
        OauthApp $app,
        bool $rememberMe = true,
        ?string $refreshExpiresAt = null
    ): array {
        if ($rememberMe) {
            $accessTtl = self::ACCESS_TTL_SECONDS;
            $refreshAt = date('Y-m-d H:i:s', time() + self::REFRESH_TTL_SECONDS);
        } else {
            $refreshAt = $refreshExpiresAt
                ?? date('Y-m-d H:i:s', time() + self::SESSION_TTL_SECONDS);
            $remaining = strtotime($refreshAt) - time();

            if ($remaining <= 0) {
                $remaining = 60;
            }

            $accessTtl = min(self::SESSION_TTL_SECONDS, $remaining);
        }

        $tokens = OauthAccessToken::issue(
            (int) $user->id,
            (int) $app->id,
            date('Y-m-d H:i:s', time() + $accessTtl),
            $refreshAt,
            $rememberMe
        );

        return [
            'success' => true,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => $accessTtl,
            'refresh_expires_in' => max(0, strtotime($refreshAt) - time()),
            'user' => $this->serializeUser($user),
        ];
    }

    private function revokeRealtimeSession(
        int $userId,
        string $tokenHash,
        string $reason = 'logout'
    ): void {
        try {
            (new RealtimeNotifier())->notifySessionRevoked($userId, $tokenHash, $reason);
        } catch (\Throwable $exception) {
            error_log('[MobileAuth] session revoke failed user_id=' . $userId);
        }
    }

    private function resolveAccessToken(): ?OauthAccessToken
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::findByPlainToken($matches[1]);

        if (!$accessToken || $accessToken->isExpired()) {
            return null;
        }

        return $accessToken;
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        return is_array($input) ? $input : [];
    }

    private function serializeUser(User $user): array
    {
        return $user->toMobileUserArray();
    }

    private function facebookError(string $code, string $message, int $status)
    {
        return $this->json([
            'success' => false,
            'code' => $code,
            'message' => $message,
        ], $status);
    }

    private function isDuplicateKey(QueryException $exception): bool
    {
        $previous = $exception->getPrevious();
        $errorInfo = $previous instanceof \PDOException ? ($previous->errorInfo ?? []) : [];
        $sqlState = (string) ($errorInfo[0] ?? $exception->getCode());
        $driverCode = (int) ($errorInfo[1] ?? 0);

        return $sqlState === '23000' && $driverCode === 1062;
    }
}

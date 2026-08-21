<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\OauthApp;
use App\Models\User;
use App\Models\UserSocialAccount;
use Illuminate\Support\Facades\Validator;
use Google\Client as GoogleClient;

final class MobileAuthController extends BaseController
{
    public function login()
    {
        $input = $this->jsonInput();

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

        $user = User::where('email', strtolower(trim($input['email'])))->first();

        if (!$user || !isset($user->password_hash) || !password_verify($input['password'], $user->password_hash)) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден имейл или парола.',
            ], 401);
        }

        if (!$user->is_active) {
            return $this->json([
                'success' => false,
                'message' => 'Профилът е деактивиран.',
            ], 403);
        }

        $token = $this->issueAccessToken($user, $app);

        return $this->json([
            'success' => true,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => 2592000,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function register()
    {
        $input = $this->jsonInput();

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

        $user = User::create([
            'name' => $firstName . ' ' . $lastName,
            'first_name' => $firstName,
            'last_name' => $lastName,

            'email' => strtolower(trim($input['email'])),
            'password_hash' => $input['password'],
            'role' => 'user',
            'is_active' => true,
        ]);

        $token = $this->issueAccessToken($user, $app);

        return $this->json([
            'success' => true,
            'message' => 'Профилът беше създаден успешно.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => 2592000,
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function me()
    {
        $accessToken = $this->resolveAccessToken();

        if (!$accessToken) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден или изтекъл access token.',
            ], 401);
        }

        return $this->json([
            'success' => true,
            'user' => $this->serializeUser($accessToken->user),
        ]);
    }

    public function logout()
    {
        $accessToken = $this->resolveAccessToken();

        if ($accessToken) {
            $accessToken->delete();
        }

        return $this->json([
            'success' => true,
            'message' => 'Излязохте успешно.',
        ]);
    }

    public function google()
    {
        $input = $this->jsonInput();

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

            $accessToken = $this->issueAccessToken(
                $user,
                $oauthApp
            );

            return $this->json([
                'success' => true,
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => 2592000,
                'user' => $this->serializeUser($user),
            ]);
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

    private function issueAccessToken(User $user, OauthApp $app): string
    {
        return OauthAccessToken::issue(
            (int) $user->id,
            (int) $app->id,
            date('Y-m-d H:i:s', strtotime('+30 days'))
        );
    }

    private function resolveAccessToken(): ?OauthAccessToken
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

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
}

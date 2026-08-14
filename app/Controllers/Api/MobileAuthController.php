<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\OauthApp;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

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
        $plainToken = bin2hex(random_bytes(40));

        OauthAccessToken::create([
            'token' => $plainToken,
            'user_id' => $user->id,
            'app_id' => $app->id,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+30 days')),
        ]);

        return $plainToken;
    }

    private function resolveAccessToken(): ?OauthAccessToken
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::where('token', $matches[1])->first();

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
        return [
            'id' => $user->id,
            'name' => $user->name,

            'firstName' => $user->first_name,
            'lastName' => $user->last_name,

            'email' => $user->email,
            'role' => $user->role,

            'gender' => $user->gender,
            'phone' => $user->phone,
            'country' => $user->country,
            'city' => $user->city,
            'address' => $user->address,

            'avatar' => $user->avatar_url ?? null,
            'is_active' => (bool) $user->is_active,
        ];
    }
}

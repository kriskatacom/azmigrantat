<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Services\PushTokenService;
use Illuminate\Support\Facades\Validator;

final class PushTokenController extends BaseController
{
    private PushTokenService $pushTokenService;

    public function __construct()
    {
        $this->pushTokenService = new PushTokenService();
    }

    public function store()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'token' => 'required|string|max:255',
                'platform' => 'required|in:android,ios',
                'device_id' => 'nullable|string|max:255',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
                'max' => 'Полето :attribute не може да съдържа повече от :max символа.',
                'in' => 'Полето :attribute съдържа невалидна стойност.',
            ],
            [
                'token' => 'push token',
                'platform' => 'платформа',
                'device_id' => 'идентификатор на устройството',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $pushToken = $this->pushTokenService->register(
            $user,
            trim($input['token']),
            $input['platform'],
            isset($input['device_id'])
                ? trim($input['device_id'])
                : null
        );

        return $this->json([
            'success' => true,
            'message' => 'Push token-ът беше регистриран успешно.',
            'data' => [
                'id' => (int) $pushToken->id,
                'platform' => $pushToken->platform,
                'device_id' => $pushToken->device_id,
                'last_used_at' =>
                    $pushToken->last_used_at?->toISOString(),
            ],
        ], 201);
    }

    public function destroy()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'token' => 'required|string|max:255',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
                'max' => 'Полето :attribute не може да съдържа повече от :max символа.',
            ],
            [
                'token' => 'push token',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $this->pushTokenService->unregister(
            $user,
            trim($input['token'])
        );

        return $this->json([
            'success' => true,
            'message' => 'Push token-ът беше премахнат.',
        ]);
    }

    private function authenticatedUser(): ?User
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::query()
            ->where('token', $matches[1])
            ->with('user')
            ->first();

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }

    private function jsonInput(): array
    {
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        return is_array($input) ? $input : [];
    }

    private function validationError($validator)
    {
        return $this->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors()->toArray(),
        ], 422);
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }
}
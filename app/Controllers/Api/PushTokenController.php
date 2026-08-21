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
                'provider' => 'sometimes|in:expo,fcm',
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
                'provider' => 'доставчик',
                'device_id' => 'идентификатор на устройството',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $provider = $input['provider'] ?? 'expo';
        if ($provider === 'fcm' && $input['platform'] !== 'android') {
            return $this->json([
                'success' => false,
                'message' => 'FCM регистрацията е разрешена само за Android.',
            ], 422);
        }

        try {
            $pushToken = $this->pushTokenService->register(
                $user,
                trim($input['token']),
                $input['platform'],
                isset($input['device_id']) ? trim($input['device_id']) : null,
                $provider
            );
        } catch (\Throwable $exception) {
            error_log('[PushToken] registration_failed user_id=' . (int) $user->id);
            return $this->json(['success' => false, 'message' => 'Push token-ът не можа да бъде регистриран.'], 500);
        }

        return $this->json([
            'success' => true,
            'token' => [
                'platform' => $pushToken->platform,
                'provider' => $pushToken->provider,
                'device_id' => $pushToken->device_id,
                'is_active' => (bool) $pushToken->is_active,
                'last_seen_at' => $pushToken->last_seen_at?->toISOString(),
            ],
        ], 200);
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
                'provider' => 'sometimes|in:expo,fcm',
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
            trim($input['token']),
            $input['provider'] ?? 'expo'
        );

        return $this->json([
            'success' => true,
            'message' => 'Push token-ът беше премахнат.',
        ]);
    }

    public function destroyAll()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $this->pushTokenService->unregisterAll($user);
        return $this->json(['success' => true]);
    }

    private function authenticatedUser(): ?User
    {
        return OauthAccessToken::userFromRequest();
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

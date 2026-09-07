<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthApp;
use App\Models\User;
use App\Services\TotpService;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

final class TotpController extends BaseController
{
    private TotpService $totp;

    public function __construct()
    {
        $this->totp = new TotpService();
    }

    public function status()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        return $this->json([
            'success' => true,
            ...$this->totp->status($user),
        ]);
    }

    public function start()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        try {
            $setup = $this->totp->startSetup($user);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->json([
            'success' => true,
            'message' => 'Добавете ключа в Google Authenticator, после въведете 6-цифрения код.',
            ...$setup,
        ]);
    }

    public function confirm()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => 'Въведете 6-цифрения код от Google Authenticator.',
            ], 422);
        }

        try {
            $this->totp->confirmSetup($user, (string) $input['code']);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->json([
            'success' => true,
            'enabled' => true,
            'message' => 'Google Authenticator е включен. При следващ вход ще искаме кода.',
        ]);
    }

    public function disable()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => 'Въведете текущия код от Google Authenticator.',
            ], 422);
        }

        try {
            $this->totp->disable($user, (string) $input['code']);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->json([
            'success' => true,
            'enabled' => false,
            'message' => 'Google Authenticator е изключен.',
        ]);
    }

    public function completeLogin()
    {
        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'pending_token' => 'required|string',
            'code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => 'Въведете кода от Google Authenticator.',
            ], 422);
        }

        $pending = $this->totp->findPending((string) $input['pending_token']);

        if (!$pending) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново и въведете нов код.',
            ], 401);
        }

        $user = User::query()->find($pending->user_id);
        $app = OauthApp::query()->find($pending->oauth_app_id);

        if (!$user || !$app) {
            $pending->delete();

            return $this->json([
                'success' => false,
                'message' => 'Проверката не е валидна.',
            ], 401);
        }

        if (!$this->totp->verifyLoginCode($user, (string) $input['code'])) {
            return $this->json([
                'success' => false,
                'message' => 'Кодът е невалиден. Опитайте с текущия код от приложението.',
            ], 403);
        }

        $rememberMe = (bool) $pending->remember_me;
        $pending->delete();

        $auth = new MobileAuthController();

        return $auth->totpAuthJson($user, $app, $rememberMe, $input);
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

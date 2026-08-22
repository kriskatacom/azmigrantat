<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthApp;
use App\Models\User;
use App\Services\EmailLoginService;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use RuntimeException;

final class EmailLoginController extends BaseController
{
    private EmailLoginService $emails;

    public function __construct()
    {
        $this->emails = new EmailLoginService();
    }

    public function setEnabled()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $enabled = filter_var($input['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $this->emails->setEnabled($user, $enabled);
        $user->refresh();

        return $this->json([
            'success' => true,
            'email_login_enabled' => $user->emailLoginEnabled(),
            'message' => $enabled
                ? 'При вход ще се иска код по имейл.'
                : 'При вход няма да се иска код по имейл.',
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
                'message' => 'Въведете кода от имейла.',
            ], 422);
        }

        $pending = $this->emails->findPending((string) $input['pending_token']);

        if (!$pending) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
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

        try {
            $this->emails->verify($pending, (string) $input['code']);
        } catch (InvalidArgumentException | RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        }

        $rememberMe = (bool) $pending->remember_me;
        $pending->delete();

        $auth = new MobileAuthController();

        return $auth->emailAuthJson($user, $app, $rememberMe, $input);
    }

    public function resend()
    {
        $input = $this->jsonInput();
        $pending = $this->emails->findPending((string) ($input['pending_token'] ?? ''));

        if (!$pending) {
            return $this->json([
                'success' => false,
                'message' => 'Проверката изтече. Влезте отново.',
            ], 401);
        }

        $user = User::query()->find($pending->user_id);

        if (!$user) {
            $pending->delete();

            return $this->json([
                'success' => false,
                'message' => 'Проверката не е валидна.',
            ], 401);
        }

        $this->emails->resend($pending, $user);

        return $this->json([
            'success' => true,
            'expires_in' => EmailLoginService::PENDING_TTL_SECONDS,
            'message' => 'Изпратихме нов код на имейла ви.',
        ]);
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

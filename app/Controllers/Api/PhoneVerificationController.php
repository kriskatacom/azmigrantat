<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\User;
use App\Services\PhoneVerificationService;

final class PhoneVerificationController extends BaseController
{
    private PhoneVerificationService $verification;

    public function __construct()
    {
        $this->verification = PhoneVerificationService::make();
    }

    public function send()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $channel = strtolower(trim((string) ($input['channel'] ?? 'whatsapp')));
        if (!in_array($channel, ['whatsapp', 'sms'], true)) {
            $channel = 'whatsapp';
        }

        $result = $this->verification->send(
            $user,
            (string) ($input['phone'] ?? $user->phone ?? ''),
            $channel
        );

        return $this->json([
            'success' => $result['ok'],
            'message' => $result['message'],
            'channel' => $result['channel'] ?? null,
            'retry_after' => $result['retry_after'] ?? null,
        ], $result['status']);
    }

    public function verify()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $result = $this->verification->verify(
            $user,
            (string) ($input['phone'] ?? $user->phone ?? ''),
            (string) ($input['code'] ?? '')
        );

        if (!$result['ok']) {
            return $this->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        $user->refresh();

        return $this->json([
            'success' => true,
            'message' => $result['message'],
            'user' => $this->serializeUser($user),
        ]);
    }

    private function serializeUser(User $user): array
    {
        return $user->toMobileUserArray();
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }
}

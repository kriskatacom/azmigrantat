<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Core\Auth;
use App\Services\PhoneVerificationService;

class TwoFAuthController extends BaseController
{
    private PhoneVerificationService $verification;

    public function __construct()
    {
        $this->verification = PhoneVerificationService::make();
    }

    public function send2faCode()
    {
        $user = Auth::user();
        $input = json_decode(file_get_contents('php://input'), true);
        $phone = is_array($input) ? (string) ($input['phone'] ?? $user->phone ?? '') : (string) ($user->phone ?? '');

        $result = $this->verification->send($user, $phone, 'whatsapp');

        if ($result['ok']) {
            $_SESSION['2fa_phone'] = $this->verification->normalizePhone($phone);
        }

        $payload = ['message' => $result['message']];
        if (!$result['ok']) {
            $payload = ['error' => $result['message']];
        }

        return $this->json($payload, $result['status']);
    }

    public function verify2faCode()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $code = is_array($input) ? (string) ($input['code'] ?? '') : '';
        $user = Auth::user();
        $phone = (string) ($_SESSION['2fa_phone'] ?? $user->phone ?? '');

        $result = $this->verification->verify($user, $phone, $code);

        if ($result['ok']) {
            $_SESSION['2fa_verified'] = true;
            unset($_SESSION['2fa_phone']);
            return $this->json(['message' => $result['message']]);
        }

        return $this->json(['error' => $result['message']], $result['status']);
    }
}

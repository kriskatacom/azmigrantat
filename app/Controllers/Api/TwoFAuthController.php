<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Core\Auth;
use App\Services\TwilioService;

class TwoFAuthController extends BaseController
{
    private $twilio;
    private $testMode;

    public function __construct()
    {
        $this->twilio = new TwilioService(
            $_ENV['TWILIO_SID'],
            $_ENV['TWILIO_AUTH_TOKEN'],
            $_ENV['TWILIO_VERIFY_SID']
        );
        
        $this->testMode = filter_var($_ENV['TWILIO_TEST_MODE'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function send2faCode()
    {
        $user = Auth::user();

        if (empty($user->phone)) {
            return $this->json(['error' => 'Няма въведен телефонен номер.'], 400);
        }

        if ($user->two_factor_locked_until && strtotime($user->two_factor_locked_until) > time()) {
            return $this->json(['error' => 'Акаунтът е временно заключен.'], 429);
        }

        $cooldown = 60;
        $lastSent = $_SESSION['last_2fa_sent_at'] ?? 0;

        if ((time() - $lastSent) < $cooldown) {
            $remaining = $cooldown - (time() - $lastSent);
            return $this->json(['error' => "Моля, изчакайте {$remaining} секунди."], 429);
        }

        // --- ЛОГИКА ЗА ТЕСТОВ РЕЖИМ ---
        if ($this->testMode) {
            $_SESSION['2fa_test_code'] = '123456'; // Твърдо зададен код за тестове
            $_SESSION['last_2fa_sent_at'] = time();
            return $this->json(['message' => 'Тестов режим: Кодът е 123456.']);
        }
        // ------------------------------

        $result = $this->twilio->sendCode($user->phone);

        if (!$result['success']) {
            return $this->json(['error' => 'Грешка при изпращане на SMS.'], 500);
        }

        $user->two_factor_attempts = 0;
        $user->two_factor_locked_until = null;
        $user->save();

        $_SESSION['last_2fa_sent_at'] = time();

        return $this->json(['message' => 'Кодът е изпратен.']);
    }

    public function verify2faCode()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['code'] ?? null;
        $user = Auth::user();

        if ($user->two_factor_locked_until && strtotime($user->two_factor_locked_until) > time()) {
            return $this->json(['error' => 'Акаунтът е временно заключен.'], 429);
        }

        // --- ЛОГИКА ЗА ТЕСТОВ РЕЖИМ ---
        if ($this->testMode) {
            $isValid = ($code === ($_SESSION['2fa_test_code'] ?? ''));
        } else {
            $result = $this->twilio->verifyCode($user->phone, $code);
            $isValid = $result['success'];
        }
        // ------------------------------

        if ($isValid) {
            $user->two_factor_attempts = 0;
            $user->two_factor_locked_until = null;
            $user->save();

            $_SESSION['2fa_verified'] = true;
            unset($_SESSION['2fa_test_code']);
            return $this->json(['message' => 'Успешна верификация.']);
        }

        $user->two_factor_attempts += 1;

        if ($user->two_factor_attempts >= 5) {
            $user->two_factor_locked_until = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $user->save();
            return $this->json(['error' => 'Твърде много грешни опити.'], 429);
        }

        $user->save();

        return $this->json(['error' => 'Грешен код.'], 401);
    }
}

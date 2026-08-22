<?php

namespace App\Controllers;

use App\Models\AppSetting;
use App\Services\PhoneVerificationService;

class AdminSettingsController extends BaseController
{
    public function edit()
    {
        $testMode = PhoneVerificationService::make()->isTestMode();

        $this->renderWithLayout('admin/settings/index', [
            'title' => 'Системни настройки',
        ], [
            'phoneVerifyTestMode' => $testMode,
        ]);
    }

    #[HandleExceptions]
    public function update()
    {
        $mode = (string) ($_POST['phone_sms_mode'] ?? 'live');
        $testMode = $mode === 'test';

        AppSetting::setValue(
            AppSetting::PHONE_VERIFY_TEST_MODE,
            $testMode ? '1' : '0'
        );

        $this->flash(
            'success',
            $testMode
                ? 'Включен е тестов режим: код 123456 важи за всички профили, SMS и WhatsApp не се изпращат.'
                : 'Включени са реални SMS и WhatsApp съобщения.'
        );

        return $this->redirect('/admin/settings');
    }
}

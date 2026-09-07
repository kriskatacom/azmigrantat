<?php

namespace App\Controllers;

use App\Models\AppSetting;
use App\Services\EnvConfig;
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
            'envSource' => EnvConfig::source(),
        ]);
    }

    #[HandleExceptions]
    public function update()
    {
        $mode = (string) ($_POST['phone_sms_mode'] ?? 'live');
        $testMode = $mode === 'test';
        $envSource = (string) ($_POST['env_source'] ?? EnvConfig::SOURCE_DEVELOPMENT);
        $envSource = $envSource === EnvConfig::SOURCE_PRODUCTION
            ? EnvConfig::SOURCE_PRODUCTION
            : EnvConfig::SOURCE_DEVELOPMENT;

        AppSetting::setValue(
            AppSetting::PHONE_VERIFY_TEST_MODE,
            $testMode ? '1' : '0'
        );

        AppSetting::setValue(AppSetting::ENV_SOURCE, $envSource);

        $this->flash(
            'success',
            $envSource === EnvConfig::SOURCE_PRODUCTION
                ? 'Включени са production стойностите от променливите на средата.'
                : 'Включени са тестовите / демо стойности от променливите на средата.'
        );

        return $this->redirect('/admin/settings');
    }
}

<?php

use App\Core\View;
use App\Modules\Form;
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit('Запази настройките'); ?>
</div>

<div class="mb-8">
    <h1 class="text-2xl font-bold text-slate-900">Системни настройки</h1>
    <p class="text-sm font-medium text-slate-500 mt-1">
        Контрол върху изпращането на кодове за потвърждение на телефон.
    </p>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="/admin/settings" method="POST" data-main-form>
    <?php Form::section('Потвърждение по телефон', function () use ($phoneVerifyTestMode) { ?>
        <p class="text-sm text-slate-600 mb-4">
            В тестов режим не се пращат реални SMS или WhatsApp. Кодът
            <span class="font-mono font-semibold">123456</span> важи за всички профили.
            Избери реални съобщения, след като SMSAPI акаунтът има баланс и фирмата е настроена.
        </p>

        <div class="space-y-3">
            <label class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-primary">
                <input type="radio" name="phone_sms_mode" value="test" class="mt-1"
                    <?= $phoneVerifyTestMode ? 'checked' : '' ?>>
                <span>
                    <span class="block font-semibold text-slate-800">Тестов код 123456</span>
                    <span class="block text-sm text-slate-500">Без реални SMS и WhatsApp. Подходящо докато няма зареден баланс.</span>
                </span>
            </label>

            <label class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-primary">
                <input type="radio" name="phone_sms_mode" value="live" class="mt-1"
                    <?= !$phoneVerifyTestMode ? 'checked' : '' ?>>
                <span>
                    <span class="block font-semibold text-slate-800">Реални SMS и WhatsApp</span>
                    <span class="block text-sm text-slate-500">Изпраща се уникален 6-цифрен код към номера на потребителя.</span>
                </span>
            </label>
        </div>
    <?php }, 'fa-mobile-screen-button'); ?>
</form>

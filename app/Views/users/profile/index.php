<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $user->exists; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= "/users/profile/update"; ?>" method="POST"
    class="grid grid-cols-1 2xl:grid-cols-3 gap-6" enctype="multipart/form-data">

    <div class="lg:col-span-2 space-y-6">
        <?php Form::section('Лична информация', function () use ($user) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::input('Цяло име', 'name', $user->name ?? '', 'text', ['required' => true, 'placeholder' => 'Име и фамилия']);
                Form::select('Пол', 'options[gender]', [
                    'male' => 'Мъж',
                    'female' => 'Жена',
                    'other' => 'Друго'
                ], $user->options['gender'] ?? 'male'); ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('Имейл адрес', 'email', $user->email ?? '', 'email', ['required' => true, 'placeholder' => 'email@example.com']); ?>
                <?php Form::input('Телефонен номер', 'phone', $user->phone ?? '', 'text', ['placeholder' => '+359888123456']); ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::input('Нова парола', 'password', '', 'password', [
                    'help' => 'Оставете празно, ако не искате промяна',
                    'placeholder' => '••••••••'
                ]);

                Form::input('Потвърди паролата', 'password_confirmation', '', 'password', [
                    'placeholder' => '••••••••'
                ]);
                ?>
            </div>

            <?php Form::textarea('Биография', 'options[bio]', $user->options['bio'] ?? '', ['placeholder' => 'Разкажете нещо за потребителя...', 'rows' => 4]); ?>
        <?php }, 'fa-user'); ?>
    </div>

    <div class="lg:col-span-1 space-y-6">
        <?php Form::section('Изображение', function () use ($user) { ?>
            <div class="space-y-4">
                <?php Form::image('Профилна снимка', 'options[profile_image]', $user->options['profile_image'] ?? null); ?>
            </div>
        <?php }, 'fa-camera-retro'); ?>

    </div>
</form>

<?php \App\Core\Session::clearOld(); ?>

<div id="two-factor-container" class="mt-6">
    <?php Form::section('Двуфакторна автентикация', function () use ($user) { ?>
        <div id="2fa-status-message" class="text-sm text-slate-600 mb-4">
            <?= ($user->isTwoFactorVerified()) ? '✅ Двуфакторната автентикация е активирана.' : '⚠️ Трябва да верифицирате номера си.' ?>
        </div>

        <div id="2fa-verification-area" class="hidden space-y-4 pt-4 border-t border-slate-100">
            <input type="text" id="2fa-code" placeholder="Въведете кода" class="w-full px-4 py-2 border rounded-lg">
            <button type="button" id="btn-verify-2fa"
                class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Потвърди кода</button>
        </div>

        <button type="button" id="btn-send-2fa"
            class="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 disabled:bg-slate-400">
            Изпрати код за верификация
        </button>
    <?php }, 'fa-shield-alt'); ?>
</div>

<script>
(function() {
    const btnSend = document.getElementById('btn-send-2fa');
    const btnVerify = document.getElementById('btn-verify-2fa');
    const area = document.getElementById('2fa-verification-area');
    const inputCode = document.getElementById('2fa-code');

    btnSend.addEventListener('click', async () => {
        const phoneInput = document.querySelector('input[name="phone"]');
        const phone = phoneInput ? phoneInput.value : '';

        if (!phone) {
            alert('Моля, въведете телефонен номер.');
            return;
        }

        btnSend.disabled = true;
        btnSend.textContent = 'Изпращане...';

        try {
            const response = await fetch('/api/2fa/send', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                
                // 1. Показваме зоната за верификация
                area.classList.remove('hidden');
                
                // 2. Скриваме бутона "Изпрати код", защото вече сме го пратили
                btnSend.style.display = 'none';
                
            } else {
                alert(result.error);
                btnSend.disabled = false;
                btnSend.textContent = 'Изпрати код за верификация';
            }
        } catch (e) {
            alert('Грешка при връзката със сървъра.');
            btnSend.disabled = false;
            btnSend.textContent = 'Изпрати код за верификация';
        }
    });

    btnVerify.addEventListener('click', async () => {
        const code = inputCode.value;
        const response = await fetch('/api/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        
        const result = await response.json();
        if (response.ok) {
            alert('Успешно верифициран!');
            location.reload();
        } else {
            alert(result.error);
        }
    });
})();
</script>
<?php

use App\Core\View;
use App\Modules\Form;

$isEdit = $application->exists; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/oauth-apps" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на приложение" : "Регистриране на ново приложение" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на настройките за '{$application->name}'" : "Добавяне на нов сайт към SSO системата." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= $isEdit ? "/admin/oauth-apps/update/{$application->id}" : "/admin/oauth-apps/store" ?>" method="POST" data-main-form>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            <?php Form::section('Обща информация', function () use ($application) { ?>
                <?php Form::input('Име на сайта / приложението', 'name', $application->name ?? '', 'text', [
                    'placeholder' => 'напр. My Online Store',
                    'required' => true
                ]); ?>

                <?php Form::input('Redirect URI (Callback URL)', 'redirect_uri', $application->redirect_uri ?? '', 'url', [
                    'placeholder' => 'https://client-site.com/auth/callback',
                    'help' => 'След успешно логване, потребителят ще бъде изпратен само на този адрес.'
                ]); ?>
            <?php }, 'fa-info-circle'); ?>

            <?php Form::section('Сигурност (Credentials)', function () use ($application) { ?>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="font-semibold text-slate-700 flex justify-between">
                            Client ID
                            <button type="button" onclick="generateToken('client_id', 16)" class="text-xs text-primary hover:underline">Генерирай нов</button>
                        </label>
                        <input type="text" id="client_id" name="client_id" value="<?= htmlspecialchars($application->client_id) ?>"
                            class="w-full p-3 rounded-lg border border-slate-200 font-mono bg-slate-50" readonly required>
                    </div>

                    <div class="space-y-2">
                        <label class="font-semibold text-slate-700 flex justify-between">
                            Client Secret
                            <button type="button" onclick="generateToken('client_secret', 32)" class="text-xs text-primary hover:underline">Генерирай нов</button>
                        </label>
                        <div class="relative">
                            <input type="text" id="client_secret" name="client_secret" value="<?= htmlspecialchars($application->client_secret) ?>"
                                class="w-full p-3 rounded-lg border border-slate-200 font-mono bg-slate-50" readonly required>
                            <p class="text-xs text-red-400 mt-1">Внимавайте: Клиентският секрет трябва да се пази в тайна!</p>
                        </div>
                    </div>
                </div>
            <?php }, 'fa-shield-halved'); ?>
        </div>

        <div class="space-y-6">
            <?php Form::section('Допълнителни опции', function () use ($application, $isEdit) { ?>
                <div class="space-y-4">
                    <?php Form::toggle('Записвай логове за влизане', 'options[log_auth]', (bool)($application->options['log_auth'] ?? false), [
                        'help' => 'Логване на активност'
                    ]); ?>

                    <?php Form::toggle('Активно приложение', 'is_active', (bool)($application->is_active ?? false), [
                        'help' => 'Активиране или деактивиране на приложението'
                    ]); ?>

                    <div class="space-y-2">
                        <label for="client_type" class="block font-semibold text-slate-700">
                            Тип на клиента
                        </label>

                        <select
                            id="client_type"
                            name="options[client_type]"
                            class="w-full p-3 rounded-lg border border-slate-200 bg-white"
                            required
                        >
                            <option
                                value="confidential"
                                <?= ($application->options['client_type'] ?? 'confidential') === 'confidential'
                                    ? 'selected'
                                    : '' ?>
                            >
                                Confidential
                            </option>

                            <option
                                value="public"
                                <?= ($application->options['client_type'] ?? '') === 'public'
                                    ? 'selected'
                                    : '' ?>
                            >
                                Public
                            </option>
                        </select>

                        <p class="text-xs text-slate-400">
                            Confidential се използва за сървърни приложения, които пазят Client Secret.
                            Public се използва за мобилни и desktop приложения.
                        </p>
                    </div>

                    <hr class="border-slate-100">

                    <div class="text-xs text-slate-400 space-y-2">
                        <div class="flex justify-between">
                            <span>Дата на създаване:</span>
                            <span class="text-slate-600 font-medium"><?= $application->created_at ? $application->created_at->format('d.m.Y H:i') : 'Сега' ?></span>
                        </div>
                        <?php if ($isEdit): ?>
                            <div class="flex justify-between">
                                <span>Последна промяна:</span>
                                <span class="text-slate-600 font-medium"><?= $application->updated_at ? $application->updated_at->format('d.m.Y H:i') : '-' ?></span>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php }, 'fa-gear'); ?>
        </div>
    </div>
</form>

<script>
    function generateToken(elementId, length) {
        if (confirm('Генерирането на нов ключ ще изисква обновяване на настройките в приложението-клиент. Продължаване?')) {
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let retVal = "";
            for (let i = 0, n = charset.length; i < length; ++i) {
                retVal += charset.charAt(Math.floor(Math.random() * n));
            }
            document.getElementById(elementId).value = retVal;
        }
    }

    <?php if (!$isEdit): ?>
        document.addEventListener('DOMContentLoaded', function() {
            const charsetId = "abcdefghijklmnopqrstuvwxyz0123456789";
            const charsetSecret = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

            let id = "app_";
            for (let i = 0; i < 12; i++) id += charsetId.charAt(Math.floor(Math.random() * charsetId.length));
            document.getElementById('client_id').value = id;

            let secret = "";
            for (let i = 0; i < 32; i++) secret += charsetSecret.charAt(Math.floor(Math.random() * charsetSecret.length));
            document.getElementById('client_secret').value = secret;
        });
    <?php endif; ?>
</script>
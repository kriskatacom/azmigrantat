<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $user->exists; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-5 max-md:pt-5 max-md:px-5 space-y-2">
    <h1 class="text-xl md:text-2xl md:font-bold text-slate-900">
        <?= $isEdit ? "Редактиране на потребител" : "Нов потребител" ?>
    </h1>
    <a href="/admin/users" class="text-slate-500 hover:text-primary flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Назад към списъка
    </a>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form
    action="<?= $isEdit ? "/admin/users/update/{$user->id}" : "/admin/users/store" . '?id_from_admin=1'; ?>"
    method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6" enctype="multipart/form-data">

    <div class="lg:col-span-2 space-y-6">
        <?php Form::section('Лична информация', function () use ($user) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::input('Цяло име', 'name', $user->name ?? '', 'text', ['required' => true, 'placeholder' => 'Име и фамилия']);
                Form::input('Имейл адрес', 'email', $user->email ?? '', 'email', ['required' => true, 'placeholder' => 'email@example.com']);
                ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::select('Пол', 'options[gender]', [
                    'male' => 'Мъж',
                    'female' => 'Жена',
                    'other' => 'Друго'
                ], $user->options['gender'] ?? 'male');

                Form::input('Username', 'username', $user->username ?? '', 'text', ['placeholder' => 'ivan_92']);
                ?>
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

        <?php Form::section('Системни настройки', function () use ($user) { ?>

            <div class="space-y-4">
                <?php
                Form::select('Роля в системата', 'role', [
                    'user' => 'Потребител',
                    'editor' => 'Редактор',
                    'admin' => 'Администратор'
                ], $user->role ?? 'user');
                ?>

                <div class="pt-2 border-t border-slate-100">
                    <?php Form::toggle('Активен профил', 'is_active', (bool) ($user->is_active ?? true)); ?>
                </div>
            </div>

            <?php if (isset($user->created_at)): ?>
                <div class="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    <p><i class="fa-solid fa-clock mr-1"></i> Създаден на:
                        <?= date('d.m.Y H:i', strtotime($user->created_at)) ?>
                    </p>
                </div>
            <?php endif; ?>

        <?php }, 'fa-sliders'); ?>

    </div>
</form>

<?php \App\Core\Session::clearOld(); ?>

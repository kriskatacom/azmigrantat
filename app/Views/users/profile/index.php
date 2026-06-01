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

<form data-main-form
    action="<?= $isEdit ? "/admin/users/update/{$user->id}" : "/admin/users/store" . '?id_from_admin=1'; ?>"
    method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6" enctype="multipart/form-data">

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

            <?php Form::input('Имейл адрес', 'email', $user->email ?? '', 'email', ['required' => true, 'placeholder' => 'email@example.com']); ?>

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

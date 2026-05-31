<?php

use App\Core\Session;
use App\Core\View;
?>

<div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <div class="bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">

        <div class="h-32 bg-linear-to-t from-slate-900 to-slate-800"></div>

        <div class="px-8 pb-8">
            <div class="relative -top-12 flex items-end justify-between">
                <div class="flex items-center gap-6">
                    <div class="h-32 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center overflow-hidden">
                        <i class="fa-solid fa-user text-5xl text-slate-400"></i>
                    </div>
                    <div class="mb-4">
                        <h1 class="text-2xl font-black text-slate-900 dark:text-white"><?= htmlspecialchars($user->name) ?></h1>
                        <p class="text-slate-500 font-medium">@<?= htmlspecialchars($user->username) ?></p>
                        <span class="inline-flex mt-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 uppercase">
                            <?= htmlspecialchars($user->role) ?>
                        </span>
                    </div>
                </div>
            </div>

            <?php View::component('flash-messages', 'components'); ?>

            <form action="/users/profile/update" method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <input type="hidden" name="csrf_token" value="<?= Session::csrfToken() ?>">
                <?php View::component('spam-protection', 'components'); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Пълно име',
                    'name' => 'name',
                    'value' => Session::getOld('name', $user->name)
                ]); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Потребителско име',
                    'name' => 'username',
                    'value' => Session::getOld('username', $user->username)
                ]); ?>

                <div class="col-span-2">
                    <?php View::component('form-input', 'components', [
                        'label' => 'Биография',
                        'name' => 'options[bio]',
                        'type' => 'textarea',
                        'rows' => 5,
                        'placeholder' => 'Разкажете нещо за себе си...',
                        'value' => Session::getOld('options[bio]', $user->options['bio'] ?? '')
                    ]); ?>
                </div>

                <div class="md:col-start-2">
                    <?php View::component('submit-button', 'components', [
                        'text' => 'Запазване на промените',
                        'variant' => 'blue'
                    ]); ?>
                </div>
            </form>
        </div>
    </div>
</div>
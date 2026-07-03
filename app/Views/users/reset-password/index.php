<?php

use App\Core\Session;
use App\Core\View;
?>

<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">Нова парола</h2>
        <p class="mt-2 text-slate-600 dark:text-slate-400">
            Въведете и потвърдете вашата нова сигурна парола за достъп.
        </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div class="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">

            <?php View::component('flash-messages', 'components'); ?>

            <form action="/users/reset-password" method="POST" class="space-y-6">
                <?php View::component('spam-protection', 'components'); ?>

                <input type="hidden" name="token" value="<?= htmlspecialchars($token ?? '') ?>">

                <?php View::component('form-input', 'components', [
                    'label' => 'Нова парола',
                    'name' => 'password',
                    'type' => 'password',
                    'placeholder' => '••••••••',
                    'required' => true
                ]); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Потвърдете новата парола',
                    'name' => 'confirm_password',
                    'type' => 'password',
                    'placeholder' => '••••••••',
                    'required' => true
                ]); ?>

                <?php View::component('submit-button', 'components', [
                    'text' => 'Промени паролата',
                    'variant' => 'blue'
                ]); ?>
            </form>
            
            <div class="mt-6 flex items-center justify-center">
                <p class="text-slate-600 dark:text-slate-400">
                    Сетихте се за старата парола? <a href="/users/login" class="text-blue-600 hover:underline">Вход</a>
                </p>
            </div>
        </div>
    </div>
</div>

<?php Session::clearOld(); ?>
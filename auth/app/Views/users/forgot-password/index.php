<?php

use App\Core\Session;
use App\Core\View;
?>

<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">Забравена парола</h2>
        <p class="mt-2 text-slate-600 dark:text-slate-400">
            Въведете своя имейл адрес и ние ще ви изпратим линк за възстановяване на паролата.
        </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div class="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">

            <?php View::component('flash-messages', 'components'); ?>

            <form action="/users/forgot-password" method="POST" class="space-y-6">
                <?php View::component('spam-protection', 'components'); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Имейл адрес',
                    'name' => 'email',
                    'type' => 'email',
                    'placeholder' => 'Въведете своя имейл адрес',
                    'required' => true,
                    'value' => Session::getOld('email')
                ]); ?>

                <?php View::component('submit-button', 'components', [
                    'text' => 'Изпрати линк',
                    'variant' => 'blue'
                ]); ?>
            </form>
            
            <div class="mt-6 flex items-center justify-center">
                <p class="text-slate-600 dark:text-slate-400">
                    Спомнихте си паролата? <a href="/users/login" class="text-blue-600 hover:underline">Вход</a>
                </p>
            </div>
        </div>
    </div>
</div>

<?php Session::clearOld(); ?>
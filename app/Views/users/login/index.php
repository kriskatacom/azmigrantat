<?php

use App\Core\Session;
use App\Core\View;
?>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">Вход в системата</h2>
        <p class="mt-2 text-slate-600 dark:text-slate-400">
            Нямате профил? <a href="/users/register" class="text-blue-600 hover:underline">Регистрирайте се</a>
        </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div class="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">

            <?php View::component('flash-messages', 'components'); ?>

            <form action="/users/login<?= isset($_GET['return_to']) ? '?return_to=' . urlencode($_GET['return_to']) : '' ?>" method="POST" class="space-y-6">
                <?php View::component('spam-protection', 'components'); ?>

                <?php if (isset($_GET['return_to'])): ?>
                    <input type="hidden" name="return_to" value="<?= htmlspecialchars($_GET['return_to']) ?>">
                <?php endif; ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Имейл адрес',
                    'name' => 'email',
                    'type' => 'email',
                    'placeholder' => 'Въведете своя имейл адрес',
                    'required' => true,
                    'value' => Session::getOld('email')
                ]); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Парола',
                    'name' => 'password',
                    'type' => 'password',
                    'placeholder' => '••••••••',
                    'required' => true
                ]); ?>

                <?php View::component('submit-button', 'components', [
                    'text' => 'Влизане в профила',
                    'variant' => 'blue'
                ]); ?>
            </form>
        </div>
    </div>
</div>

<?php Session::clearOld(); ?>

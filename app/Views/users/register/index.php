<?php

use App\Core\Session;
use App\Core\View;
?>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
            <i class="fa-solid fa-user-plus text-white text-2xl"></i>
        </div>

        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Регистрация на профил
        </h2>
        <p class="mt-2 text-base text-slate-600 dark:text-slate-400">
            Вече имате акаунт?
            <a href="/users/login" class="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                Влезте тук
            </a>
        </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg lg:max-w-xl px-4 sm:px-0">
        <div class="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 transition-all">

            <?php View::component('flash-messages', 'components'); ?>

            <form action="/users/register" method="POST" id="registrationForm" class="space-y-5">

                <?php View::component('spam-protection', 'components'); ?>

                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <?php View::component('form-input', 'components', [
                            'label' => 'Пълно име',
                            'name' => 'name',
                            'required' => true,
                            'placeholder' => 'Иван Иванов',
                            'value' => Session::getOld('name')
                        ]); ?>
                    </div>

                    <div class="sm:col-span-1">
                        <?php View::component('form-input', 'components', [
                            'label' => 'Username',
                            'name' => 'username',
                            'placeholder' => 'ivan_92',
                            'value' => Session::getOld('username')
                        ]); ?>
                    </div>
                </div>

                <?php View::component('form-input', 'components', [
                    'label' => 'Имейл адрес',
                    'name' => 'email',
                    'type' => 'email',
                    'required' => true,
                    'placeholder' => 'name@company.com',
                    'value' => Session::getOld('email')
                ]); ?>

                <div class="relative">
                    <div class="space-y-5">
                        <?php View::component('form-input', 'components', [
                            'label' => 'Парола',
                            'name' => 'password',
                            'type' => 'password',
                            'id' => 'password-field',
                            'required' => true,
                            'placeholder' => '••••••••'
                        ]); ?>

                        <?php View::component('form-input', 'components', [
                            'label' => 'Потвърдете паролата',
                            'name' => 'confirm_password',
                            'type' => 'password',
                            'id' => 'confirm-password-field',
                            'required' => true,
                            'placeholder' => '••••••••'
                        ]); ?>
                    </div>

                    <div class="absolute right-0 top-0 mt-10 mr-3 flex space-x-2">
                        <button type="button" onclick="togglePassword()" class="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Покажи/Скрий парола">
                            <i id="toggle-icon" class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" onclick="generatePassword()" class="text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors" title="Генерирай силна парола">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </button>
                    </div>

                    <div id="password-strength" class="mt-1 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden hidden">
                        <div id="strength-bar" class="h-full w-0 transition-all duration-300"></div>
                    </div>
                    <p class="text-slate-500 mt-1">Използвайте поне 8 символа, цифри и букви.</p>
                </div>

                <?php View::component('form-input', 'components', [
                    'label' => 'Пол',
                    'name' => 'gender',
                    'type' => 'select',
                    'options' => ['male' => 'Мъж', 'female' => 'Жена', 'other' => 'Друго'],
                    'value' => Session::getOld('gender')
                ]); ?>

                <?php View::component('form-input', 'components', [
                    'label' => 'Биография',
                    'name' => 'bio',
                    'type' => 'textarea',
                    'rows' => 5,
                    'placeholder' => 'Разкажете нещо за себе си...',
                    'value' => Session::getOld('bio')
                ]); ?>

                <div class="pt-2">
                    <?php View::component('submit-button', 'components', [
                        'text' => 'Създаване на профил',
                        'variant' => 'blue'
                    ]); ?>
                </div>

            </form>
        </div>

        <div class="mt-6 flex justify-between px-2 text-xs text-slate-500 dark:text-slate-500">
            <span>© 2026 <?= WEBSITE_DOMAIN_NAME ?></span>
            <a href="/privacy" class="hover:underline">Политика за поверителност</a>
        </div>
    </div>
</div>

<script>
    // Константи за селекторите, за да не ги повтаряме
    const PASSWORD_INPUT = document.querySelector('input[name="password"]');
    const TOGGLE_ICON = document.getElementById('toggle-icon');
    const STRENGTH_CONTAINER = document.getElementById('password-strength');
    const STRENGTH_BAR = document.getElementById('strength-bar');

    function togglePassword() {
        const isPassword = PASSWORD_INPUT.type === 'password';
        PASSWORD_INPUT.type = isPassword ? 'text' : 'password';

        TOGGLE_ICON.classList.toggle('fa-eye', !isPassword);
        TOGGLE_ICON.classList.toggle('fa-eye-slash', isPassword);
    }

    function generatePassword(event) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let password = "";
        for (let i = 0; i < 16; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        PASSWORD_INPUT.value = password;
        PASSWORD_INPUT.type = 'text';

        TOGGLE_ICON.classList.replace('fa-eye', 'fa-eye-slash');
        updateStrengthUI(password);
        showSuccessFeedback(event.currentTarget);
    }

    function calculateStrength(password) {
        let strength = 0;
        if (password.length === 0) return 0;

        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;

        return Math.min(strength, 100);
    }

    function updateStrengthUI(password) {
        if (password.length === 0) {
            STRENGTH_CONTAINER.classList.add('hidden');
            return;
        }

        STRENGTH_CONTAINER.classList.remove('hidden');
        const strength = calculateStrength(password);

        STRENGTH_BAR.style.width = strength + '%';

        let colorClass = 'bg-red-500';
        if (strength > 40) colorClass = 'bg-orange-500';
        if (strength > 70) colorClass = 'bg-yellow-500';
        if (strength >= 90) colorClass = 'bg-green-500';

        STRENGTH_BAR.className = `h-full ${colorClass} transition-all duration-300`;
    }

    function showSuccessFeedback(btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>';
        setTimeout(() => btn.innerHTML = originalContent, 2000);
    }

    PASSWORD_INPUT.addEventListener('input', (e) => {
        updateStrengthUI(e.target.value);
    });
</script>

<?php Session::clearOld(); ?>

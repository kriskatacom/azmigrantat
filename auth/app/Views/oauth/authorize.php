<?php
use App\Helpers\SecurityHelper;
?>
<div class="flex items-center justify-center min-h-[60vh] px-4 my-5 md:my-10 antialiased">
    <div
        class="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm dark:shadow-xl p-8 transition-colors duration-200">

        <div class="text-center mb-8">
            <div
                class="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full mb-4">
                <i class="fa-solid fa-shield-halved text-2xl"></i>
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                Заявка за оторизация
            </h1>
            <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                Приложението <span
                    class="font-semibold text-slate-800 dark:text-slate-200"><?= htmlspecialchars($app->name) ?></span>
                иска достъп до вашия профил.
            </p>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 mb-8 border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                Какво ще получи приложението:
            </h3>
            <ul class="space-y-4">
                <li class="flex items-start gap-3">
                    <div
                        class="mt-1 w-5 h-5 flex items-center justify-center bg-emerald-500 text-white rounded-full text-[10px]">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Основна информация</p>
                        <p class="text-xs text-slate-500 dark:text-slate-500">Вашето име и профилна снимка</p>
                    </div>
                </li>
                <li class="flex items-start gap-3">
                    <div
                        class="mt-1 w-5 h-5 flex items-center justify-center bg-emerald-500 text-white rounded-full text-[10px]">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Имейл адрес</p>
                        <p class="text-xs text-slate-500 dark:text-slate-500">За целите на идентификация и контакт</p>
                    </div>
                </li>
            </ul>
        </div>

        <form action="/oauth/approve" method="POST">
            <?= SecurityHelper::csrfField() ?>
            <?= SecurityHelper::spamFields() ?>

            <input type="hidden" name="client_id" value="<?= htmlspecialchars($app->client_id) ?>">
            <input type="hidden" name="redirect_uri" value="<?= htmlspecialchars($redirect_uri) ?>">
            <input type="hidden" name="state" value="<?= htmlspecialchars($state) ?>">

            <div class="grid gap-3">
                <button type="submit"
                    class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all duration-200 shadow-sm">
                    Разрешавам достъп
                </button>

                <a href="<?= htmlspecialchars($redirect_uri) ?>?error=access_denied&state=<?= htmlspecialchars($state) ?>"
                    class="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                    Отказвам
                </a>
            </div>
        </form>

        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
            <p class="text-[11px] text-slate-400 dark:text-slate-500">
                Продължавайки, вие разрешавате на <span class="font-medium"><?= htmlspecialchars($app->name) ?></span>
                да обработва вашите данни според техните Условия за ползване.
            </p>
        </div>
    </div>
</div>

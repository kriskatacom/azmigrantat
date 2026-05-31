<?php

use App\Core\View; ?>

<div class="max-w-2xl mx-auto text-center">
    <div class="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-8 transform rotate-12">
        <i class="fa-solid fa-database text-4xl animate-pulse"></i>
    </div>

    <h1 class="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">
        ОПС! <span class="text-indigo-600">500</span>
    </h1>

    <p class="text-xl text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
        В момента имаме затруднение с връзката към базата данни.
        Ако настройвате сайта за първи път, натиснете бутона за инсталация.
    </p>

    <div class="flex flex-col gap-5 justify-center items-center max-w-xs mx-auto">
        <button onclick="window.location.reload()" class="w-full px-8 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-2xl transition-all duration-300 uppercase tracking-widest text-sm">
            Опитай пак
        </button>

        <form action="/install" method="POST" class="w-full">
            <?php View::component('submit-button', 'components', [
                'text' => 'Инсталирай базата данни',
                'variant' => 'blue'
            ]); ?>
        </form>

        <a href="mailto:<?= $email ?? 'support@kriskata.com' ?>"
            class="w-full px-8 py-4 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold rounded-2xl transition-all duration-300 uppercase tracking-widest text-sm text-center">
            Помощ
        </a>
    </div>
</div>
<?php

use App\Core\View;
?>

<section class="relative py-24 bg-white dark:bg-[#0f172a] transition-colors duration-500 overflow-hidden">
    <div class="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none"
        style="background-image: radial-gradient(#4f46e5 1px, transparent 1px); background-size: 40px 40px; mask-image: radial-gradient(circle at center, black, transparent 80%);">
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Enterprise Infrastructure</span>
                </div>

                <h2 class="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-[0.9]">
                    Deployment & <span class="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-blue-500">Сигурност</span>
                </h2>
            </div>
            <p class="max-w-md text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Вашият проект заслужава стабилна основа. Поемам пълната конфигурация, за да гарантирам 99.9% uptime и защита.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">

            <div class="group relative p-8 rounded-4xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10">
                <div class="absolute top-6 right-8">
                    <span class="text-4xl font-black text-slate-200/50 dark:text-white/5 transition-colors group-hover:text-indigo-500/10">01</span>
                </div>

                <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-500">
                    <i class="fa-solid fa-code text-2xl text-indigo-600 group-hover:text-white transition-colors"></i>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Custom PHP Сайтове</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                    Изработка на напълно custom PHP сайтове с уникален дизайн и функционалности, оптимизирани за всички устройства и бързо зареждане.
                </p>

                <ul class="space-y-3">
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> Собствен framework
                    </li>
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> SEO оптимизация
                    </li>
                </ul>
            </div>

            <div class="group relative p-8 rounded-4xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10">
                <div class="absolute top-6 right-8">
                    <span class="text-4xl font-black text-slate-200/50 dark:text-white/5 transition-colors group-hover:text-blue-500/10">02</span>
                </div>

                <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-500">
                    <i class="fa-solid fa-server text-2xl text-blue-600 group-hover:text-white transition-colors"></i>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-4">cPanel & Хостинг</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                    Пълна поддръжка чрез cPanel с управление на файлове, бази данни, имейли и настройка на PHP версии за оптимална работа.
                </p>

                <ul class="space-y-3">
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> Ежедневни бекъпи
                    </li>
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> Лесно управление на имейли и домейни
                    </li>
                </ul>
            </div>

            <div class="group relative p-8 rounded-4xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10">
                <div class="absolute top-6 right-8">
                    <span class="text-4xl font-black text-slate-200/50 dark:text-white/5 transition-colors group-hover:text-emerald-500/10">03</span>
                </div>

                <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-500">
                    <i class="fa-solid fa-shield-halved text-2xl text-emerald-600 group-hover:text-white transition-colors"></i>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Защита & Оптимизация</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                    Защита срещу често срещани атаки като XSS, SQL Injection и CSRF, оптимизация на скоростта и поддръжка на SEO, за да е сайтът бърз и безопасен.
                </p>

                <ul class="space-y-3">
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> SSL сертификати
                    </li>
                    <li class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        <i class="fa-solid fa-check text-emerald-500"></i> DDoS & brute-force защита
                    </li>
                </ul>
            </div>

        </div>

        <div class="mt-12 flex justify-center">
            <?php View::component('button', 'components', [
                'link' => '/contacts',
                'text' => 'Искам безплатна консултация',
                'icon' => 'fa-headset',
                'class' => 'px-10 py-5 text-lg'
            ]); ?>
        </div>
    </div>
</section>

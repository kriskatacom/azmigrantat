<?php

use App\Core\View;
?>

<section class="relative py-32 bg-white dark:bg-slate-950 overflow-hidden">
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.02] dark:opacity-[0.03]">
        <span class="absolute -left-10 top-20 text-[20rem] font-black">01</span>
        <span class="absolute right-0 top-1/2 text-[20rem] font-black">03</span>
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
            <div class="max-w-2xl">
                <h2 class="text-[clamp(2.5rem,6vw,4.5rem)] font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-6">
                    От идея до <br>
                    <span class="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-emerald-500 italic uppercase">Работещ бизнес</span>
                </h2>
                <p class="text-lg text-slate-600 dark:text-slate-400 font-medium">
                    Моят процес е прозрачен и структуриран. Всяка стъпка е насочена към това да превърне визията ти в дигитален актив.
                </p>
            </div>
            <div class="hidden md:block">
                <div class="px-6 py-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <span class="text-sm font-black uppercase tracking-widest text-indigo-500">4 Основни Етапа</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">

            <div class="hidden lg:block absolute top-24 left-0 w-full h-px bg-linear-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent z-0"></div>

            <div class="group relative z-10">
                <div class="mb-8 relative">
                    <div class="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/10 group-hover:bg-indigo-600 transition-all duration-500 group-hover:-translate-y-2">
                        <i class="fa-solid fa-chess text-2xl text-indigo-600 group-hover:text-white transition-colors"></i>
                    </div>
                    <span class="absolute -top-4 -right-2 text-4xl font-black text-slate-100 dark:text-white/5 group-hover:text-indigo-500/20 transition-colors">01</span>
                </div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tighter">1. Стратегия</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Започваме с дълбок анализ на Вашите нужди, конкуренция и цели. Тук чертаем плана за победа.
                </p>
            </div>

            <div class="group relative z-10 lg:mt-12">
                <div class="mb-8 relative">
                    <div class="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/10 group-hover:bg-emerald-600 transition-all duration-500 group-hover:-translate-y-2">
                        <i class="fa-solid fa-pen-nib text-2xl text-emerald-600 group-hover:text-white transition-colors"></i>
                    </div>
                    <span class="absolute -top-4 -right-2 text-4xl font-black text-slate-100 dark:text-white/5 group-hover:text-emerald-500/20 transition-colors">02</span>
                </div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tighter">2. Дизайн</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Създавам уникален визуален интерфейс (UI), фокусиран върху потребителското изживяване (UX).
                </p>
            </div>

            <div class="group relative z-10">
                <div class="mb-8 relative">
                    <div class="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/10 group-hover:bg-blue-600 transition-all duration-500 group-hover:-translate-y-2">
                        <i class="fa-solid fa-code text-2xl text-blue-600 group-hover:text-white transition-colors"></i>
                    </div>
                    <span class="absolute -top-4 -right-2 text-4xl font-black text-slate-100 dark:text-white/5 group-hover:text-blue-500/20 transition-colors">03</span>
                </div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tighter">3. Кодиране</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Претворявам дизайна в чист, бърз и сигурен код. Използвам Pure PHP за безкомпромисна мощ.
                </p>
            </div>

            <div class="group relative z-10 lg:mt-12">
                <div class="mb-8 relative">
                    <div class="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/10 group-hover:bg-amber-500 transition-all duration-500 group-hover:-translate-y-2">
                        <i class="fa-brands fa-edge text-2xl text-amber-500 group-hover:text-white transition-colors"></i>
                    </div>
                    <span class="absolute -top-4 -right-2 text-4xl font-black text-slate-100 dark:text-white/5 group-hover:text-amber-500/20 transition-colors">04</span>
                </div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tighter">4. Старт</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Тестване, оптимизация и качване онлайн. Твоят проект е готов да завладява пазара.
                </p>
            </div>

        </div>

        <div class="mt-24 p-1 rounded-[3rem] bg-linear-to-r from-indigo-500/20 via-transparent to-emerald-500/20">
            <div class="bg-white dark:bg-slate-900 rounded-[2.9rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-2xl">
                        <i class="fa-solid fa-handshake-angle"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-black dark:text-white uppercase">Готов ли си да започнем?</h4>
                        <p class="text-sm text-slate-500">Първата консултация е напълно безплатна.</p>
                    </div>
                </div>
                <?php View::component('button', 'components', [
                    'link' => '/contacts',
                    'text' => 'Изпрати запитване',
                    'icon' => 'fa-paper-plane',
                    'class' => 'px-8 py-4 shadow-lg'
                ]); ?>
            </div>
        </div>
    </div>
</section>

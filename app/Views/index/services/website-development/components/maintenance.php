<?php

use App\Core\View;
?>

<section class="relative py-28 bg-white dark:bg-[#121212] transition-colors duration-500 overflow-hidden border-t border-slate-100 dark:border-white/5">
    <div class="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none"
        style="background-image: radial-gradient(circle at 10% 10%, #f59e0b 2px, transparent 2px), radial-gradient(circle at 90% 90%, #f43f5e 2px, transparent 2px); background-size: 60px 60px; mask-image: radial-gradient(circle at center, black, transparent 70%);">
    </div>
    <div class="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/20 rounded-full blur-[120px] pointer-events-noneanimate-pulse-slow"></div>
    <div class="absolute bottom-0 right-0 w-125 h-125 bg-rose-500/10 rounded-full blur-[150px] pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-4xl mb-24 relative z-20">
            <div class="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-linear-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 mb-8 shadow-sm backdrop-blur-sm">
                <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <h3 class="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400/90">
                    Грижа, която <span class="text-amber-600 dark:text-amber-500">движи</span> бизнеса ти
                    <span class="sr-only">към успех</span>
                </h3>
            </div>

            <h2 class="text-[clamp(2.5rem,6.5vw,4.5rem)] font-black text-slate-900 dark:text-white tracking-tight leading-[0.95] uppercase mb-8 text-balance">
                Професионална <br class="hidden md:block">
                <span class="relative inline-block">
                    <span class="relative z-10 text-amber-600 dark:text-amber-500 italic">поддръжка</span>
                    <svg class="absolute -bottom-2 left-0 w-full h-3 text-amber-500/30 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
                    </svg>
                </span>
                на уебсайтове
            </h2>

            <div class="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800">
                <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl italic">
                    "Дигиталният успех изисква постоянство."
                </p>
                <p class="mt-4 text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                    Гарантирам ти
                    <span class="text-slate-900 dark:text-white border-b-2 border-emerald-500/30 pb-0.5">максимална скорост</span>,
                    денонощна
                    <span class="text-slate-900 dark:text-white border-b-2 border-blue-500/30 pb-0.5">защита</span>
                    и техническа актуалност, за да бъде сайтът ти винаги на
                    <strong class="text-amber-600 dark:text-amber-500 font-extrabold">първо място в Google</strong>.
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">

            <div x-data="{}"
                class="group relative flex flex-col p-10 rounded-[3rem] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 hover:scale-105 transition-transform duration-500 shadow-lg cursor-pointer"
                @click="$dispatch('open-popup-monitoring')">

                <div class="relative w-20 h-20 mb-12">
                    <div class="absolute inset-0 bg-amber-500/20 rounded-3xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                    <div class="absolute inset-0 bg-amber-600 dark:bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                        <i class="fa-solid fa-eye text-3xl"></i>
                    </div>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">24/7 Мониторинг</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8 flex-1">
                    Следя работата на сайта ти всяка секунда. Ако възникне проблем, аз съм там, за да го отстраня веднага.
                </p>

                <div class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/50 text-amber-700 dark:text-amber-400 transition-all duration-300 group/btn shadow-sm">
                    <span class="text-base uppercase">Примери и детайли</span>
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white group-hover/btn:rotate-90 transition-transform duration-500">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </div>
                </div>

                <template x-teleport="body">
                    <?php View::component('popup', 'partials', [
                        'id' => 'monitoring',
                        'color' => 'amber',
                        'title' => '24/7 Мониторинг',
                        'content' => 'Използвам специализирани инструменти, които ни известяват при най-малкото забавяне или проблем със сървъра.',
                        'examples' => ['Uptime Check', 'Server Load Audit', 'Speed Tracking', 'Error Logging']
                    ]); ?>
                </template>
            </div>

            <div x-data="{}"
                class="group relative flex flex-col p-10 rounded-[3rem] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 hover:scale-105 transition-transform duration-500 shadow-lg lg:mt-8 cursor-pointer"
                @click="$dispatch('open-popup-smart-security')">

                <div class="relative w-20 h-20 mb-12">
                    <div class="absolute inset-0 bg-rose-500/20 rounded-3xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                    <div class="absolute inset-0 bg-rose-600 dark:bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                        <i class="fa-solid fa-user-shield text-3xl"></i>
                    </div>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Смарт Защита</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8 flex-1">
                    Автоматични актуализации на системата, защитни стени и сканиране за вируси в реално време.
                </p>

                <div class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/50 text-rose-600 dark:text-rose-400 transition-all duration-300 group/btn shadow-sm">
                    <span class="text-base uppercase">Примери и детайли</span>
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white group-hover/btn:rotate-90 transition-transform duration-500">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </div>
                </div>

                <template x-teleport="body">
                    <?php View::component('popup', 'partials', [
                        'id' => 'smart-security',
                        'color' => 'rose',
                        'title' => 'Смарт Защита',
                        'content' => 'Твоят сайт е твоята онлайн крепост. Използваме изкуствен интелект за филтриране на зловреден трафик.',
                        'examples' => ['Firewall', 'Antivirus', 'Daily Backups', 'Brute-force Protection']
                    ]); ?>
                </template>
            </div>

            <div x-data="{}"
                class="group relative flex flex-col p-10 rounded-[3rem] bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 hover:scale-105 transition-transform duration-500 shadow-lg cursor-pointer"
                @click="$dispatch('open-popup-content')">

                <div class="relative w-20 h-20 mb-12">
                    <div class="absolute inset-0 bg-orange-500/20 rounded-3xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                    <div class="absolute inset-0 bg-orange-600 dark:bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                        <i class="fa-solid fa-file-pen text-3xl"></i>
                    </div>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Контент Ъпдейти</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8 flex-1">
                    Промени на текст, снимки или продукти. Подай ми съдържанието, а аз ще се погрижа да изглежда безупречно.
                </p>

                <div class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/50 text-orange-700 dark:text-orange-400 transition-all duration-300 group/btn shadow-sm">
                    <span class="text-base uppercase">Примери и детайли</span>
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white group-hover/btn:rotate-90 transition-transform duration-500">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </div>
                </div>

                <template x-teleport="body">
                    <?php View::component('popup', 'partials', [
                        'id' => 'content',
                        'color' => 'orange',
                        'title' => 'Контент Ъпдейти',
                        'content' => 'Поддържането на информацията актуална е ключово за SEO и доверието на клиентите.',
                        'examples' => ['Текстови корекции', 'Оптимизация на изображения', 'Качване на статии', 'Продукти']
                    ]); ?>
                </template>
            </div>

            <div x-data="{}"
                class="group relative flex flex-col p-10 rounded-[3rem] bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 hover:scale-105 transition-transform duration-500 shadow-lg lg:mt-8 cursor-pointer"
                @click="$dispatch('open-popup-consultation')">

                <div class="relative w-20 h-20 mb-12">
                    <div class="absolute inset-0 bg-indigo-500/20 rounded-3xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                    <div class="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <i class="fa-solid fa-chalkboard-user text-3xl"></i>
                    </div>
                </div>

                <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Технически съвет</h3>
                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8 flex-1">
                    Имаш идея за нова функционалност? Можеш да разчиташ на експертно мнение и техническа консултация.
                </p>

                <div class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/50 text-indigo-700 dark:text-indigo-400 transition-all duration-300 group/btn shadow-sm">
                    <span class="text-base uppercase">Примери и детайли</span>
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white group-hover/btn:rotate-90 transition-transform duration-500">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </div>
                </div>

                <template x-teleport="body">
                    <?php View::component('popup', 'partials', [
                        'id' => 'consultation',
                        'color' => 'indigo',
                        'title' => 'Технически съвет',
                        'content' => 'Не губи време в лутане. Получи конкретни отговори на въпросите си относно технологиите.',
                        'examples' => ['Архитектура', 'SEO съвети', 'Избор на плъгини', 'Сигурност']
                    ]); ?>
                </template>
            </div>

        </div>

        <div class="mt-28 relative rounded-[3rem] p-px bg-linear-to-br from-amber-500/20 via-slate-200 to-rose-500/20 dark:from-amber-900/40 dark:via-transparent dark:to-rose-900/40 shadow-2xl overflow-hidden group">
            <div class="bg-white/90 dark:bg-[#151515]/95 backdrop-blur-2xl rounded-[2.9rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div class="flex flex-col md:flex-row items-start md:items-center gap-6 p-2">
                    <div class="relative shrink-0 w-20 h-20 bg-linear-to-br from-amber-400/20 to-amber-600/10 dark:from-amber-500/10 dark:to-amber-950/50 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-[inset_0_2px_10px_rgba(251,191,36,0.1)] ring-1 ring-amber-500/20">
                        <i class="fa-solid fa-headset animate-pulse-slow"></i>
                        <span class="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full"></span>
                    </div>

                    <div class="space-y-3">
                        <h4 class="text-3xl font-black dark:text-white uppercase tracking-tighter leading-none">
                            Грижа за твоя <span class="text-amber-500">бизнес</span>
                        </h4>

                        <div class="inline-flex items-center gap-4 px-4 py-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl group hover:bg-emerald-500/10 transition-all duration-300">
                            <div class="shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-base shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-calendar-check"></i>
                            </div>
                            <p class="text-base md:text-lg font-medium text-slate-700 dark:text-slate-300">
                                Запази час за <span class="text-emerald-600 dark:text-emerald-400 font-bold underline decoration-emerald-500/30 underline-offset-4">безплатна техническа консултация</span>.
                            </p>
                        </div>
                    </div>
                </div>
                <?php View::component('button', 'components', [
                    'link' => '/contacts',
                    'text' => 'Да поговорим за твоя проект',
                    'icon' => 'fa-paper-plane',
                    'class' => 'px-10 py-5 text-lg shadow-xl shadow-amber-500/20 group-hover:translate-y-px transition-all'
                ]); ?>
            </div>
            <div class="absolute inset-0 bg-linear-to-r from-amber-500/10 via-amber-500/20 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0"></div>
        </div>
    </div>
</section>

<style>
    @keyframes pulse-slow {

        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }

        50% {
            opacity: 0.8;
            transform: scale(1.05);
        }
    }

    .animate-pulse-slow {
        animation: pulse-slow 3s infinite ease-in-out;
    }
</style>

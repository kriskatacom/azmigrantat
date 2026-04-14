<?php

use App\Core\View;
?>

<section id="website-development-hero" class="relative bg-white dark:bg-slate-950 transition-colors duration-500 overflow-hidden border-b border-slate-100 dark:border-white/5">
    <div class="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style="background-image: linear-gradient(90deg, #4f46e5 1px, transparent 1px), linear-gradient(#4f46e5 1px, transparent 1px); background-size: 50px 50px; mask-image: radial-gradient(circle at center, black, transparent 80%);">
    </div>
    <div class="absolute -top-48 -left-48 w-96 h-96 bg-indigo-500/20 rounded-full blur-[150px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>

    <div class="container mx-auto px-4 py-24 md:py-32 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            <div class="lg:col-span-7 max-w-4xl">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 shadow-sm">
                    <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Достъпен за нови проекти</span>
                </div>

                <h1 class="text-[clamp(2rem,10vw,6rem)] font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] mb-8 uppercase italic">
                    Професионална <br>
                    <span class="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-emerald-500">
                        Изработка на Сайтове
                    </span>
                </h1>

                <p class="text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium mb-12 max-w-3xl leading-relaxed">
                    Твоето присъствие в интернет е критично. Не просто "сайт", а мощен инструмент за твоя бизнес. Комбинирам <span class="text-indigo-600 dark:text-indigo-400 font-bold">интуитивен дизайн</span> с безпощадно бърз код, за да доминираш в Google.
                </p>

                <div class="flex flex-col sm:flex-row items-center gap-6">
                    <?php View::component('button', 'components', [
                        'link' => '/contacts',
                        'text' => 'Нека да започнем',
                        'icon' => 'fa-rocket',
                        'class' => 'px-10 py-5 text-lg shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-transform'
                    ]); ?>

                    <a href="/projects" class="group text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 hover:text-indigo-600 transition-colors">
                        <span class="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                            <i class="fa-solid fa-arrow-right text-sm"></i>
                        </span>
                        Вижте моите проекти
                    </a>
                </div>
            </div>

            <div class="lg:col-span-5 relative">

                <div class="absolute -top-12 -right-6 z-20 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-bounce-slow hidden md:block">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-xl">
                            <i class="fa-solid fa-bolt"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Оптимизирана скорост</p>
                            <p class="text-lg font-black dark:text-white leading-none">100/100</p>
                        </div>
                    </div>
                </div>

                <div class="relative group">
                    <div class="absolute -inset-4 bg-linear-to-tr from-indigo-500/30 to-emerald-500/30 rounded-[3.5rem] blur-2xl opacity-50 group-hover:opacity-80 transition duration-700"></div>

                    <div class="relative rounded-[3rem] p-px bg-linear-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 shadow-2xl overflow-hidden">
                        <div class="bg-white dark:bg-slate-950 rounded-[2.9rem] p-10 relative aspect-square flex flex-col justify-between">

                            <div class="relative z-10 flex flex-col gap-10 pt-4">
                                <div class="flex items-center gap-5 group/item">
                                    <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all shadow-sm">
                                        <i class="fa-solid fa-palette text-2xl"></i>
                                    </div>
                                    <div>
                                        <p class="text-base font-black dark:text-white uppercase tracking-tighter mb-1">UI/UX Дизайн</p>
                                        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Персонализиран, интуитивен и <br>пикселно съвършен дизайн.</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-5 group/item">
                                    <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all shadow-sm">
                                        <i class="fa-solid fa-server text-2xl"></i>
                                    </div>
                                    <div>
                                        <p class="text-base font-black dark:text-white uppercase tracking-tighter mb-1">Backend Логика</p>
                                        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Сигурен, бърз и мащабируем код <br>на Pure PHP & MVC.</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-5 group/item">
                                    <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                                        <i class="fa-solid fa-magnifying-glass-chart text-2xl"></i>
                                    </div>
                                    <div>
                                        <p class="text-base font-black dark:text-white uppercase tracking-tighter mb-1">SEO Оптимизация</p>
                                        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Правилна структура за по-добро <br>индексиране от Google.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div class="flex items-center justify-between mb-5">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Прогрес на проекта</span>
                                        <div class="flex items-center gap-2">
                                            <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span class="text-xs font-bold dark:text-white">Ready for Deployment</span>
                                        </div>
                                    </div>

                                    <div class="flex gap-1 items-end h-7">
                                        <div class="w-1.5 bg-indigo-500/30 h-4 rounded-full"></div>
                                        <div class="w-1.5 bg-indigo-500/50 h-6 rounded-full"></div>
                                        <div class="w-1.5 bg-indigo-500 h-7 rounded-full animate-pulse"></div>
                                        <div class="w-1.5 bg-indigo-500/40 h-5 rounded-full"></div>
                                        <div class="w-1.5 bg-indigo-500/60 h-3 rounded-full"></div>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                    <div class="flex -space-x-3">
                                        <div class="w-9 h-9 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 flex items-center justify-center text-[11px] font-black uppercase">JD</div>
                                        <div class="w-9 h-9 rounded-full border-2 border-white dark:border-slate-950 bg-indigo-500 flex items-center justify-center text-[11px] font-black text-white uppercase shadow-inner">K</div>
                                        <div class="w-9 h-9 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 flex items-center justify-center text-white text-[11px] shadow-lg shadow-emerald-500/20">
                                            <i class="fa-solid fa-check text-xs"></i>
                                        </div>
                                    </div>

                                    <div class="text-right">
                                        <p class="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Premium Quality</p>
                                        <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400">100% Hand-coded</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</section>

<style>
    @keyframes bounce-slow {

        0%,
        100% {
            transform: translateY(0);
        }

        50% {
            transform: translateY(-12px);
        }
    }

    .animate-bounce-slow {
        animation: bounce-slow 5s ease-in-out infinite;
    }

    @keyframes pulse-slow {

        0%,
        100% {
            opacity: 0.1;
        }

        50% {
            opacity: 0.2;
        }
    }

    .animate-pulse-slow {
        animation: pulse-slow 6s ease-in-out infinite;
    }
</style>

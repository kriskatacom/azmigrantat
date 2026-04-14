<?php

$other_cities = [
    'Бургас',
    'Русе',
    'Стара Загора',
    'Плевен',
    'Сливен',
    'Добрич',
    'Шумен',
    'Перник',
    'Хасково',
    'Ямбол',
    'Пазарджик',
    'Благоевград',
    'Велико Търново',
    'Враца',
    'Габрово',
    'Видин',
    'Асеновград',
    'Казанлък',
    'Кюстендил',
    'Търговище'
];
?>

<section class="relative bg-white dark:bg-slate-950 py-20 px-6 overflow-hidden transition-colors duration-300">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-500/10 dark:from-blue-900/20 via-transparent to-transparent -z-10"></div>

    <div class="max-w-7xl mx-auto">
        <div class="flex flex-col lg:flex-row items-center gap-12">

            <div class="lg:w-1/2 text-left">
                <span class="inline-block py-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
                    Наличен за проекти в цяла България
                </span>
                <h1 class="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
                    Бизнес решения за <span class="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500">всеки град</span>
                </h1>
                <p class="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-lg leading-relaxed">
                    Базиран съм в град Дупница, но работя предимно онлайн с клиенти от цялата страна. Изграждам бързи и оптимизирани сайтове, съобразени със спецификите на Вашия регион.
                </p>
                <div class="flex gap-4">
                    <a href="#all-cities" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20">
                        Виж всички градове
                    </a>
                </div>
            </div>

            <div class="lg:w-1/2 grid grid-cols-2 gap-4 w-full">

                <div class="group bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl hover:border-blue-500/50 transition-all">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">София</h3>
                    <p class="text-slate-500 text-xs uppercase tracking-wider">IT Столица</p>
                </div>

                <div class="group bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl hover:border-blue-500/50 transition-all">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Пловдив</h3>
                    <p class="text-slate-500 text-xs uppercase tracking-wider">Бизнес и Култура</p>
                </div>

                <div class="group bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl hover:border-blue-500/50 transition-all">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Варна</h3>
                    <p class="text-slate-500 text-xs uppercase tracking-wider">Морска столица</p>
                </div>

                <div class="group bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-3xl hover:border-blue-500 transition-all">
                    <h3 class="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">Дупница</h3>
                    <p class="text-blue-500/70 dark:text-blue-400/50 text-xs uppercase tracking-wider">Локален офис</p>
                </div>

                <div class="col-span-2 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl overflow-hidden relative">
                    <div class="absolute inset-y-0 left-0 w-16 bg-linear-to-r from-white dark:from-slate-950 to-transparent z-10"></div>
                    <div class="absolute inset-y-0 right-0 w-16 bg-linear-to-l from-white dark:from-slate-950 to-transparent z-10"></div>

                    <div class="flex gap-4 animate-scroll whitespace-nowrap">
                        <?php
                        $display_cities = array_merge($other_cities, $other_cities);
                        foreach ($display_cities as $city): ?>
                            <span class="text-slate-600 dark:text-slate-400 text-sm font-medium bg-white dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                <?php echo $city; ?>
                            </span>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

        </div>
    </div>
</section>

<style>
    @keyframes scroll {
        0% {
            transform: translateX(0);
        }

        100% {
            transform: translateX(-50%);
        }
    }

    .animate-scroll {
        display: flex;
        width: max-content;
        animation: scroll 40s linear infinite;
    }

    .animate-scroll:hover {
        animation-play-state: paused;
    }
</style>
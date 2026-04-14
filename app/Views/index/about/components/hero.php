<?php

use App\Core\View;
?>

<section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-500">
    <div class="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style="background-image: radial-gradient(#4f46e5 1px, transparent 1px); background-size: 30px 30px;">
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">

            <div class="lg:col-span-3 flex flex-col text-left">
                <div class="order-1">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 mb-6">
                        <span class="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Уеб Дизайнер & Програмист</span>
                    </div>

                    <h1 class="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white mb-8 leading-tight tracking-tighter">
                        Кристиан <span class="text-indigo-600">Костадинов</span>
                    </h1>
                </div>

                <div class="order-2 lg:hidden mb-12">
                    <div class="relative rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                        <img src="/assets/images/Kristian.webp" alt="Кристиан Костадинов" class="w-full h-auto object-cover">
                    </div>
                </div>

                <div class="order-3">
                    <div class="space-y-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                        <p>
                            Аз съм уеб програмист на свободна практика, фокусиран върху изграждането на
                            <span class="text-slate-900 dark:text-white font-bold italic underline decoration-indigo-500/30">
                                ефективни, иновативни и персонализирани
                            </span> уеб решения.
                        </p>

                        <p>
                            Специализирам в <span class="text-indigo-600 dark:text-indigo-400 font-semibold">изработка на уебсайтове по поръчка</span>,
                            онлайн платформи и бизнес решения, които не просто изглеждат добре, а работят бързо, сигурно и са оптимизирани за SEO.
                        </p>

                        <p>
                            Работя с модерни технологии като JavaScript, React и Tailwind CSS, за да създавам
                            бързи, адаптивни и удобни за потребителите интерфейси.
                        </p>

                        <p>
                            Вярвам, че всеки проект е като
                            <span class="text-indigo-600 dark:text-indigo-400 font-semibold">нова рецепта</span> —
                            влагам креативност и внимание към детайла, за да превърна идеите на моите клиенти
                            в работещи дигитални продукти с реална стойност.
                        </p>

                        <p>
                            Моята цел е не просто да създам сайт, а да помогна на бизнеса ти да расте онлайн
                            чрез добре обмислен дизайн, добра структура и силно присъствие в търсачките.
                        </p>
                    </div>

                    <div class="mt-10 flex flex-wrap gap-4 items-center">
                        <span class="text-xs font-bold uppercase text-slate-400 tracking-widest mr-2">Експертиза:</span>
                        <span class="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-sm font-bold text-slate-700 dark:text-slate-300">PHP</span>
                        <span class="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-sm font-bold text-slate-700 dark:text-slate-300">MySQL</span>
                        <span class="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-sm font-bold text-slate-700 dark:text-slate-300">TailwindCSS</span>
                    </div>

                    <div class="mt-12 flex flex-wrap gap-6">
                        <?php View::component('button', 'components', [
                            'link' => '/contacts',
                            'text' => 'Започнете проект',
                            'icon' => 'fa-rocket'
                        ]); ?>
                        <?php View::component('button', 'components', [
                            'link' => '#mission',
                            'text' => 'Научете повече',
                            'icon' => 'fa-arrow-down',
                            'variant' => 'outline'
                        ]); ?>
                    </div>
                </div>
            </div>

            <div class="hidden lg:block lg:col-span-2 relative">
                <div class="relative z-10 rounded-[3rem] overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl">
                    <img src="/assets/images/Kristian.webp" alt="Кристиан Костадинов" class="w-full h-auto hover:grayscale-0 transition-all duration-700 object-cover">
                </div>

                <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl"></div>

                <div class="absolute bottom-10 -left-10 z-20 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <div class="text-4xl font-black text-indigo-600 mb-1">5+</div>
                    <div class="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">Години<br>опит</div>
                </div>
            </div>

        </div>
    </div>
</section>
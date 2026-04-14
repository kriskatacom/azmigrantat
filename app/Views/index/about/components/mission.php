<?php

use App\Core\View;
?>

<section id="mission" class="py-24 bg-white dark:bg-slate-950 transition-colors duration-500 relative overflow-hidden">
    <div class="absolute top-1/2 left-0 -translate-y-1/2 w-full h-full bg-indigo-600/2 dark:bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-6xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                <div class="order-2 lg:order-1 grid grid-cols-2 gap-4 lg:gap-6">
                    <div class="space-y-4 lg:space-y-6">
                        <div class="group bg-slate-50 dark:bg-slate-900/40 p-8 rounded-4xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all duration-500 mt-12 shadow-sm">
                            <div class="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-heart text-indigo-500 text-2xl"></i>
                            </div>
                            <h3 class="font-black text-slate-900 dark:text-white text-xl mb-3">Страст</h3>
                            <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Влагам сърце във всеки детайл, за да създам продукт, който вълнува.</p>
                        </div>
                        
                        <div class="bg-indigo-600 p-8 rounded-4xl shadow-2xl shadow-indigo-500/20 text-white relative overflow-hidden group">
                            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <i class="fa-solid fa-lightbulb text-indigo-200 text-3xl mb-6 block"></i>
                            <h3 class="font-black text-xl mb-3">Иновация</h3>
                            <p class="text-sm leading-relaxed text-indigo-100/90">Не се ограничавам от шаблони. Търся най-доброто технологично решение.</p>
                        </div>
                    </div>

                    <div class="space-y-4 lg:space-y-6">
                        <div class="group bg-slate-50 dark:bg-slate-900/40 p-8 rounded-4xl border border-slate-100 dark:border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-sm">
                            <div class="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-chess-knight text-emerald-500 text-2xl"></i>
                            </div>
                            <h3 class="font-black text-slate-900 dark:text-white text-xl mb-3">Стратегия</h3>
                            <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Сайтът е инструмент за постигане на Вашите конкретни бизнес цели.</p>
                        </div>

                        <div class="group bg-slate-50 dark:bg-slate-900/40 p-8 rounded-4xl border border-slate-100 dark:border-white/5 hover:border-amber-500/30 transition-all duration-500 shadow-sm">
                            <div class="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-bolt text-amber-500 text-2xl"></i>
                            </div>
                            <h3 class="font-black text-slate-900 dark:text-white text-xl mb-3">Скорост</h3>
                            <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Оптимизацията и бързото зареждане са в основата на всеки мой проект.</p>
                        </div>
                    </div>
                </div>

                <div class="order-1 lg:order-2">
                    <div class="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                        <span class="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Зад кода и дизайна</span>
                    </div>
                    
                    <h2 class="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tighter">
                        Моята мисия е да разкажа <span class="text-indigo-600 dark:text-indigo-500">Вашата история</span>
                    </h2>

                    <div class="prose prose-lg dark:prose-invert">
                        <p class="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                            Това, което ме мотивира, е възможността да покажа какво стои зад Вашия бизнес — не просто списък с услуги, а <strong>мечти и усилия</strong>.
                        </p>
                        
                        <blockquote class="relative border-l-0 pl-0 my-10">
                            <span class="absolute -left-4 -top-6 text-6xl text-indigo-500/20 font-serif">“</span>
                            <p class="text-xl italic font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                За мен всеки проект е нова рецепта, в която съчетавам дизайнерско мислене с техническа експертиза.
                            </p>
                        </blockquote>

                        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Изграждам <span class="text-slate-900 dark:text-white font-bold italic underline decoration-indigo-500/40 decoration-2 underline-offset-4">архитектура по поръчка на PHP</span>, гарантираща сигурност и мащабируемост без излишен код.
                        </p>
                    </div>

                    <div class="mt-12 p-1 bg-linear-to-r from-indigo-500/20 to-transparent rounded-2xl inline-block">
                        <?php View::component('button', 'components', [
                            'link' => '/contacts',
                            'text' => 'Да започнем проект',
                            'icon' => 'fa-arrow-right',
                        ]); ?>
                    </div>
                </div>

            </div>
        </div>
    </div>
</section>

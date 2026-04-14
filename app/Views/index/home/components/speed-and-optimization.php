<?php
use App\Core\View;
?>

<section class="relative py-24 bg-white dark:bg-slate-900 transition-colors duration-500 overflow-hidden">
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">

            <div class="w-full lg:w-5/12 relative group">
                <div class="absolute -inset-4 bg-linear-to-tr from-indigo-500/20 to-emerald-500/20 rounded-[3.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-700"></div>
                
                <div class="relative rounded-[3rem] p-px bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shadow-2xl">
                    <div class="bg-white dark:bg-slate-900 rounded-[2.9rem] p-8 lg:p-10 overflow-hidden relative">
                        <div class="absolute top-0 right-0 p-4 opacity-5">
                             <i class="fa-solid fa-gauge-high text-8xl rotate-12"></i>
                        </div>

                        <div class="flex items-center justify-between mb-12 relative">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                    <span class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">PageSpeed Insights</span>
                                </div>
                                <h4 class="text-3xl font-black text-slate-900 dark:text-white leading-none">Performance</h4>
                            </div>
                            <div class="relative flex items-center justify-center">
                                <svg class="w-24 h-24 transform -rotate-90">
                                    <circle cx="48" cy="48" r="42" stroke="currentColor" stroke-width="6" fill="transparent" class="text-slate-100 dark:text-slate-800" />
                                    <circle cx="48" cy="48" r="42" stroke="currentColor" stroke-width="6" fill="transparent" 
                                        stroke-dasharray="264" 
                                        stroke-dashoffset="5"
                                        class="text-emerald-500 transition-all duration-1000 ease-out" />
                                </svg>
                                <span class="absolute text-2xl font-black text-emerald-500">99</span>
                            </div>
                        </div>

                        <div class="space-y-8 relative">
                            <div class="group/item">
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-500 transition-colors">First Contentful Paint</span>
                                    <span class="text-xs font-black px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">0.4s</span>
                                </div>
                                <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-emerald-500 w-[98%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>

                            <div class="group/item">
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-500 transition-colors">Largest Contentful Paint</span>
                                    <span class="text-xs font-black px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">0.8s</span>
                                </div>
                                <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-indigo-500 w-[95%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                </div>
                            </div>
                            
                            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400">Core Web Vitals: Passed</span>
                                <div class="flex -space-x-2">
                                    <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white ring-2 ring-white dark:ring-slate-900"><i class="fa-solid fa-desktop"></i></div>
                                    <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white ring-2 ring-white dark:ring-slate-900"><i class="fa-solid fa-mobile-screen"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="absolute -top-6 -left-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 animate-float">
                    <div class="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-white shadow-lg shadow-yellow-400/20">
                        <i class="fa-solid fa-bolt text-lg"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Load Time</p>
                        <p class="text-sm font-black dark:text-white leading-none">Ultra Fast</p>
                    </div>
                </div>
            </div>

            <div class="w-full lg:w-7/12">
                <div class="inline-block px-4 py-1.5 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span class="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Performance First
                    </span>
                </div>

                <h2 class="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-8">
                    Максимална <br/> 
                    <span class="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-emerald-500">Скорост</span>
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="relative group">
                        <div class="flex gap-4">
                            <div class="shrink-0 w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                <i class="fa-solid fa-magnifying-glass-chart text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">SEO Архитектура</h3>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Чист код и семантични тагове за максимална видимост в търсачките.</p>
                            </div>
                        </div>
                    </div>

                    <div class="relative group">
                        <div class="flex gap-4">
                            <div class="shrink-0 w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                <i class="fa-solid fa-file-zipper text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Смарт Компресия</h3>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Автоматично WebP конвертиране и минификация без загуба на качество.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-6">
                    <?php View::component('button', 'components', [
                        'link' => '/contacts',
                        'text' => 'Връзка с мен',
                        'icon' => 'fa-gauge-high',
                        'class' => 'shadow-xl shadow-indigo-500/20'
                    ]); ?>
                    
                    <div class="flex items-center gap-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                        <i class="fa-brands fa-google text-2xl"></i>
                        <span class="text-[10px] font-bold uppercase tracking-tighter leading-tight">Подготовка по <br/>стандартите на Google</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<style>
@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
.animate-float {
    animation: float 4s ease-in-out infinite;
}
</style>
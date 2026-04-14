<?php

use App\Core\View;
?>

<section class="py-24 bg-white dark:bg-slate-950 transition-colors duration-500 relative overflow-hidden">
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-6xl mx-auto">
            <div class="relative bg-slate-900 dark:bg-slate-900/50 rounded-[4rem] p-12 md:p-24 overflow-hidden border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-indigo-500/5">
                
                <div class="absolute -top-24 -right-24 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
                <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s;"></div>

                <div class="relative z-10 flex flex-col lg:flex-row items-center gap-16">
                    
                    <div class="flex-1 text-center lg:text-left">
                        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span class="text-xs font-bold uppercase tracking-widest text-emerald-400">Свободен за нови проекти</span>
                        </div>

                        <h2 class="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tighter">
                            Нека превърнем Вашата идея в <span class="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-emerald-400">дигитален успех.</span>
                        </h2>
                        
                        <p class="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
                            Всеки голям проект започва с един кратък разговор. Свържете се с мен днес за безплатен анализ и стратегия за Вашия бизнес.
                        </p>
                    </div>

                    <div class="flex flex-col gap-4 w-full lg:w-auto min-w-70">
                        <div class="group relative">
                            <div class="absolute -inset-1 bg-linear-to-r from-indigo-600 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <?php View::component('button', 'components', [
                                'link' => '/contacts',
                                'text' => 'Свържете се с мен',
                                'icon' => 'fa-paper-plane',
                                'class' => 'relative w-full py-6 text-xl shadow-2xl'
                            ]); ?>
                        </div>

                        <p class="text-center text-slate-500 text-sm mt-4">Или се свържете с мен по:</p>
                        <div class="flex justify-center gap-6">
                            <a href="tel:0899718824" target="_blank" class="text-slate-400 hover:text-emerald-500 transition-colors text-2xl" title="WhatsApp">
                                <i class="fa-solid fa-phone"></i>
                            </a>
                            <a href="https://wa.me/0899718824" target="_blank" class="text-slate-400 hover:text-emerald-500 transition-colors text-2xl" title="WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i>
                            </a>
                            <a href="viber://chat?number=%0899718824" class="text-slate-400 hover:text-violet-500 transition-colors text-2xl" title="Viber">
                                <i class="fa-brands fa-viber"></i>
                            </a>
                            <a href="https://www.facebook.com/profile.php?id=100086479934343" target="_blank" class="text-slate-400 hover:text-blue-500 transition-colors text-2xl" title="Messenger">
                                <i class="fa-brands fa-facebook-messenger"></i>
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</section>

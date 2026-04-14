<?php
use App\Core\View;
?>

<section id="cta-section" class="relative overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-500 py-10">
    <canvas id="ctaCanvas" class="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40"></canvas>

    <div class="container mx-auto px-4 relative z-10">
        <div class="relative rounded-[3rem] bg-slate-900 dark:bg-indigo-950/20 border border-slate-800 dark:border-indigo-500/20 p-8 md:p-16 lg:p-24 overflow-hidden shadow-2xl transition-all">

            <div class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-600/20 dark:bg-indigo-500/20 blur-[100px] rounded-full"></div>
            <div class="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-emerald-600/10 dark:bg-emerald-500/10 blur-[80px] rounded-full"></div>

            <div class="relative z-10 max-w-4xl mx-auto text-center">
                <h2 class="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter uppercase mb-8 leading-none">
                    Готови ли сте да <span class="text-indigo-400">дигитализирате</span> бизнеса си?
                </h2>

                <p class="text-indigo-100/70 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                    Нека превърнем вашата
                    <span class="relative inline-block px-1">
                        <span class="relative z-10 text-white font-bold tracking-tight italic">визия</span>
                        <span class="absolute bottom-1 left-0 w-full h-2 bg-indigo-500/40 -skew-x-12"></span>
                    </span>
                    в работещ продукт. Свържете се с мен днес за
                    <span class="text-indigo-300 font-bold border-b border-indigo-500/50 pb-0.5">безплатна консултация</span>
                    и детайлен
                    <span class="bg-linear-to-r from-indigo-300 to-emerald-400 bg-clip-text text-transparent font-black uppercase tracking-wider text-sm md:text-base">
                        анализ на проекта
                    </span>.
                </p>

                <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <?php View::component('button', 'components', [
                        'link' => '/contacts',
                        'text' => 'Започнете сега',
                        'icon' => 'fa-paper-plane'
                    ]); ?>

                    <div class="flex items-center gap-4 text-white/50 font-bold uppercase text-xs tracking-widest">
                        <span class="w-8 h-px bg-white/20"></span>
                        Или пишете на
                        <a href="mailto:<?= CONTACTS['email'] ?>" class="text-white hover:text-indigo-400 transition-colors"><?= CONTACTS['email'] ?></a>
                    </div>
                </div>
            </div>

            <div class="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-10">
                <div class="text-center">
                    <div class="text-3xl font-black text-white mb-1">100%</div>
                    <div class="text-[10px] uppercase tracking-widest text-white/40 font-bold">Удовлетвореност</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-black text-white mb-1">24/7</div>
                    <div class="text-[10px] uppercase tracking-widest text-white/40 font-bold">Поддръжка</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-black text-white mb-1">Бързина</div>
                    <div class="text-[10px] uppercase tracking-widest text-white/40 font-bold">Оптимизация</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-black text-white mb-1">Сигурност</div>
                    <div class="text-[10px] uppercase tracking-widest text-white/40 font-bold">Защита на данните</div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        const ctaSection = document.getElementById('cta-section');
        const ctaCanvas = document.getElementById('ctaCanvas');
        const cctx = ctaCanvas.getContext('2d');

        let time = 0;

        function resizeCTA() {
            ctaCanvas.width = ctaSection.offsetWidth;
            ctaCanvas.height = ctaSection.offsetHeight;
        }

        function animateCTA() {
            cctx.clearRect(0, 0, ctaCanvas.width, ctaCanvas.height);

            const centerX = ctaCanvas.width / 2;
            const centerY = ctaCanvas.height / 2;

            const isDark = document.documentElement.classList.contains('dark');
            const strokeColor = isDark ? '79, 70, 229' : '99, 102, 241';

            for (let i = 0; i < 3; i++) {
                cctx.beginPath();
                cctx.arc(centerX, centerY, 150 + (i * 50) + Math.sin(time + i) * 20, 0, Math.PI * 2);
                cctx.strokeStyle = `rgba(${strokeColor}, ${isDark ? 0.1 - (i * 0.03) : 0.15 - (i * 0.04)})`;
                cctx.lineWidth = 2;
                cctx.stroke();
            }

            time += 0.02;
            requestAnimationFrame(animateCTA);
        }

        window.addEventListener('resize', resizeCTA);
        resizeCTA();
        animateCTA();
    });
</script>

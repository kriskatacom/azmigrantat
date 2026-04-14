<?php

use App\Core\View;
?>

<section id="hero-section" class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
    <canvas id="heroCanvas" class="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-70"></canvas>

    <div class="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style="background-image: radial-gradient(#4f46e5 1px, transparent 1px); background-size: 30px 30px;">
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-4xl mx-auto text-center">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 mb-8">
                <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Свободен за нови проекти</span>
            </div>

            <h1 class="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1]">
                Професионална изработка на <span class="text-indigo-600 dark:text-indigo-400">custom уеб сайтове</span> и онлайн платформи
            </h1>

            <div class="max-w-3xl mx-auto mb-12 p-8 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-xl">
    <p class="text-xl lg:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
        Здравейте, аз съм <span class="text-indigo-600 dark:text-indigo-400 font-black">Кристиан!</span> 
        Предлагам разработка на <span class="italic underline decoration-indigo-500/30">изцяло custom</span> уеб сайтове на PHP, 
        без тежки теми или плъгини. Изграждам персонализирани платформи и 
        <span class="text-slate-900 dark:text-white font-bold">дигитални решения</span> за Вашия бизнес!
    </p>
</div>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <?php View::component('button', 'components', [
                    'link' => '/contacts',
                    'text' => 'Към контакти',
                    'class' => 'text-lg'
                ]); ?>
                <?php View::component('button', 'components', [
                    'link' => '/about',
                    'text' => 'За KRISKATA.COM',
                    'variant' => 'outline',
                    'class' => 'text-lg'
                ]); ?>
            </div>

            <?php ob_start();
            foreach (TECH_STACK as $tech): ?>
                <span class="text-3xl font-black text-slate-300 dark:text-slate-700 hover:text-indigo-500 transition-colors uppercase cursor-default px-6">
                    <?= $tech ?>
                </span>
            <?php endforeach;
            $sliderContent = ob_get_clean(); ?>

            <div class="mt-10 bg-slate-50/50 dark:bg-white/5 py-10 rounded-3xl border border-slate-100 dark:border-white/5">
                <?php View::component('ping-pong-slider', 'partials', [
                    'content' => $sliderContent,
                    'unique_id' => 'hero_tech_stack'
                ]); ?>
            </div>
        </div>
    </div>
</section>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        const heroSection = document.getElementById('hero-section');
        const heroCanvas = document.getElementById('heroCanvas');
        const hctx = heroCanvas.getContext('2d');

        let nodes = [];
        let heroMouse = {
            x: null,
            y: null
        };

        function resizeHero() {
            heroCanvas.width = heroSection.offsetWidth;
            heroCanvas.height = heroSection.offsetHeight;
            initNodes();
        }

        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroSection.getBoundingClientRect();
            heroMouse.x = e.clientX - rect.left;
            heroMouse.y = e.clientY - rect.top;
        });

        class Node {
            constructor() {
                this.x = Math.random() * heroCanvas.width;
                this.y = Math.random() * heroCanvas.height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.r = Math.random() * 2 + 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > heroCanvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > heroCanvas.height) this.vy *= -1;

                // Леко привличане към мишката в Hero секцията
                if (heroMouse.x != null) {
                    let dx = heroMouse.x - this.x;
                    let dy = heroMouse.y - this.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist < 250) {
                        this.x += dx * 0.01;
                        this.y += dy * 0.01;
                    }
                }
            }

            draw() {
                hctx.beginPath();
                hctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                hctx.fillStyle = document.documentElement.classList.contains('dark') ? '#818cf8' : '#4f46e5';
                hctx.fill();
            }
        }

        function initNodes() {
            nodes = [];
            const count = Math.floor((heroCanvas.width * heroCanvas.height) / 25000);
            for (let i = 0; i < count; i++) nodes.push(new Node());
        }

        function animateHero() {
            hctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

            nodes.forEach((n, i) => {
                n.update();
                n.draw();

                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const dist = Math.hypot(n.x - n2.x, n.y - n2.y);
                    if (dist < 200) {
                        hctx.beginPath();
                        hctx.lineWidth = 0.4;
                        const op = 1 - dist / 200;
                        hctx.strokeStyle = document.documentElement.classList.contains('dark') ?
                            `rgba(129, 140, 248, ${op * 0.3})` :
                            `rgba(79, 70, 229, ${op * 0.2})`;
                        hctx.moveTo(n.x, n.y);
                        hctx.lineTo(n2.x, n2.y);
                        hctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animateHero);
        }

        window.addEventListener('resize', resizeHero);
        resizeHero();
        animateHero();
    });
</script>
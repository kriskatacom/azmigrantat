<?php

use App\Core\View;
?>

<section id="services-section" class="relative py-24 bg-slate-50 dark:bg-[#0b1120] transition-colors duration-500 overflow-hidden">
    <canvas id="servicesCanvas" class="absolute inset-0 z-0 pointer-events-none opacity-60 dark:opacity-80"></canvas>

    <div class="absolute inset-0 z-0 opacity-[0.15] dark:opacity-[0.2]"
        style="background-image: radial-gradient(#4f46e5 0.5px, transparent 0.5px); background-size: 24px 24px;">
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="text-center mb-20">
            <span class="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.3em] text-xs mb-4 block animate-fade-in">Какво предлагам</span>
            <h2 class="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                Услуги<span class="text-indigo-600">.</span>
            </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            <div class="md:col-span-7 group relative rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden">
                <div class="relative z-10">
                    <div class="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/40 group-hover:rotate-6 transition-transform">
                        <i class="fa-solid fa-desktop text-2xl"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-900 dark:text-white mb-4 italic">Изработка на уебсайт</h3>
                    <p class="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed">
                        Създавам custom уебсайтове на PHP със собствен framework. Получавате бърз и SEO оптимизиран сайт с уникален дизайн, който работи отлично на всички устройства и включва защита от често срещани атаки като спам, XSS, SQL Injection и CSRF. Всеки проект е съобразен с нуждите на Вашия бизнес.
                    </p>
                </div>
                <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600/5 rounded-full group-hover:bg-indigo-600/10 transition-colors duration-700"></div>
            </div>

            <div class="md:col-span-5 group relative rounded-2xl bg-indigo-600 p-10 text-white overflow-hidden shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-2">
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <h3 class="text-3xl font-black leading-tight uppercase tracking-tighter">Уеб<br>Приложения</h3>
                    <div class="mt-10">
                        <p class="text-slate-500 dark:text-white text-lg max-w-xl leading-relaxed">
                            Разработвам уеб приложения на PHP със собствен framework, насочени към автоматизация и оптимизация на бизнес процеси. Създавам функционални системи като админ панели, вътрешни платформи и специализирани софтуерни решения, изцяло съобразени с Вашите нужди. Получавате бързо, стабилно и мащабируемо приложение с защита от атаки като XSS, SQL Injection и CSRF.
                        </p>
                        <i class="fa-solid fa-microchip text-5xl opacity-40 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>
                </div>
                <div class="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            <div class="md:col-span-5 group relative rounded-2xl bg-slate-900 p-10 text-white overflow-hidden border border-white/5 transition-all hover:border-emerald-500/50">
                <div class="flex flex-col h-full">
                    <div class="flex justify-between items-start mb-10">
                        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <i class="fa-solid fa-gauge-high text-xl"></i>
                        </div>
                        <span class="text-xs font-black text-emerald-500 uppercase tracking-widest">Speed & SEO</span>
                    </div>
                    <h3 class="text-2xl font-black mb-4">Оптимизация</h3>
                    <p class="text-slate-400 text-lg leading-relaxed">
                        При изработката на сайта включвам основна SEO оптимизация. Оптимизирам мета таговете (title и description). Правя правилно структурирани заглавия (H1, H2, H3). Създавам чисти и SEO-friendly URL адреси. Оптимизирам изображенията с alt текст и компресия. Подреждам вътрешните връзки и навигацията за лесно сканиране. Внедрявам структурирани данни (schema.org). Подобрявам скоростта на зареждане на сайта. Гарантирам мобилна съвместимост и responsive дизайн. Оптимизирам основните ключови думи и съдържанието за по-добро индексиране.
                    </p>
                </div>
            </div>

            <div class="md:col-span-7 group relative rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 overflow-hidden">
                <div class="flex flex-col md:flex-row items-center gap-10 h-full">
                    <div class="flex-1">
                        <h3 class="text-3xl font-black text-slate-900 dark:text-white mb-4">Поддръжка</h3>
                        <p class="text-slate-500 text-lg dark:text-slate-400 leading-relaxed">
                            Предлагам месечна поддръжка на вашия сайт, която гарантира, че всичко работи гладко и без проблеми. Следя редовно за актуализации на софтуера и framework-а, правя бекъп на сайта и базата данни, както и мониторинг за грешки и бъгове. Осигурявам защита срещу често срещани атаки като XSS, SQL Injection и CSRF. Контролирам скоростта на зареждане и оптимизирам производителността при нужда. Включена е и SEO проверка, така че сайтът да остане видим и добре индексиран.
                        </p>
                    </div>
                    <div class="shrink-0 relative">
                        <div class="w-28 h-28 rounded-3xl bg-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-500/40 rotate-6 group-hover:rotate-0 transition-transform duration-500">
                            <i class="fa-solid fa-shield-check text-4xl"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</section>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('services-section');
        const canvas = document.getElementById('servicesCanvas');
        const ctx = canvas.getContext('2d');

        let particles = [];
        let mouse = {
            x: null,
            y: null,
            radius: 180
        }; // Обхват на мишката

        function resize() {
            canvas.width = section.offsetWidth;
            canvas.height = section.offsetHeight;
            init(); // Реинициализираме при промяна на размера
        }

        // Следене на мишката само в рамките на секцията
        section.addEventListener('mousemove', (e) => {
            const rect = section.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        section.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.8; // Малко по-бързи
                this.vy = (Math.random() - 0.5) * 0.8;
                this.radius = Math.random() * 2 + 1; // По-големи точки
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                // Взаимодействие с мишката (отблъскване)
                if (mouse.x != null) {
                    let dx = this.x - mouse.x;
                    let dy = this.y - mouse.y;
                    let distance = Math.hypot(dx, dy);
                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        this.x += dx / distance * force * 3;
                        this.y += dy / distance * force * 3;
                    }
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#6366f1' : '#4f46e5';
                ctx.shadowBlur = 5; // Glow ефект
                ctx.shadowColor = ctx.fillStyle;
                ctx.fill();
                ctx.shadowBlur = 0; // Ресет на сянката за линиите
            }
        }

        function init() {
            particles = [];
            // Повече точки за по-гъста мрежа
            const count = Math.floor((canvas.width * canvas.height) / 10000);
            for (let i = 0; i < count; i++) particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.update();
                p.draw();

                // Линии към мишката
                if (mouse.x != null) {
                    let distMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                    if (distMouse < mouse.radius) {
                        ctx.beginPath();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distMouse / mouse.radius})`;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }

                // Линии между частиците
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.lineWidth = 0.6;
                        // Динамичен цвят за по-голяма видимост
                        const opacity = 1 - dist / 150;
                        ctx.strokeStyle = `rgba(79, 70, 229, ${opacity * 0.8})`;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        animate();
    });
</script>
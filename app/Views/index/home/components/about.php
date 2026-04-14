<section class="relative py-20 bg-slate-50 dark:bg-primary transition-colors duration-300 overflow-hidden">
    <canvas id="bubbleCanvas" class="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60"></canvas>

    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]"
            style="background-image: radial-gradient(#6366f1 0.5px, transparent 0.5px); background-size: 24px 24px;">
        </div>

        <div class="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-600/20 blur-[100px] rounded-full animate-blob"></div>
        <div class="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full animate-blob animation-delay-2000"></div>
    </div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            <div class="relative w-full lg:w-5/12 group">
                <div class="absolute -bottom-6 -right-6 w-full h-full border-2 border-indigo-600 dark:border-indigo-500/50 rounded-2xl z-0 transition-transform group-hover:translate-x-2 group-hover:translate-y-2"></div>

                <div class="relative z-10 overflow-hidden rounded-2xl shadow-2xl aspect-4/5 bg-slate-200 dark:bg-slate-800">
                    <img src="/assets/images/Kristian.webp" alt="Кристиян - Web Developer"
                        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">

                    <div class="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-white/20 dark:border-white/10 shadow-lg">
                        <div class="flex justify-around items-center">
                            <div class="text-center">
                                <span class="block text-2xl font-black text-primary dark:text-white">5+</span>
                                <span class="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Години опит</span>
                            </div>
                            <div class="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                            <div class="text-center">
                                <span class="block text-2xl font-black text-primary dark:text-white">50+</span>
                                <span class="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Проекта</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="w-full lg:w-7/12">
                <span class="text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-[0.2em] text-sm mb-4 block">Кой стои зад кода?</span>

                <h2 class="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                    Здравей, аз съм Кристиян – <br>
                    <span class="inline-block bg-linear-to-r from-indigo-600 via-purple-500 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent animate-gradient-x">
                        архитект на твоя дигитален проект.
                    </span>
                </h2>

                <div class="space-y-6 text-slate-600 dark:text-slate-300/80 leading-relaxed text-lg max-w-2xl">
                    <p>
                        Моята мисия е проста: да помагам на бизнесите да изпъкнат в онлайн пространството чрез <strong class="text-slate-900 dark:text-white">бързи, сигурни и визуално зашеметяващи</strong> уебсайтове.
                    </p>
                    <p>
                        Не просто пиша код – аз създавам инструменти, които работят за теб 24/7. Специализиран съм в модерните PHP/MVC архитектури и Tailwind CSS.
                    </p>
                </div>

                <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <?php

use App\Core\View;

                    $features = [
                        'Custom CMS Системи',
                        'UI/UX Дизайн',
                        'SEO Оптимизация',
                        'Поддръжка 24/7'
                    ];
                    foreach ($features as $feature):
                    ?>
                        <div class="flex items-center gap-4 group/item">
                            <div class="shrink-0 w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-all group-hover/item:bg-indigo-600 group-hover/item:scale-110">
                                <i class="fa-solid fa-check text-xs text-indigo-600 dark:text-indigo-400 group-hover/item:text-white"></i>
                            </div>
                            <span class="text-base font-bold text-slate-700 dark:text-slate-200 transition-colors group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400"><?= $feature ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="mt-12 space-y-5">
                    <?php View::component('primary-big-button', 'components', [
                        'link' => '/about',
                        'text' => 'Повече за мен',
                    ]); ?>
                </div>
            </div>

        </div>
    </div>
</section>

<script>
    const canvas = document.getElementById('bubbleCanvas');
    const ctx = canvas.getContext('2d');
    let particlesArray = [];

    // Проследяване на мишката
    let mouse = {
        x: null,
        y: null,
        radius: 150 // Радиус на влияние на курсора
    };

    window.addEventListener('mousemove', function(event) {
        mouse.x = event.x + window.scrollX;
        mouse.y = event.y + window.scrollY;
    });

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }
        // Рисуване на балончето
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        // Обновяване на позицията
        update() {
            // Проверка дали балончето излиза от екрана
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

            // Взаимодействие с мишката
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius + this.size) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 3;
                if (mouse.x > this.x && this.x > this.size * 10) this.x -= 3;
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 3;
                if (mouse.y > this.y && this.y > this.size * 10) this.y -= 3;
            }

            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.width * canvas.height) / 15000; // Гъстота
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 5) + 2;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1;
            let directionY = (Math.random() * 2) - 1;

            let color = 'rgba(99, 102, 241, 0.3)';

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
    }

    window.addEventListener('resize', function() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        init();
    });

    canvas.width = innerWidth;
    canvas.height = innerHeight;
    init();
    animate();
</script>
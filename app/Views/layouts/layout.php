<?php

use App\Core\View;
?>

<!DOCTYPE html>
<html lang="bg" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <title><?= htmlspecialchars($title ?? "Изработка на сайтове и приложения - " . WEBSITE_NAME) ?></title>
    <meta name="description" content="<?= htmlspecialchars($description ?? "Уеб дизайнер и програмист на свободна практика") ?>">
    <link rel="canonical" href="<?= FULL_DOMAIN . $_SERVER['REQUEST_URI'] ?>">

    <?= $og_tags ?? '' ?>

    <meta name="google-site-verification" content="0BTaVPxQo31IFjb4zLMDu8g3NcmvyPwR8xrvacWgOqI" />

    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="KRISKATA">

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-7GM0W515PY"></script>
    <script>
        window.dataLayer = window.dataLayer || [];

        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', 'G-7GM0W515PY');
    </script>

    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#ffffff">

    <link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png">

    <link rel="stylesheet" href="/assets/css/min/tailwind.css">
    <link rel="stylesheet" href="/assets/css/min/swiper-bundle.min.css" />
    <link rel="stylesheet" href="/assets/css/min/font-awesome.all.min.css" />
    <link rel="stylesheet" href="/assets/css/min/fancybox.min.css" />

    <script>
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>

    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log("SW регистриран!", reg.scope))
                    .catch(err => console.log("SW грешка:", err));
            });
        }
    </script>

    <script defer src="/assets/js/min/alpinejs.min.js"></script>
    <script defer src="/assets/js/min/swiper-bundle.min.js"></script>
    <script src="/assets/js/min/fancybox.umd.min.js"></script>
    <script defer src="/assets/js/main.js"></script>
</head>

<body class="antialiased flex flex-col min-h-screen">

    <?php View::loadPartial('partials/primary-navbar'); ?>

    <main id="main-content" class="grow">
        <?= $content ?>
    </main>

    <?php View::component('admin-bar', 'components', [
        'pageId' => $elements['page_id'] ?? $currentPageId ?? null
    ]); ?>

    <footer class="relative pt-20 pb-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 transition-colors duration-500">
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container mx-auto px-4 relative z-10">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">

                <div class="md:col-span-5">
                    <a href="/" class="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 block">
                        <img src="/assets/images/logo.webp" alt="Logo" class="md:h-20 w-auto dark:hidden transition-transform duration-300" :class="scrolled ? 'scale-90' : 'scale-100'">
                        <img src="/assets/images/logo-dark-mode.webp" alt="Logo Dark" class="md:h-20 w-auto hidden dark:block transition-transform duration-300" :class="scrolled ? 'scale-90' : 'scale-100'">
                    </a>
                    <p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md mb-8">
                        Създавам модерни уеб решения, които работят <span class="text-slate-900 dark:text-white font-bold">безупречно</span>,
                        зареждат <span class="text-slate-900 dark:text-white font-bold">светкавично</span> и помагат на бранда ти да изпъкне пред конкуренцията.
                    </p>
                    <div class="flex gap-4">
                        <a href="#" class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all duration-300">
                            <i class="fa-brands fa-github text-xl"></i>
                        </a>
                        <a href="#" class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all duration-300">
                            <i class="fa-brands fa-linkedin-in text-xl"></i>
                        </a>
                        <a href="#" class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all duration-300">
                            <i class="fa-brands fa-instagram text-xl"></i>
                        </a>
                    </div>
                </div>

                <div class="md:col-span-3">
                    <h4 class="text-slate-900 dark:text-white font-black uppercase tracking-widest text-lg mb-8">Навигация</h4>
                    <ul class="space-y-4">
                        <li><a href="/" class="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Начало</a></li>
                        <li><a href="/services/website-development" class="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Услуги</a></li>
                        <li><a href="/projects" class="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Портфолио</a></li>
                    </ul>
                </div>

                <div class="md:col-span-4">
                    <h4 class="text-slate-900 dark:text-white font-black uppercase tracking-widest text-lg mb-8">Имате проект?</h4>
                    <div class="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
                        <p class="text-slate-600 dark:text-slate-400 mb-6 font-medium">Винаги съм отворен за нови и интересни идеи.</p>
                        <a href="mailto:<?= CONTACTS['email'] ?>" class="group flex items-center gap-3 text-slate-900 dark:text-white font-black text-xl hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <?= CONTACTS['email'] ?>
                            <i class="fa-solid fa-arrow-right text-sm -rotate-45 group-hover:rotate-0 transition-transform"></i>
                        </a>
                    </div>
                </div>
            </div>

            <div class="pt-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div class="text-slate-500 dark:text-slate-500 text-sm font-medium">
                    © <?= date('Y') ?> gradove-i-sela.azmigrantat.com. Всички права запазени.
                </div>

                <div class="flex items-center gap-6 text-sm font-bold uppercase tracking-widest">
                    <div class="flex items-center gap-2 text-slate-400">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <?= CONTACTS['location'] ?>
                    </div>
                    <div class="text-slate-300 dark:text-slate-700">|</div>
                    <a href="/privacy" class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
                </div>
            </div>
        </div>
    </footer>

    <?php View::loadPartial('partials/lightbox'); ?>

</body>

</html>
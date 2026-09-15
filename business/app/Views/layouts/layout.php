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

        <div class="pt-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="text-slate-500 dark:text-slate-500 text-sm font-medium">
                © <?= date('Y') ?> <?= WEBSITE_NAME ?>. Всички права запазени.
            </div>
        </div>
    </footer>

    <?php View::loadPartial('partials/lightbox'); ?>

</body>

</html>
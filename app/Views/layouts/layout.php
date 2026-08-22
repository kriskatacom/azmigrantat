<?php

use App\Core\View;
?>

<!DOCTYPE html>
<html lang="bg" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <?= $og_tags ?? '' ?>

    <meta name="google-site-verification" content="0BTaVPxQo31IFjb4zLMDu8g3NcmvyPwR8xrvacWgOqI" />

    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="<?= COMPANY_NAME ?>">

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
    <script defer src="/assets/js/main.js"></script>
</head>

<body class="antialiased text-gray-900 bg-white flex flex-col min-h-screen">

    <?php View::loadPartial('partials/navbar'); ?>

    <main id="main-content" class="grow">
        <?= $content ?>
    </main>

    <?php View::loadPartial('partials/admin-bar'); ?>

    <?php View::loadPartial('partials/call-top-bar'); ?>

    <footer class="text-white bg-black py-5">
        <div class="container mx-auto text-center">
            <p>
                <?= date('Y') ?> <?= htmlspecialchars(COMPANY_LEGAL_NAME) ?>
                · ЕИК <?= htmlspecialchars(COMPANY_EIK) ?>
                · <a href="<?= htmlspecialchars(COMPANY_WEBSITE) ?>" title="<?= htmlspecialchars(COMPANY_NAME) ?>" class="hover:text-primary"><?= htmlspecialchars(preg_replace('#^https?://#', '', COMPANY_WEBSITE) ?? '') ?></a>
            </p>
        </div>
    </footer>

</body>

</html>
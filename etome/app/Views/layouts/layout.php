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

    <link rel="stylesheet" href="/assets/css/min/tailwind.css">
    <link rel="stylesheet" href="/assets/css/min/swiper-bundle.min.css" />
    <link rel="stylesheet" href="/assets/css/min/font-awesome.all.min.css" />

    <script>
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>

    <script defer src="/assets/js/min/alpinejs.min.js"></script>
    <script defer src="/assets/js/min/swiper-bundle.min.js"></script>
    <script defer src="/assets/js/main.js"></script>
</head>

<body class="antialiased text-gray-900 dark:text-white bg-slate-100 dark:bg-slate-900 flex flex-col min-h-screen">

    <?php View::loadPartial('partials/navbar'); ?>

    <main id="main-content" class="grow">
        <?= $content ?>
    </main>

    <?php View::loadPartial('partials/footer'); ?>

</body>

</html>

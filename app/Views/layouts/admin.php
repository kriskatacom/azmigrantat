<?php

use App\Core\View;
use App\Core\Auth;

if (!isset($_SESSION['sidebar_open'])) {
    $_SESSION['sidebar_open'] = true;
}
$is_open = $_SESSION['sidebar_open'];
?>

<!DOCTYPE html>
<html lang="bg" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <title><?= $title ?></title>

    <?= $og_tags ?? '' ?>

    <link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico">

    <link rel="stylesheet" href="/assets/css/min/tailwind.css">
    <link rel="stylesheet" href="/assets/css/min/font-awesome.all.min.css" />
    <link rel="stylesheet" href="/assets/css/min/dropzone.min.css" type="text/css" />

    <style>
        [x-cloak] {
            display: none !important;
        }
    </style>

    <link href="/assets/css/min/quill.snow.min.css" rel="stylesheet">
    <script src="/assets/js/min/quill.min.js"></script>
    <script src="/assets/js/min/jquery-3.6.0.min.js"></script>
    <script src="/assets/js/min/nestable.min.js"></script>
    <script src="/assets/js/min/dropzone.min.js"></script>
    <script src="/assets/js/admin-main.js"></script>
    
    <script src="/assets/js/min/alpine.min.js" defer></script>

    <style>
        .sidebar-transition {
            transition: all 300ms ease-in-out;
        }

        .sidebar-ml-open {
            margin-left: 20rem;
        }

        .sidebar-ml-closed {
            margin-left: 0;
        }

        @media (max-width: 1023px) {

            .sidebar-ml-open,
            .sidebar-ml-closed {
                margin-left: 0;
            }
        }
    </style>
</head>

<body class="antialiased text-gray-900 bg-slate-100 min-h-screen">
    <div id="admin-layout">

        <?php View::loadPartial('admin/partials/sidebar'); ?>

        <div id="main-content-wrapper"
            class="flex-1 flex flex-col min-w-0 h-screen sidebar-transition <?= $is_open ? 'lg:ml-80' : 'lg:ml-0' ?>">

            <header class="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-5">
                    <button onclick="toggleSidebar()" class="button-light-icon">
                        <i class="fa-solid fa-bars-staggered text-xl"></i>
                    </button>

                    <h1 class="text-xl font-semibold text-slate-800">
                        <?= htmlspecialchars($title) ?>
                    </h1>
                </div>

                <div class="flex items-center gap-4">
                    <div class="hidden sm:flex flex-col items-end">
                        <span class="text-lg font-black text-slate-900 leading-none">
                            <?= htmlspecialchars(Auth::user()['name'] ?? 'Администратор') ?>
                        </span>
                        <span class="text-base text-slate-400 leading-none mt-1">
                            <?= htmlspecialchars(Auth::user()['email'] ?? 'admin@school.bg') ?>
                        </span>
                    </div>

                    <div class="relative group cursor-pointer">
                        <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-100 group-hover:ring-indigo-600 transition-all duration-300 shadow-lg shadow-indigo-100">
                            <?php
                            $user = Auth::user();
                            $avatar = $user['image_url'] ?? null;
                            ?>
                            <?php if ($avatar): ?>
                                <img src="<?= $avatar ?>" alt="<?= htmlspecialchars($user['name'] ?? '') ?>" class="w-full h-full object-cover">
                            <?php else: ?>
                                <div class="w-full h-full bg-indigo-600 flex items-center justify-center text-white">
                                    <span class="text-sm font-bold">
                                        <?= strtoupper(mb_substr($user['name'] ?? 'A', 0, 1)) ?>
                                    </span>
                                </div>
                            <?php endif; ?>
                        </div>
                        <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                    </div>
                </div>
            </header>

            <main id="admin-content" class="flex-1 p-5">
                <div class="bg-slate-100">
                    <div class="flex-1 flex flex-col min-w-0">
                        <?php View::component('flash', 'admin/components'); ?>

                        <?= $content ?>
                    </div>

                    <footer class="mt-20 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 font-medium uppercase tracking-widest">
                        &copy; <?= date('Y') ?> СУ „<?= WEBSITE_DOMAIN_NAME ?>“. Система за управление.
                    </footer>
                </div>
            </main>
        </div>
    </div>

    <?php View::loadPartial('partials/lightbox'); ?>

    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('main-sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            const wrapper = document.getElementById('main-content-wrapper');

            const isOpen = sidebar.classList.contains('translate-x-0');

            if (isOpen) {
                sidebar.classList.replace('translate-x-0', '-translate-x-full');
                backdrop.classList.add('hidden');
                wrapper.classList.replace('lg:ml-80', 'lg:ml-0');
                saveSidebarState(false);
            } else {
                sidebar.classList.replace('-translate-x-full', 'translate-x-0');
                backdrop.classList.remove('hidden');
                wrapper.classList.replace('lg:ml-0', 'lg:ml-80');
                saveSidebarState(true);
            }
        }

        function saveSidebarState(state) {
            if (typeof toggleSidebarState === "function") {
                toggleSidebarState(state);
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && window.innerWidth < 1024) {
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar.classList.contains('translate-x-0')) toggleSidebar();
            }
        });
    </script>
</body>

</html>
<?php

$bottomNav = [
    ['icon' => 'fa-house', 'label' => 'НАЧАЛО', 'url' => '/', 'active' => true],
    ['icon' => 'fa-grip', 'label' => 'КАТЕГОРИИ', 'url' => '/categories', 'active' => false],
    ['icon' => 'fa-plus', 'label' => 'КАЧИ', 'url' => AUTH_PUBLIC_SERVER_URL . '/admin/videos/create', 'active' => false],
    ['icon' => 'fa-user', 'label' => 'ПРОФИЛ', 'url' => AUTH_PUBLIC_SERVER_URL . '/users/profile', 'active' => false],
];
?>

<footer>
    <div class="fixed bottom-0 left-0 right-0 z-50 w-full bg-slate-900 dark:bg-slate-950 px-3 py-2 shadow-2xl">
        <div class="mx-auto flex w-full items-start justify-around" style="max-width: 768px;">
            <?php foreach ($bottomNav as $item): ?>
                <a href="<?= $item['url'] ?>" class="group flex min-w-16 flex-col items-center transition-transform hover:-translate-y-1">
                    <span class="flex h-8 w-8 items-center justify-center">
                        <i class="fa-solid <?= $item['icon'] ?> text-lg <?= $item['active'] ? 'text-blue-400' : 'text-gray-400 group-hover:text-white' ?>"></i>
                    </span>
                    <span class="mt-1 text-[11px] font-bold uppercase tracking-wide <?= $item['active'] ? 'text-blue-400' : 'text-gray-400 group-hover:text-white' ?>">
                        <?= $item['label'] ?>
                    </span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</footer>

<div class="h-20"></div>

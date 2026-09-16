<?php

$bottomNav = [
    ['icon' => 'fa-house', 'label' => 'НАЧАЛО', 'url' => '/', 'active' => true],
    ['icon' => 'fa-grip', 'label' => 'КАТЕГОРИИ', 'url' => '/categories', 'active' => false],
    ['icon' => 'fa-plus', 'label' => 'КАЧИ', 'url' => AUTH_SERVER_URL . '/admin/posts/create', 'is_action' => true],
    ['icon' => 'fa-user', 'label' => 'ПРОФИЛ', 'url' => AUTH_SERVER_URL . '/users/profile', 'active' => false],
];
?>

<footer>
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 dark:bg-slate-950 px-4 py-4 rounded-t-[35px] shadow-2xl">
        <div class="max-w-3xl mx-auto flex justify-around items-end">
            <?php foreach ($bottomNav as $item): ?>
                <?php if (isset($item['is_action']) && $item['is_action']): ?>

                    <a href="<?= $item['url'] ?>" class="flex flex-col items-center mb-1">
                        <div class="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-[5px] border-white dark:border-slate-900 -mt-10 transition-transform hover:scale-110">
                            <i class="fa-solid <?= $item['icon'] ?> text-white text-2xl"></i>
                        </div>

                        <span class="text-[12px] font-bold mt-1 text-gray-300 uppercase tracking-wide">
                            <?= $item['label'] ?>
                        </span>
                    </a>
                <?php else: ?>

                    <a href="<?= $item['url'] ?>"
                        class="flex flex-col items-center group transition-transform hover:-translate-y-1">
                        <i class="fa-solid <?= $item['icon'] ?> text-2xl <?= $item['active'] ? 'text-blue-400' : 'text-gray-400 group-hover:text-white' ?>"></i>
                        <span
                            class="text-[12px] font-bold mt-1 uppercase <?= $item['active'] ? 'text-blue-400' : 'text-gray-400 group-hover:text-white' ?>">
                            <?= $item['label'] ?>
                        </span>
                    </a>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </div>
</footer>

<div class="h-28"></div>
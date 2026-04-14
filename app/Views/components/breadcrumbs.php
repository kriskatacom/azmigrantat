<?php

use App\Services\HelperService;

$items = $items ?? []; ?>

<nav class="flex py-2 px-3 md:px-5 md:py-3 shadow-xs text-gray-900 w-fit mx-auto backdrop-blur-sm rounded-2xl bg-white border border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar justify-center" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
            <a href="/" class="inline-flex items-center hover:text-blue-600 transition-colors duration-200">
                <?php HelperService::icon('fa-home', 'w-4 h-4 mr-2'); ?>
                Начало
            </a>
        </li>

        <?php foreach ($items as $index => $item): ?>
            <li>
                <div class="flex items-center">
                    <span class="mx-2">
                         <?php HelperService::icon('fa-chevron-right', 'w-3 h-3'); ?>
                    </span>

                    <?php if (!empty($item['url'])): ?>
                        <a href="<?= $item['url'] ?>" class="ml-1 hover:text-blue-600 transition-colors duration-200 md:ml-2">
                            <?= htmlspecialchars($item['label']) ?>
                        </a>
                    <?php else: ?>
                        <span class="ml-1 font-bold md:ml-2 tracking-tight" aria-current="page">
                            <?= htmlspecialchars($item['label']) ?>
                        </span>
                    <?php endif; ?>
                </div>
            </li>
        <?php endforeach; ?>
    </ol>
</nav>

<style>
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

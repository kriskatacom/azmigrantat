<?php

use App\Services\HelperService;

$items = $items ?? []; ?>

<nav class="flex py-2 px-3 md:px-5 md:py-3 shadow-xs text-gray-900 w-fit mx-auto backdrop-blur-sm rounded-2xl bg-white border border-slate-200 justify-center text-sm md:text-base" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center justify-center list-none p-0 m-0">
        <li class="inline-flex items-center">
            <a href="/" class="inline-flex items-center hover:text-blue-600 transition-colors duration-200">
                <?php HelperService::icon('fa-home', 'w-4 h-4 mr-2'); ?>
                Начало
            </a>
        </li>

        <?php foreach ($items as $index => $item): ?>
            <li class="inline-flex items-center">
                <div class="flex items-center">
                    <span class="mx-2 text-gray-400">
                         <?php HelperService::icon('fa-chevron-right', 'w-3 h-3'); ?>
                    </span>

                    <?php if (!empty($item['url'])): ?>
                        <a href="<?= $item['url'] ?>" class="hover:text-blue-600 transition-colors duration-200">
                            <?= htmlspecialchars($item['label']) ?>
                        </a>
                    <?php else: ?>
                        <span class="font-bold tracking-tight text-blue-700" aria-current="page">
                            <?= htmlspecialchars($item['label']) ?>
                        </span>
                    <?php endif; ?>
                </div>
            </li>
        <?php endforeach; ?>
    </ol>
</nav>
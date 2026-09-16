<?php

use App\Core\View;
?>

<div class="my-2 md:my-5 px-2 md:px-4">
    <div class="text-center">
        <h1 class="text-xl md:text-2xl md:font-semibold">
            <?php if (isset($_GET['parent_id']) && !empty($parentCategory)): ?>
                <?= htmlspecialchars($parentCategory['name']) ?>
            <?php else: ?>
                Всички категории
            <?php endif; ?>
        </h1>
        <?php if (isset($_GET['parent_id']) && !empty($parentCategory['description'])): ?>
            <p class="text-gray-500 dark:text-gray-400">
                <?= htmlspecialchars($parentCategory['description']) ?>
            </p>
        <?php else: ?>
            <p class="text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto leading-relaxed">
                <?php if (isset($_GET['parent_id']) && !empty($parentCategory)): ?>
                    <?php if (!empty($parentCategory['description'])): ?>
                        <?= htmlspecialchars($parentCategory['description']) ?>
                    <?php endif; ?>
                <?php else: ?>
                    Добре дошли в каталога с ресурси. Тук ще намерите структурирана информация, полезни връзки, услуги и важни напътствия, разделени по теми, които да улеснят Вашата успешна интеграция.
                <?php endif; ?>
            </p>
        <?php endif; ?>
    </div>
    <?php if (!empty($_GET['parent_id'])): ?>
        <?php View::component('breadcrumbs', 'index/categories/components', [
            'breadcrumbs' => $breadcrumbs ?? []
        ]); ?>
    <?php endif; ?>

    <?php View::component('search', 'index/components', [
        'category' => $parentCategory ?? null
    ]); ?>
</div>
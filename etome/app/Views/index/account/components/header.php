<?php

    $isWithGender = !empty($account['options']['gender']);
    $isWithCity = !empty($account['options']['city']);

?>
<div class="w-full h-48 md:h-64 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
    <?php if (!empty($account['options']['cover_image'])): ?>
        <img src="<?= htmlspecialchars($account['options']['cover_image']) ?>" class="w-full h-full object-cover" alt="">
    <?php endif; ?>
</div>

<div class="flex flex-col md:flex-row md:items-end md:space-x-6 -mt-16 md:-mt-20 relative z-10">
    <div
        class="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-gray-800 rounded-full p-1 shrink-0 mx-auto md:mx-0 shadow-sm">
        <div class="w-full h-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden relative">
            <?php if (!empty($account['options']['profile_image'])): ?>
                <img src="<?= htmlspecialchars($account['options']['profile_image']) ?>"
                    class="w-full h-full object-cover" alt="<?= htmlspecialchars($account['name'] ?? '') ?>">
            <?php endif; ?>
        </div>
    </div>

    <div class="md:text-left min-w-0 text-center relative <?= $isWithGender && $isWithCity ? 'md:mb-5' : 'md:mb-10 md:ml-2' ?>">
        <h1 class="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white truncate">
            <?= htmlspecialchars($account['name'] ?? '') ?>
        </h1>
        
        <?php if ($isWithGender): ?>
            <span class="text-gray-500 dark:text-gray-400 truncate"><?= $account['options']['gender'] === 'male' ? 'Мъж' : 'Жена' ?></span> |
        <?php endif; ?>

        <?php if ($isWithCity): ?>
            <span class="text-gray-500 dark:text-gray-400 truncate"><?= $account['options']['city'] ?></span>
        <?php endif; ?>
    </div>
</div>

<?php if (!empty($account['options']['bio'])): ?>
    <p class="max-sm:text-sm text-gray-600 dark:text-gray-300 max-md:text-center px-2 md:px-5 mt-2 md:mt-5">
        <?= nl2br(htmlspecialchars($account['options']['bio'])) ?>
    </p>
<?php endif; ?>

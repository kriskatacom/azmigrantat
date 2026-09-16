<nav class="flex justify-center mt-2" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-2 flex-wrap">
        <li class="inline-flex items-center">
            <a href="/categories" class="hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">
                Категории
            </a>
        </li>

        <?php if (!empty($breadcrumbs)): ?>
            <?php foreach ($breadcrumbs as $index => $crumb): ?>
                <li class="flex items-center">
                    <span class="mx-1 text-gray-400 dark:text-gray-600">/</span>

                    <?php if ($index === count($breadcrumbs) - 1): ?>
                        <span class="text-gray-800 dark:text-gray-200 truncate max-w-37 md:max-w-xs">
                            <?= htmlspecialchars($crumb['name']) ?>
                        </span>
                    <?php else: ?>
                        <a href="/categories?parent_id=<?= urlencode($crumb['id']) ?>"
                            class="hover:text-blue-600 dark:hover:text-blue-400 transition truncate max-w-30 md:max-w-xs font-medium">
                            <?= htmlspecialchars($crumb['name']) ?>
                        </a>
                    <?php endif; ?>
                </li>
            <?php endforeach; ?>
        <?php endif; ?>
    </ol>
</nav>

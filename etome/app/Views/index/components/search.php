<form method="GET" action="/" class="max-w-3xl mx-auto mt-2 md:mt-5">

    <?php if (!empty($category)): ?>
        <input type="hidden" name="category_id" value="<?= htmlspecialchars($category['id']) ?>">
    <?php endif; ?>

    <?php if (!empty($_GET['location'])): ?>
        <input type="hidden" name="location" value="<?= htmlspecialchars($_GET['location']) ?>">
    <?php endif; ?>

    <div class="flex-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs p-2 md:p-4">
        <div class="flex rounded-md overflow-hidden">
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                </div>
                <input type="text" name="search" value="<?= htmlspecialchars($_GET['search'] ?? '') ?>"
                    placeholder="Търсене на публикации..."
                    class="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-950 transition">
            </div>

            <button type="submit"
                class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm hover:shadow active:scale-[0.98] cursor-pointer text-center">
                Търси
            </button>
        </div>

        <?php if (!empty($category)): ?>
            <div class="text-gray-700 dark:text-slate-200 text-xs sm:text-sm md:text-base mt-1">
                <span>Търсене по категория:</span>
                <span class="font-semibold"><?= htmlspecialchars($category['name']) ?></span>
            </div>
        <?php endif; ?>
    </div>

</form>
<div class="max-w-3xl mx-auto">

    <?php if (!empty($categories)): ?>
        <div class="space-y-5">
            <?php foreach ($categories as $category): ?>
                <a href="/categories?parent_id=<?= urlencode($category['id']) ?>"
                    class="flex flex-row bg-white dark:bg-gray-800 rounded-md shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition duration-200 group">

                    <div class="w-32 md:w-44 h-36 bg-gray-100 dark:bg-gray-900 shrink-0 relative overflow-hidden">
                        <?php if (!empty($category['image_url'])): ?>
                            <img src="<?= htmlspecialchars($category['image_url']) ?>"
                                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                alt="<?= htmlspecialchars($category['name']) ?>">
                        <?php else: ?>
                            <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 px-2 text-center">
                                <svg class="w-8 h-8 mb-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                                </svg>
                                <span class="text-[10px] md:text-xs font-medium">Няма снимка</span>
                            </div>
                        <?php endif; ?>
                    </div>

                    <div class="p-4 md:p-5 flex-1 flex flex-col justify-between min-w-0">
                        <div class="space-y-1">
                            <h2 class="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                                <?= htmlspecialchars($category['name']) ?>
                            </h2>

                            <p class="text-sm md:text-base text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                <?= !empty($category['description']) ? htmlspecialchars($category['description']) : 'Няма допълнително описание за тази категория.' ?>
                            </p>
                        </div>

                        <div class="mt-2 flex items-center justify-end font-semibold text-blue-600 dark:text-blue-400">
                            <span>Разгледай</span>
                            <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none"
                                stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>

                </a>
            <?php endforeach; ?>
        </div>
    <?php else: ?>
        <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
            <svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-8 0H4" />
            </svg>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Няма открити категории</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-1">Тази секция е празна или няма налични подкатегории.</p>
        </div>
    <?php endif; ?>

</div>
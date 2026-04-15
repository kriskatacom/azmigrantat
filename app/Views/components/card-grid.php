<section class="mt-5 py-5 bg-white">
    <div class="container mx-auto px-4">
        <?php if (!empty($items)): ?>
            <?php if (!empty($title) || !empty($highlightTitle)): ?>
                <div class="mb-5 md:mb-7 text-center">
                    <h2 class="text-xl md:text-3xl font-semibold uppercase tracking-tight text-slate-900">
                        <?= htmlspecialchars($title) ?>
                        <?php if (!empty($highlightTitle)): ?>
                            <span class="text-blue-600"><?= htmlspecialchars($highlightTitle) ?></span>
                        <?php endif; ?>
                    </h2>
                    <div class="w-20 h-1.5 bg-blue-600 mx-auto mt-4 rounded-full"></div>
                </div>
            <?php endif; ?>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <?php foreach ($items as $item): ?>
                    <a href="<?= $item['url'] ?>"
                        class="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20">
                        <div class="absolute inset-0 z-0">
                            <img src="<?= $item['image'] ?? '/assets/images/no-image.png' ?>"
                                alt="<?= htmlspecialchars($item['name']) ?>"
                                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110">
                            <div class="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                        </div>
                        <div class="relative z-10 p-6 text-white">
                            <h3 class="text-2xl font-black tracking-tight drop-shadow-md"><?= htmlspecialchars($item['name']) ?></h3>
                            <div class="mt-4 flex items-center font-semibold uppercase text-xs tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                                <span><?= $item['label'] ?? 'Разгледай' ?></span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>

        <?php else: ?>
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div class="relative mb-6">
                    <div class="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50 scale-150"></div>
                    <div class="relative flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-xl shadow-blue-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </div>
                </div>
                
                <h3 class="text-2xl font-bold text-slate-800 mb-2">
                    <?= $emptyTitle ?? 'Няма намерени резултати' ?>
                </h3>
                
                <p class="text-slate-500 max-w-md mx-auto mb-8">
                    В момента в тази категория или град няма активни записи. Опитайте да промените критериите за търсене или се върнете по-късно.
                </p>

                <a href="/" class="inline-flex items-center px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-wider">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Към началната страница
                </a>
            </div>
        <?php endif; ?>
    </div>
</section>
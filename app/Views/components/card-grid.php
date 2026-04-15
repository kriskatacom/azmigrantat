<section class="mt-5 py-5 bg-white">
    <div class="container mx-auto px-4">
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
    </div>
</section>

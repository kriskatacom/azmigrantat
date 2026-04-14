<?php

use App\Core\View;
?>
<header class="relative pt-50 pb-20 bg-slate-900 overflow-hidden">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 opacity-30">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
    </div>

    <div class="container mx-auto px-6 relative z-10 text-center">
        <nav class="flex justify-center mb-8">
            <span class="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">
                Резултати от търсене
            </span>
        </nav>

        <h1 class="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 tracking-tight">
            Търсене за: <span class="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 italic">
                "<?= htmlspecialchars($query) ?>"
            </span>
        </h1>

        <div class="max-w-3xl mx-auto">
            <?= View::component('search-autocomplete', 'components') ?>
        </div>
    </div>
</header>

<section class="py-20 bg-white min-h-[50vh]">
    <div class="container mx-auto px-6">

        <?php if ($results->isEmpty()): ?>
            <div class="max-w-2xl mx-auto rounded-3xl bg-slate-50 py-20 text-center border-2 border-dashed border-slate-200">
                <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-sm text-slate-400 mb-6">
                    <?php \App\Services\HelperService::icon('fa-map-marker-alt', 'w-10 h-10'); ?>
                </div>
                <h3 class="text-slate-900 font-bold text-2xl mb-2">Няма открити резултати</h3>
                <p class="text-slate-500 mb-8 max-w-sm mx-auto">
                    Не успяхме да открием локация с име "<?= htmlspecialchars($query) ?>". Опитайте да изпишете името на кирилица.
                </p>
                <a href="/cities" class="inline-flex items-center font-bold text-blue-600 hover:text-blue-700 transition">
                    Разгледай всички региони
                    <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>

        <?php else: ?>
            <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <?php foreach ($results as $item): ?>
                    <a href="/cities/<?= ltrim($item->slug, '/') ?>"
                        class="group relative flex h-80 flex-col justify-end overflow-hidden rounded-3xl border border-slate-100 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20">

                        <div class="absolute inset-0 z-0">
                            <img src="<?= $item->options['image_desktop'] ?? '/assets/images/no-image.png' ?>"
                                alt="<?= $item->name ?>"
                                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110">

                            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90"></div>
                        </div>

                        <div class="relative z-10 p-8 text-white">
                            <span class="inline-block px-3 py-1 mb-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                <?= $item->getTypeName() ?>
                            </span>

                            <h3 class="text-3xl font-black tracking-tight drop-shadow-md leading-tight mb-2">
                                <?= $item->name ?>
                            </h3>

                            <?php if ($item->parent): ?>
                                <p class="text-white/70 text-sm font-medium mb-4 flex items-center">
                                    <span class="w-4 h-px bg-white/40 mr-2"></span>
                                    Област <?= $item->parent->name ?>
                                </p>
                            <?php endif; ?>

                            <div class="mt-4 flex items-center text-sm font-bold uppercase tracking-wider text-blue-400 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                                <span>Разгледай</span>
                                <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

    </div>
</section>

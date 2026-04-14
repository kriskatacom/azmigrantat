<?php

use App\Core\View;

$breadcrumbs = [];

if ($city->parent_id && isset($city->parent)) {
    $breadcrumbs[] = [
        'label' => $city->parent->getTranslatedName(),
        'url' => '/cities/' . ltrim($city->parent->slug, '/')
    ];
}

$breadcrumbs[] = ['label' => $city->getTranslatedName(), 'url' => ''];
?>

<section class="relative h-[60vh] min-h-120 w-full bg-slate-900 text-white">

    <picture class="absolute inset-0 h-full w-full">
        <?php if (!empty($city->options['image_phone'])): ?>
            <source media="(max-width: 639px)" srcset="<?= $city->options['image_phone'] ?>">
        <?php endif; ?>

        <?php if (!empty($city->options['image_tablet'])): ?>
            <source media="(max-width: 1023px)" srcset="<?= $city->options['image_tablet'] ?>">
        <?php endif; ?>

        <img src="<?= $city->options['image_desktop'] ?? '/assets/img/default-city.jpg' ?>"
            alt="<?= $city->name ?>"
            class="h-full w-full object-cover object-center opacity-40 transition-transform duration-1000">
    </picture>

    <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

    <div class="relative z-10 flex h-full flex-col justify-end">

        <div>
            <h1 class="mb-5 text-lg md:text-2xl lg:text-3xl shadow-black/20 drop-shadow-lg text-white text-center w-full max-w-3xl mx-auto px-5 uppercase font-serif italic">
                <?php if ($city->type === 'region'): ?>
                    Общини в област <?= $city->getOptionTranslation('h1_title', $city->name) ?>
                <?php else: ?>
                    <?= $city->getOptionTranslation('h1_title', $city->name) ?>
                <?php endif; ?>
            </h1>

            <?php if ($city->type === 'city'): ?>
                <div class="container mx-auto mb-2 px-5">
                    <button class="border border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white hover:text-gray-900 text-white rounded-md transition-all duration-300 shadow-lg group">
                        <a href="/" class="py-1 px-3 md:py-3 md:px-5 flex items-center gap-2 font-semibold uppercase tracking-wider text-xs">
                            Информация
                        </a>
                    </button>
                </div>
            <?php endif; ?>
        </div>

        <div class="relative z-20 -mb-6">
            <?php View::component('breadcrumbs', 'components', [
                'items' => $breadcrumbs
            ]); ?>
        </div>
    </div>

</section>

<section class="mt-10 py-5 bg-white">
    <div class="container mx-auto px-4">

        <?php if ($city->type === 'city'): ?>
            <div class="mb-8 md:mb-12">
                <h2 class="text-xl md:text-3xl font-semibold uppercase text-center tracking-tight text-slate-900">
                    <?= 'Села в община ' ?>
                    <span class="text-blue-600"><?= $city->getTranslatedName() ?></span>
                </h2>
                <div class="w-20 h-1.5 bg-blue-600 mx-auto mt-4 rounded-full"></div>
            </div>
        <?php endif; ?>

        <?php if (count($children) > 0): ?>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <?php foreach ($children as $child): ?>
                    <a href="/cities/<?= ltrim($child->slug, '/') ?>"
                        class="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20">

                        <div class="absolute inset-0 z-0">
                            <picture class="h-full w-full">
                                <?php if (!empty($child->options['image_phone'])): ?>
                                    <source media="(max-width: 639px)" srcset="<?= $child->options['image_phone'] ?>">
                                <?php endif; ?>

                                <?php if (!empty($child->options['image_tablet'])): ?>
                                    <source media="(max-width: 1023px)" srcset="<?= $child->options['image_tablet'] ?>">
                                <?php endif; ?>

                                <img src="<?= $child->options['image_desktop'] ?? '/assets/images/no-image.png' ?>"
                                    alt="<?= htmlspecialchars($child->name) ?>"
                                    class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110">
                            </picture>

                            <div class="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                        </div>

                        <div class="relative z-10 p-6 text-white">
                            <h3 class="text-2xl font-black tracking-tight drop-shadow-md">
                                <?= $child->name ?>
                            </h3>

                            <div class="mt-4 flex items-center font-semibold transition-all duration-300">
                                <span>Информация</span>
                            </div>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="rounded-3xl bg-slate-50 py-20 text-center border-2 border-dashed border-slate-200">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <p class="text-slate-500 font-bold text-lg">Няма намерени допълнителни населени места</p>
                <p class="text-slate-400">Този регион в момента не съдържа по-малки административни единици.</p>
            </div>
        <?php endif; ?>

    </div>
</section>

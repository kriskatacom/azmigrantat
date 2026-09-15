<section class="relative h-[60vh] min-h-120 w-full bg-slate-900 text-white">

    <picture class="absolute inset-0 h-full w-full">
        <?php if (!empty($images['phone'])): ?>
            <source media="(max-width: 639px)" srcset="<?= $images['phone'] ?>">
        <?php endif; ?>

        <?php if (!empty($images['tablet'])): ?>
            <source media="(max-width: 1023px)" srcset="<?= $images['tablet'] ?>">
        <?php endif; ?>

        <img src="<?= $images['desktop'] ?? '/assets/img/default-city.jpg' ?>"
            alt="<?= htmlspecialchars($title) ?>"
            class="h-full w-full object-cover object-center opacity-40 transition-transform duration-1000">
    </picture>

    <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

    <div class="relative z-10 flex h-full flex-col justify-end">

        <div>
            <h1 class="mb-5 text-lg md:text-2xl lg:text-3xl shadow-black/20 drop-shadow-lg text-white text-center w-full max-w-3xl mx-auto px-5 uppercase font-serif italic">
                <?= htmlspecialchars($title) ?>
            </h1>
        </div>

        <div class="relative z-20 -mb-6">
            <?php App\Core\View::component('breadcrumbs', 'components', [
                'items' => $breadcrumbs
            ]); ?>
        </div>
    </div>

</section>
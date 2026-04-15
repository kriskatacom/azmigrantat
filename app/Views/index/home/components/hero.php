<?php

use App\Core\View;
use App\Services\HelperService; ?>

<header class="relative h-[70vh] min-h-125 w-full flex items-end justify-center bg-white mb-10">

    <img
        src="<?= $page->options['image_desktop'] ?>"
        alt="Hero Background"
        class="absolute inset-0 w-full h-full object-cover">

    <div class="absolute inset-0 bg-black/40 z-10"></div>

    <div class="relative z-20 container mx-auto px-5 text-center text-white">
        <div class="backdrop-blur-xs bg-black/5 border border-white/10 px-4 py-2 rounded-lg shadow-xl md:px-6 md:py-2 mb-12 w-fit mx-auto">
            <h1 class="text-lg md:text-2xl lg:text-4xl text-center font-bold uppercase text-white font-serif italic drop-shadow-md">
                <?= $page->options['h1_title'] ?? $page->title ?>
            </h1>
        </div>

        <div class="absolute -bottom-11 left-[50%] -translate-x-[50%]">
            <?= View::component('search-autocomplete', 'components', [
                'placeholder' => 'Открийте градовете и селата...',
                'action'      => '/cities/search'
            ]) ?>
        </div>
    </div>

</header>

<div class="space-y-2">
    <div class="md:text-2xl font-semibold uppercase text-center">Бизнес и партньорство по области</div>
</div>
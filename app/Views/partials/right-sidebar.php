<?php

use App\Services\HelperService;
?>

<div
    x-show="sidebarOpen"
    x-transition:enter="transition ease-out duration-300"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-transition:leave="transition ease-in duration-300"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    @click="sidebarOpen = false"
    class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-100"
    style="display: none;">
</div>

<div
    x-show="sidebarOpen"
    x-effect="sidebarOpen ? document.body.classList.add('overflow-hidden') : document.body.classList.remove('overflow-hidden')"
    x-transition:enter="transition ease-out duration-300 transform"
    x-transition:enter-start="translate-x-full"
    x-transition:enter-end="translate-x-0"
    x-transition:leave="transition ease-in duration-300 transform"
    x-transition:leave-start="translate-x-0"
    x-transition:leave-end="translate-x-full"
    class="fixed top-0 right-0 h-full w-80 md:w-96 bg-white z-101 shadow-2xl flex flex-col"
    style="display: none;"
    @click.away="sidebarOpen = false">

    <div class="flex justify-between items-center p-6 border-b border-gray-100">
        <h3 class="text-[#0a1622] text-xl font-bold italic tracking-tight"><?= HelperService::trans('i_the_migrant') ?></h3>
        <button @click="sidebarOpen = false" class="text-gray-400 hover:text-red-500 transition-colors">
            <svg class="w-7 h-7 border border-gray-200 rounded-md p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    </div>

    <div class="flex flex-col overflow-y-auto">
        <?php
        $sideLinks = [
            '/' => ['icon' => 'fa-house', 'label' => 'nav_home'],
            '/terms' => ['icon' => 'fa-file-lines', 'label' => 'terms_of_use'],
            '/privacy' => ['icon' => 'fa-file-shield', 'label' => 'privacy_policy'],
            '/contacts' => ['icon' => 'fa-phone-volume', 'label' => 'contacts'],
            '/services' => ['icon' => 'fa-phone', 'label' => 'services'],
            '/about' => ['icon' => 'fa-building-user', 'label' => 'about_us'],
        ];

        foreach ($sideLinks as $path => $data): ?>
            <a href="<?= HelperService::url($path) ?>"
                class="flex items-center gap-5 py-3 px-5 text-primary-dark hover:text-white hover:bg-primary-dark transition-all border-b border-gray-200 group"
                @click.prevent="
                    sidebarOpen = false;
                    document.body.classList.remove('overflow-hidden');
                    setTimeout(() => { 
                        window.location.href = '<?= HelperService::url($path) ?>' 
                    }, 300)
                ">
                <div class="w-10 h-10 flex items-center justify-center">
                    <i class="fa-solid <?= $data['icon'] ?> text-2xl text-primary-dark transition-all duration-300 group-hover:text-primary-light group-hover:scale-110"></i>
                </div>

                <span class="text-lg font-medium"><?= HelperService::trans($data['label']) ?></span>
            </a>
        <?php endforeach; ?>
    </div>

    <div class="mt-auto p-8 flex justify-center gap-6">
        <span class="text-xs text-gray-400 uppercase tracking-widest italic">v1.2.4</span>
    </div>
</div>
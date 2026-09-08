<?php

use App\Helpers\AuthHelper;
?>

<div class="text-primary bg-darken-primary border-b border-gray-200 py-2">
    <div x-data="{ open: false }" class="relative container mx-auto">

        <div class="max-md:px-2 flex justify-between items-center">
            <a href="/" class="shrink-0">
                <img src="/assets/images/logo.webp" alt="<?= htmlspecialchars(COMPANY_NAME) ?>" class="h-14 w-auto">
            </a>

            <div>
                <?php if (AuthHelper::check()): ?>
                    <a href="/users/profile">
                        <i class="fa-solid fa-user text-white text-2xl md:text-2xl lg:text-4xl"></i>
                    </a>
                <?php else: ?>
                    <a href="/users/login">
                        <i class="fa-solid fa-user text-white text-2xl md:text-2xl lg:text-4xl"></i>
                    </a>
                <?php endif; ?>
                <button @click="open = true" class="p-2 self-start text-slate-400 hover:text-slate-900">
                    <i class="fa-solid fa-bars text-white text-2xl md:text-2xl lg:text-4xl"></i>
                </button>
            </div>
        </div>

        <div class="container mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <a href="<?= htmlspecialchars(COMPANY_WEBSITE) ?>"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Начало</a>
            <a href="https://azmigrantat.com/travel"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Пътувания</a>
            <a href="https://gradove-i-sela.azmigrantat.com"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Градове
                и села </a>
            <a href="https://business.azmigrantat.com"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Бизнес
                и патньорство </a>
            <a href="/jobs"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Търся/Предлагам
                работа </a>
            <a href="/ads"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Обяви</a>
            <a href="/music"
                class="whitespace-nowrap px-5 py-2 rounded-full text-secondary hover:bg-dark-primary text-sm md:text-base lg:text-lg">Музика</a>
        </div>

        <div x-show="open" x-cloak
            class="fixed inset-0 z-9999 flex justify-end <?= AuthHelper::isAdmin() ? 'mt-10' : '' ?>">
            <div @click="open = false" class="fixed inset-0 bg-black/50" x-show="open"
                x-transition:enter="transition-opacity" x-transition:leave="transition-opacity"></div>

            <div class="relative w-full max-w-100 bg-white h-full shadow-xl flex flex-col" x-show="open"
                x-transition:enter="transition-transform" x-transition:enter-start="translate-x-full"
                x-transition:leave="transition-transform" x-transition:leave-end="translate-x-full">
                <div class="w-full border-b border-gray-200">
                    <button @click="open = false" class="p-5 self-start text-slate-400 hover:text-slate-900">
                        <i class="fa-solid fa-xmark text-2xl md:text-4xl"></i>
                    </button>
                </div>

                <nav class="flex flex-col text-slate-700">
                    <a href="/privacy"
                        class="border-b border-gray-200 py-3 px-5 md:text-lg hover:text-secondary hover:bg-primary">Политика
                        за поверителност</a>
                    <a href="/cookies"
                        class="border-b border-gray-200 py-3 px-5 md:text-lg hover:text-secondary hover:bg-primary">Политика
                        за бисквитки</a>
                    <a href="/terms"
                        class="border-b border-gray-200 py-3 px-5 md:text-lg hover:text-secondary hover:bg-primary">Общи
                        условия</a>
                    <a href="/contacts"
                        class="border-b border-gray-200 py-3 px-5 md:text-lg hover:text-secondary hover:bg-primary">Контакти</a>
                    <a href="/about"
                        class="border-b border-gray-200 py-3 px-5 md:text-lg hover:text-secondary hover:bg-primary">За
                        нас</a>
                </nav>
            </div>
        </div>
    </div>
</div>

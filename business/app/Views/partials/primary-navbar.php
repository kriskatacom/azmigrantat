<?php

use App\Core\View;
use App\Helpers\AuthHelper;
use App\Services\HelperService;
?>

<nav x-data="{ sidebarOpen: false }"
    @keydown.escape="sidebarOpen = false"
    class="<?= $navClasses ?> z-50 fixed <?= AuthHelper::isAdmin() ? 'top-10' : 'top-0' ?> left-0 w-full px-6 py-4 flex flex-col gap-4 transition-all duration-500 bg-primary-darken/60 border-b border-white/5">

    <div class="container mx-auto flex justify-between items-center w-full">
        <div class="flex items-center">
            <div class="text-3xl font-bold flex">
                <a href="<?= HelperService::url('/') ?>" title="<?= HelperService::trans('nav_home') ?>">
                    <img src="/assets/images/logo.webp" alt="<?= HelperService::trans('logo_alt') ?>" class="h-10 w-auto">
                </a>
            </div>
        </div>

        <div class="flex items-center gap-6">
            <?php if ($user = AuthHelper::user()): ?>
                <div class="relative group">
                    <button class="flex items-center gap-2 hover:text-primary-light transition text-white">
                        <span class="text-sm font-medium hidden md:block"><?= htmlspecialchars($user['name']) ?></span>
                        <?php HelperService::icon('user-icon', 'text-white w-8 h-8 group-hover:text-primary-light'); ?>
                    </button>

                    <div class="absolute right-0 mt-2 w-48 bg-[#0a1622] border border-white/10 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
                        <?php if (AuthHelper::isAdmin()): ?>
                            <a href="/admin/dashboard" class="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition border-b border-white/5 mb-1">
                                <?= HelperService::trans('admin_panel') ?>
                            </a>
                        <?php endif; ?>

                        <form action="/users/logout" method="POST" class="w-full">
                            <button type="submit" class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                                <?= HelperService::trans('logout') ?>
                            </button>
                        </form>
                    </div>
                </div>
            <?php else: ?>
                <a href="/auth/login" class="hover:text-primary-light transition group" title="Вход">
                    <?php HelperService::icon('user-icon', 'text-white w-8 h-8 group-hover:scale-110 transition-transform'); ?>
                </a>
            <?php endif; ?>

            <button @click="sidebarOpen = true" class="hover:text-primary-light transition group">
                <?php HelperService::icon('menu-icon', 'text-white w-8 h-8 group-hover:rotate-90 transition-transform duration-300'); ?>
            </button>

            <?php View::loadPartial('partials/right-sidebar') ?>
            <?php View::loadPartial('partials/languages-modal') ?>
        </div>
    </div>

    <div class="container mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <?php
        $links = [
            'https://azmigrantat.com' => 'home',
            'https://azmigrantat.com/travel' => 'travel',
            'https://gradove-i-sela.azmigrantat.com' => 'cities_and_villages',
            'https://business.azmigrantat.com' => 'business_partnership',
            '/jobs' => 'looking_offer_jobs',
            '/ads' => 'ads',
            '/music' => 'music'
        ];
        foreach ($links as $path => $langKey): ?>
            <a href="<?= HelperService::url($path) ?>" class="<?= HelperService::navLinkClasses($path) ?> text-sm md:text-base">
                <?= HelperService::trans($langKey) ?>
            </a>
        <?php endforeach; ?>
    </div>
</nav>

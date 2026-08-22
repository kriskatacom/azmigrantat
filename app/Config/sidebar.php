<?php

use App\Helpers\AuthHelper;
use App\Helpers\Company;

$sidebarLinks = [];

if (AuthHelper::check()) {
    $sidebarLinks[] = ['url' => '/users/profile', 'icon' => 'fa-user', 'label' => 'Моят профил'];
}

if (AuthHelper::isAdmin()) {
    array_unshift($sidebarLinks, ['url' => '/admin/dashboard', 'icon' => 'fa-tachometer-alt', 'label' => 'Табло']);

    $sidebarLinks[] = ['url' => '/admin/users', 'icon' => 'fa-users', 'label' => 'Потребители'];
    $sidebarLinks[] = ['url' => '/admin/settings', 'icon' => 'fa-sliders', 'label' => 'Настройки'];
    $sidebarLinks[] = ['url' => '/admin/categories', 'icon' => 'fa-folder-open', 'label' => 'Категории'];
    $sidebarLinks[] = ['url' => '/admin/oauth-apps', 'icon' => 'fa-key', 'label' => 'SSO Приложения'];
}

$sidebarLinks[] = [
    'url' => Company::website(),
    'icon' => 'fa-arrow-left',
    'label' => 'Към основния сайт',
];

define('SIDEBAR_LINKS', $sidebarLinks);

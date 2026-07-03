<?php

use App\Helpers\AuthHelper;

define('DOMAIN', $_SERVER['HTTP_HOST']);
define('DOMAIN_NO_WWW', preg_replace('/^www\./', '', $_SERVER['HTTP_HOST']));
define('FULL_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
define('URI_PATH', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
define('QUERY_STRING', $_SERVER['QUERY_STRING'] ?? '');
define('BASE_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST']);
define('CURRENT_FILE', basename($_SERVER['SCRIPT_NAME']));
define('CURRENT_DIR', rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'));
define('PROTOCOL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http');

define('ROOT', dirname(__DIR__, 2));
define('PUBLIC_PATH', ROOT . '/public');

define('WEBSITE_DOMAIN_NAME', 'users.azmigrantat.com');
define('FULL_DOMAIN', 'https://users.azmigrantat.com');
define('MAIN_WEBSITE_URL', 'https://azmigrantat.com');

define('DATABASE_ADMIN_EMAIL', $_ENV['DATABASE_ADMIN_EMAIL']);
define('DATABASE_ADMIN_PASSWORD', $_ENV['DATABASE_ADMIN_PASSWORD']);

define('DB_DRIVER', $_ENV['DB_DRIVER']);
define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);
define('DB_CHARSET', $_ENV['DB_CHARSET']);
define('DB_COLLATION', $_ENV['DB_COLLATION']);

define('LANGUAGES', [
    'default' => 'bg',
    'supported' => [
        'en',
        'de',
        'ru',
        'fr',
        'it',
        'es',
        'ro',
        'tr',
        'el',
        'pt',
        'pl',
        'nl',
        'zh',
        'ja',
        'ar',
        'uk',
        'hu',
        'cs',
        'sr',
        'sq'
    ],
    'data' => [
        'bg' => ['name' => 'Български', 'flag' => '/assets/images/flags/bg.webp'], // България - Български
        'en' => ['name' => 'English', 'flag' => '/assets/images/flags/gb.webp'], // Великобритания - Английски
        'de' => ['name' => 'Deutsch', 'flag' => '/assets/images/flags/de.webp'], // Германия - Немски
        'ru' => ['name' => 'Русский', 'flag' => '/assets/images/flags/ru.webp'], // Русия - Руски
        'fr' => ['name' => 'Français', 'flag' => '/assets/images/flags/fr.webp'], // Франция - Френски
        'it' => ['name' => 'Italiano', 'flag' => '/assets/images/flags/it.webp'], // Италия - Италиански
        'es' => ['name' => 'Español', 'flag' => '/assets/images/flags/es.webp'], // Испания - Испански
        'ro' => ['name' => 'Română', 'flag' => '/assets/images/flags/ro.webp'], // Румъния - Румънски
        'tr' => ['name' => 'Türkçe', 'flag' => '/assets/images/flags/tr.webp'], // Турция - Турски
        'el' => ['name' => 'Ελληνικά', 'flag' => '/assets/images/flags/gr.webp'], // Гърция - Гръцки
        'pt' => ['name' => 'Português', 'flag' => '/assets/images/flags/pt.webp'], // Португалия - Португалски
        'pl' => ['name' => 'Polski', 'flag' => '/assets/images/flags/pl.webp'], // Полша - Полски
        'nl' => ['name' => 'Nederlands', 'flag' => '/assets/images/flags/nl.webp'], // Нидерландия - Нидерландски
        'zh' => ['name' => '中文 (Zh)', 'flag' => '/assets/images/flags/cn.webp'], // Китай - Китайски
        'ja' => ['name' => '日本語 (Ja)', 'flag' => '/assets/images/flags/jp.webp'], // Япония - Японски
        'ar' => ['name' => 'العربية (Ar)', 'flag' => '/assets/images/flags/sa.webp'], // Саудитска Арабия - Арабски
        'uk' => ['name' => 'Українська', 'flag' => '/assets/images/flags/ua.webp'], // Украйна - Украински
        'hu' => ['name' => 'Magyar', 'flag' => '/assets/images/flags/hu.webp'], // Унгария - Унгарски
        'cs' => ['name' => 'Čeština', 'flag' => '/assets/images/flags/cz.webp'], // Чехия - Чешки
        'sr' => ['name' => 'Српски', 'flag' => '/assets/images/flags/rs.webp'], // Сърбия - Сръбски
        'sq' => ['name' => 'Shqip', 'flag' => '/assets/images/flags/al.webp'], // Албания - Албански
    ]
]);

$sidebarLinks = [];

if (AuthHelper::check()) {
    $sidebarLinks[] = ['url' => '/users/profile', 'icon' => 'fa-user', 'label' => 'Моят профил'];
}

if (AuthHelper::isAdmin()) {
    array_unshift($sidebarLinks, ['url' => '/admin/dashboard', 'icon' => 'fa-tachometer-alt', 'label' => 'Табло']);

    $sidebarLinks[] = ['url' => '/admin/users', 'icon' => 'fa-users', 'label' => 'Потребители'];
    $sidebarLinks[] = ['url' => '/admin/categories', 'icon' => 'fa-folder-open', 'label' => 'Категории'];
    $sidebarLinks[] = ['url' => '/admin/oauth-apps', 'icon' => 'fa-key', 'label' => 'SSO Приложения'];
}

$sidebarLinks[] = ['url' => 'https://azmigrantat.com', 'icon' => 'fa-arrow-left', 'label' => 'Към основния сайт'];

define('SIDEBAR_LINKS', $sidebarLinks);

define('PAGE_TEMPLATES', [
    'none' => 'Без шаблон',
    'default' => 'Стандартен шаблон',
]);

define('COMPANY_PHONE', $_ENV['COMPANY_PHONE'] ?? '+359 123 456 789');
define('COMPANY_NAME', $_ENV['COMPANY_NAME'] ?? 'Аз, мигрантът');

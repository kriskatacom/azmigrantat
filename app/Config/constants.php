<?php

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

define('WEBSITE_NAME', 'KRISKATA.COM');
define('FULL_DOMAIN', 'https://kriskata.com');

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
    'supported' => ['en', 'de', 'ru', 'fr', 'it', 'es', 'ro', 'tr'],
    'data' => [
        'bg' => ['name' => 'Български', 'flag' => '/assets/images/flags/bg.webp'],
        'en' => ['name' => 'English',    'flag' => '/assets/images/flags/gb.webp'],
        'de' => ['name' => 'Deutsch',    'flag' => '/assets/images/flags/de.webp'],
        'ru' => ['name' => 'Русский',    'flag' => '/assets/images/flags/ru.webp'],
        'fr' => ['name' => 'Français',   'flag' => '/assets/images/flags/fr.webp'],
        'it' => ['name' => 'Italiano',   'flag' => '/assets/images/flags/it.webp'],
        'es' => ['name' => 'Español',    'flag' => '/assets/images/flags/es.webp'],
        'ro' => ['name' => 'Română',     'flag' => '/assets/images/flags/ro.webp'],
        'tr' => ['name' => 'Türkçe',     'flag' => '/assets/images/flags/tr.webp'],
    ]
]);

define('SERVICES', [
    'web-design'    => 'Дизайн',
    'development'   => 'Сайт',
    'ecommerce'     => 'Магазин',
    'support'       => 'Поддръжка',
    'seo-marketing' => 'SEO',
    'other'         => 'Друго'
]);

define('TECH_STACK', [
    'PHP 8.4',
    'MySQL',
    'JavaScript',
    'Tailwind CSS',
    'React',
    'Next.js',
    'WordPress',
    'Redis',
    'Docker'
]);

define('CONTACTS', [
    'phone'         => $_ENV['APP_PHONE'] ?? '+359...',
    'phone_clean'   => $_ENV['APP_PHONE_CLEAN'] ?? '359...',
    'email'         => $_ENV['APP_EMAIL'] ?? 'office@example.com',
    'location'      => $_ENV['APP_LOCATION'] ?? 'България',
]);

define('AFILIATE_LINK', $_ENV['AFILIATE_LINK'] ?? '');

define('PROJECTS', [
    [
        'title' => 'Аз мигрантът',
        'category' => 'Уеб приложение / Дизайн',
        'image' => '/assets/gallery/azmigrantat.webp',
        'link' => 'https://azmigrantat.com',
        'tags' => ['PHP', 'Custom MVC', 'MySQL'],
    ],
    [
        'title' => 'СтрахилСтрой',
        'category' => 'Изработка на сайт / SEO',
        'image' => '/assets/gallery/strahilstroi.webp',
        'link' => 'https://pokrivi-strahilstroi.com',
        'tags' => ['PHP', 'Vanilla JS', 'SEO'],
    ],
]);

define('CITIES', [
    [
        'name' => 'Дупница',
        'slug' => '/cities/website-development-dupnica',
        'short_desc' => 'Твоят уеб партньор в региона',
        'long_desc' => 'Като специалист в град Дупница, помагам на местните бизнеси да прескочат регионалните граници. Предлагам изработка на високопроизводителни уебсайтове и системи, оптимизирани за Google, които гарантират бързина и сигурност. Независимо дали имаш нужда от онлайн магазин, фирмен сайт или специфична CMS система, аз ще превърна идеята ти в работещо дигитално решение.',
        'image' => '/assets/images/cities/dupnica.webp'
    ],
]);

define('SIDEBAR_LINKS', [
    ['url' => '/admin/dashboard', 'icon' => 'fa-chart-line', 'label' => 'Табло'],
    ['url' => '/admin/users', 'icon' => 'fa-users', 'label' => 'Потребители'],
    ['url' => '/admin/menus', 'icon' => 'fa-bars-staggered', 'label' => 'Менюта'],
    ['url' => '/admin/pages', 'icon' => 'fa-book-open', 'label' => 'Страници'],
    ['url' => '/admin/articles', 'icon' => 'fa-newspaper', 'label' => 'Статии'],
    ['url' => '/admin/categories', 'icon' => 'fa-folder-tree', 'label' => 'Категории'],
    ['url' => '/admin/business-categories', 'icon' => 'fa-briefcase', 'label' => 'Бизнес Категории'],
    ['url' => '/admin/tags', 'icon' => 'fa-tags', 'label' => 'Тагове'],
    ['url' => '/admin/media', 'icon' => 'fa-images', 'label' => 'Медия'],
    ['url' => '/admin/galleries', 'icon' => 'fa-photo-film', 'label' => 'Галерии'],
    ['url' => '/admin/redirects', 'icon' => 'fa-route', 'label' => 'Пренасочвания'],
    ['url' => '/admin/translations', 'icon' => 'fa-language', 'label' => 'Преводи'],
    ['url' => '/admin/cities', 'icon' => 'fa-city', 'label' => 'Градове'],
    ['url' => '/admin/companies', 'icon' => 'fa-building', 'label' => 'Компании'],
    ['url' => BASE_URL, 'icon' => 'fa-arrow-left', 'label' => 'Към основния сайт'],
]);

define('PAGE_TEMPLATES', [
    'none' => 'Без шаблон',
    'default' => 'Стандартен шаблон',
]);
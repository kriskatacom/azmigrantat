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

define('WEBSITE_NAME', 'Etome');
define('FULL_DOMAIN', 'https://etome.bg');

define('DATABASE_ADMIN_EMAIL', $_ENV['DATABASE_ADMIN_EMAIL']);
define('DATABASE_ADMIN_PASSWORD', $_ENV['DATABASE_ADMIN_PASSWORD']);

define('DB_DRIVER', $_ENV['DB_DRIVER']);
define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);
define('DB_CHARSET', $_ENV['DB_CHARSET']);
define('DB_COLLATION', $_ENV['DB_COLLATION']);

define('AUTH_SERVER_URL', $_ENV['AUTH_SERVER_URL']);
define('BUSINESS_WEBSITE_SERVER_URL', $_ENV['BUSINESS_WEBSITE_SERVER_URL']);

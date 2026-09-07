<?php

if (PHP_SAPI === 'cli-server') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $staticFile = __DIR__ . $requestPath;

    if ($requestPath !== '/' && is_file($staticFile)) {
        return false;
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

define('BASE_PATH', str_replace('\\', '/', dirname(__DIR__)));

use App\Core\App;

App::bootstrap();

$app = new App();

$app->initSession();
$routePath = $app->initLanguage();
date_default_timezone_set('UTC');
$app->dispatch($routePath);

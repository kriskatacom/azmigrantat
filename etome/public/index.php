<?php

// Let PHP's built-in server serve existing CSS, JS, images and fonts directly.
if (PHP_SAPI === 'cli-server') {
    $publicRoot = realpath(__DIR__);
    $requestedPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    $requestedFile = realpath(__DIR__ . $requestedPath);

    if ($publicRoot && $requestedFile && str_starts_with($requestedFile, $publicRoot . DIRECTORY_SEPARATOR) && is_file($requestedFile)) {
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
$app->dispatch($routePath);

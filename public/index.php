<?php

require_once __DIR__ . '/../vendor/autoload.php';

define('BASE_PATH', str_replace('\\', '/', dirname(__DIR__)));

use App\Core\App;

App::bootstrap();

$app = new App();

$app->initSession();
$routePath = $app->initLanguage();
$app->dispatch($routePath);

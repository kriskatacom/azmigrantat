<?php

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Pagination\Paginator;
use Illuminate\Container\Container;
use Illuminate\Support\Facades\Facade;
use Illuminate\Validation\DatabasePresenceVerifier;

$container = new Container();

Paginator::currentPageResolver(function ($pageName = 'page') {
    return (int) ($_GET[$pageName] ?? 1);
});

Paginator::currentPathResolver(function () {
    return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
});

$capsule = new Capsule($container);

$capsule->addConnection([
    'driver'    => $_ENV['DB_DRIVER'] ?? 'mysql',
    'host'      => $_ENV['DB_HOST'] ?? 'localhost',
    'database'  => $_ENV['DB_NAME'],
    'username'  => $_ENV['DB_USER'],
    'password'  => $_ENV['DB_PASS'],
    'charset'   => $_ENV['DB_CHARSET'] ?? 'utf8',
    'collation' => $_ENV['DB_COLLATION'] ?? 'utf8_unicode_ci',
    'prefix'    => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

$container->singleton('validator', function ($container) use ($capsule) {
    $loader = new \Illuminate\Translation\FileLoader(new \Illuminate\Filesystem\Filesystem(), 'lang');
    $translator = new \Illuminate\Translation\Translator($loader, 'bg');
    
    $factory = new \Illuminate\Validation\Factory($translator, $container);

    $presenceVerifier = new DatabasePresenceVerifier($capsule->getDatabaseManager());
    $factory->setPresenceVerifier($presenceVerifier);

    return $factory;
});

Facade::setFacadeApplication($container);

$logFile = __DIR__ . '/../storage/logs/app_errors.log';

if (!is_dir(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

ini_set('log_errors', 'On');
ini_set('error_log', $logFile);
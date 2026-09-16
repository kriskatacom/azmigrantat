<?php

use App\Core\Router;
use App\Controllers\HomeController;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/', [HomeController::class, 'home']);
$router->get('/categories', [HomeController::class, 'categories']);
$router->get('/accounts/{id}', [HomeController::class, 'account']);
$router->get('/posts/{id}', [HomeController::class, 'showPost']);
$router->get('/search', [HomeController::class, 'search']);

return $router;

<?php

use App\Core\Router;
use App\Controllers\HomeController;
use App\Controllers\LegalController;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/', [HomeController::class, 'home']);
$router->get('/categories', [HomeController::class, 'categories']);
$router->get('/accounts/{id}', [HomeController::class, 'account']);
$router->get('/posts/{id}', [HomeController::class, 'showPost']);
$router->get('/search', [HomeController::class, 'search']);
$router->get('/privacy', [LegalController::class, 'privacy']);
$router->get('/terms', [LegalController::class, 'terms']);
$router->get('/account-deletion', [LegalController::class, 'accountDeletion']);

return $router;

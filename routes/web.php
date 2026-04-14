<?php

use App\Core\Router;
use App\Controllers\ContactController;
use App\Controllers\PageController;
use App\Controllers\CityController;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/cities/search', [CityController::class, 'search']);

$router->get('/admin/cities', [CityController::class, 'index'], $adminAuth);
$router->get('/admin/cities/create', [CityController::class, 'create'], $adminAuth);
$router->post('/admin/cities/store', [CityController::class, 'store'], $adminAuth);
$router->get('/admin/cities/edit/{id}', [CityController::class, 'edit'], $adminAuth);
$router->post('/admin/cities/delete/{id}', [CityController::class, 'delete'], $adminAuth);
$router->post('/admin/cities/restore/{id}', [CityController::class, 'restore'], $adminAuth);
$router->post('/admin/cities/update/{id}', [CityController::class, 'update'], $adminAuth);
$router->get('/cities/{slug*}', [CityController::class, 'show']);

$router->get('/', [PageController::class, 'show']);
$router->get('/{slug*}', [PageController::class, 'show']);

$router->post('/contacts', [ContactController::class, 'submit']);

return $router;

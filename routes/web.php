<?php

use App\Core\Router;
use App\Controllers\ContactController;
use App\Controllers\PageController;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/', [PageController::class, 'show']);
$router->get('/{slug*}', [PageController::class, 'show']);

$router->post('/contacts', [ContactController::class, 'submit']);

// $router->get('/', [HomeController::class, 'index']);
// $router->get('/about', [HomeController::class, 'about']);
// $router->get('/privacy', [HomeController::class, 'privacy']);
// $router->get('/services/website-development', [HomeController::class, 'websiteDevelopment']);
// $router->get('/projects', [PortfolioController::class, 'projects']);
// $router->get('/contacts', [HomeController::class, 'contacts']);
// $router->post('/contacts', [ContactController::class, 'submit']);

// $router->get('/cities', [CityController::class, 'index']);
// $router->get('/cities/website-development-dupnica', [CityController::class, 'dupnica']);
// $router->get('/sofia/website-development-dupnica', [CityController::class, 'sofia']);

return $router;

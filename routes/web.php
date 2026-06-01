<?php

use App\Core\Router;

use App\Controllers\Api\UserController;
use App\Controllers\PageController;
use App\Controllers\OauthController;

use App\Middlewares\AuthMiddleware;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/oauth/authorize', [OauthController::class, 'authorize']);
$router->get('/api/user/me', [OauthController::class, 'me']);

$router->post('/oauth/approve', [OauthController::class, 'approve'], [AuthMiddleware::class]);
$router->post('/oauth/token', [OauthController::class, 'token']);

$router->get('/api/users', [UserController::class, 'getUsers']);

$router->get('/', [PageController::class, 'show']);
$router->get('/{slug*}', [PageController::class, 'show']);

return $router;

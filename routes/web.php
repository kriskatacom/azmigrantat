<?php

use App\Controllers\Api\TwoFAuthController;
use App\Controllers\CategoryController;
use App\Controllers\PostController;
use App\Core\Router;

use App\Controllers\Api\UserController;
use App\Controllers\PageController;
use App\Controllers\OauthController;

use App\Middlewares\AuthMiddleware;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/admin/categories', [CategoryController::class, 'index']);
$router->get('/admin/categories/create', [CategoryController::class, 'create']);
$router->post('/admin/categories/store', [CategoryController::class, 'store']);
$router->get('/admin/categories/edit/{id}', [CategoryController::class, 'edit']);
$router->post('/admin/categories/update/{id}', [CategoryController::class, 'update']);
$router->post('/admin/categories/toggle-active/{id}', [CategoryController::class, 'toggleActive']);
$router->post('/admin/categories/destroy/{id}', [CategoryController::class, 'destroy']);
$router->post('/admin/categories/restore/{id}', [CategoryController::class, 'restore']);

$router->get('/admin/posts', [PostController::class, 'index']);
$router->get('/admin/posts/create', [PostController::class, 'create']);
$router->post('/admin/posts/store', [PostController::class, 'store']);
$router->get('/admin/posts/edit/{id}', [PostController::class, 'edit']);
$router->post('/admin/posts/update/{id}', [PostController::class, 'update']);
$router->post('/admin/posts/delete/{id}', [PostController::class, 'delete']);
$router->post('/admin/posts/restore/{id}', [PostController::class, 'restore']);
$router->post('/admin/posts/force-delete/{id}', [PostController::class, 'forceDelete']);

$router->get('/oauth/authorize', [OauthController::class, 'authorize']);
$router->get('/api/user/me', [OauthController::class, 'me']);

$router->post('/oauth/approve', [OauthController::class, 'approve'], [AuthMiddleware::class]);
$router->post('/oauth/token', [OauthController::class, 'token']);

$router->get('/verify-email', [App\Controllers\UserController::class, 'verifyEmail']);

$router->post('/api/2fa/send', [TwoFAuthController::class, 'send2faCode'], [AuthMiddleware::class]);
$router->post('/api/2fa/verify', [TwoFAuthController::class, 'verify2faCode'], [AuthMiddleware::class]);

$router->get('/api/users', [UserController::class, 'getUsers']);

$router->get('/', [PageController::class, 'azmigrantat']);
$router->get('/{slug*}', [PageController::class, 'show']);

return $router;
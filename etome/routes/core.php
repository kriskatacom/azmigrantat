<?php

use App\Controllers\AdminController;
use App\Controllers\AuthController;
use App\Controllers\DevController;
use App\Middlewares\AdminMiddleware;
use App\Middlewares\AuthMiddleware;

$adminAuth = [AuthMiddleware::class, AdminMiddleware::class];

$router->get('/auth/login', [AuthController::class, 'redirectToProvider']);
$router->get('/auth/callback', [AuthController::class, 'callback']);

$router->post('/users/logout', [AuthController::class, 'logout']);

$router->get('/admin/dashboard', [AdminController::class, 'dashboard'], $adminAuth);
$router->post('/admin/sidebar-toggle', [AdminController::class, 'sidebarToggle'], $adminAuth);

$router->get('/admin/dev/structure', [DevController::class, 'showStructure'], $adminAuth);

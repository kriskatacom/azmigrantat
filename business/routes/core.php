<?php

use App\Controllers\AdminController;
use App\Controllers\CategoryController;
use App\Controllers\DevController;
use App\Controllers\InstallController;
use App\Controllers\MediaController;
use App\Controllers\SettingsController;
use App\Controllers\TranslationController;
use App\Middlewares\AdminMiddleware;
use App\Middlewares\AuthMiddleware;

$adminAuth = [AuthMiddleware::class, AdminMiddleware::class];

$router->get('/install', [InstallController::class, 'index']);
$router->post('/install', [InstallController::class, 'run']);
$router->get('/install/success', [InstallController::class, 'success']);

$router->get('/admin/dashboard', [AdminController::class, 'dashboard'], $adminAuth);
$router->post('/admin/sidebar-toggle', [AdminController::class, 'sidebarToggle'], $adminAuth);

$router->get('/admin/categories', [CategoryController::class, 'index'], $adminAuth);
$router->get('/admin/categories/create', [CategoryController::class, 'create'], $adminAuth);
$router->post('/admin/categories/store', [CategoryController::class, 'store'], $adminAuth);
$router->get('/admin/categories/edit/{id}', [CategoryController::class, 'edit'], $adminAuth);
$router->post('/admin/categories/update/{id}', [CategoryController::class, 'update'], $adminAuth);
$router->post('/admin/categories/delete/{id}', [CategoryController::class, 'delete'], $adminAuth);
$router->post('/admin/categories/restore/{id}', [CategoryController::class, 'restore'], $adminAuth);
$router->post('/admin/categories/force-delete/{id}', [CategoryController::class, 'forceDelete'], $adminAuth);

$router->get('/admin/translations', [TranslationController::class, 'index'], $adminAuth);
$router->get('/admin/translations/create', [TranslationController::class, 'create'], $adminAuth);
$router->post('/admin/translations/store', [TranslationController::class, 'store'], $adminAuth);
$router->get('/admin/translations/edit/{id}', [TranslationController::class, 'edit'], $adminAuth);
$router->post('/admin/translations/update/{id}', [TranslationController::class, 'update'], $adminAuth);
$router->post('/admin/translations/destroy/{id}', [TranslationController::class, 'destroy'], $adminAuth);
$router->get('/admin/translations/api/{lang}', [TranslationController::class, 'getJsonTranslations'], $adminAuth);

$router->post('/admin/ajax/upload', [MediaController::class, 'ajaxUpload'], $adminAuth);

$router->post('/admin/ui/save-state', [SettingsController::class, 'saveUiState'], [AuthMiddleware::class]);

$router->get('/admin/dev/structure', [DevController::class, 'showStructure'], $adminAuth);

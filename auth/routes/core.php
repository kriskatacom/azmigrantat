<?php

use App\Controllers\AdminController;
use App\Controllers\AdminEnvVariablesController;
use App\Controllers\AdminSettingsController;
use App\Controllers\InstallController;
use App\Controllers\StorageController;
use App\Controllers\UserController;
use App\Controllers\OauthAppController;
use App\Middlewares\AdminMiddleware;
use App\Middlewares\AuthMiddleware;
use App\Middlewares\GuestMiddleware;

$adminAuth = [AuthMiddleware::class, AdminMiddleware::class];

$router->get('/install', [InstallController::class, 'index']);
$router->post('/install', [InstallController::class, 'run']);
$router->get('/install/success', [InstallController::class, 'success']);

$router->get('/users/register', [UserController::class, 'registerForm'], [GuestMiddleware::class]);
$router->post('/users/register', [UserController::class, 'register'], [GuestMiddleware::class]);
$router->get('/users/login', [UserController::class, 'loginForm'], [GuestMiddleware::class]);
$router->post('/users/login', [UserController::class, 'authenticate'], [GuestMiddleware::class]);
$router->get('/users/forgot-password', [UserController::class, 'showForgotPassword'], [GuestMiddleware::class]);
$router->post('/users/forgot-password', [UserController::class, 'forgotPassword'], [GuestMiddleware::class]);
$router->get('/users/reset-password', [UserController::class, 'showResetPassword'], [GuestMiddleware::class]);
$router->post('/users/reset-password', [UserController::class, 'resetPassword'], [GuestMiddleware::class]);

$router->get('/users/profile', [UserController::class, 'profile'], [AuthMiddleware::class]);
$router->post('/users/profile/update', [UserController::class, 'profileUpdate'], [AuthMiddleware::class]);

$router->get('/users/logout', [UserController::class, 'logout'], [AuthMiddleware::class]);
$router->post('/users/logout', [UserController::class, 'logout'], [AuthMiddleware::class]);

$router->get('/admin/dashboard', [AdminController::class, 'dashboard'], $adminAuth);
$router->post('/admin/sidebar-toggle', [AdminController::class, 'sidebarToggle'], $adminAuth);
$router->get('/admin/settings', [AdminSettingsController::class, 'edit'], $adminAuth);
$router->post('/admin/settings', [AdminSettingsController::class, 'update'], $adminAuth);
$router->get('/admin/env-variables', [AdminEnvVariablesController::class, 'edit'], $adminAuth);
$router->post('/admin/env-variables', [AdminEnvVariablesController::class, 'update'], $adminAuth);

$router->get('/admin/users', [UserController::class, 'index'], $adminAuth);
$router->get('/admin/users/create', [UserController::class, 'create'], $adminAuth);
$router->post('/admin/users/store', [UserController::class, 'store'], $adminAuth);
$router->get('/admin/users/edit/{id}', [UserController::class, 'edit'], $adminAuth);
$router->post('/admin/users/update/{id}', [UserController::class, 'update'], $adminAuth);
$router->post('/admin/users/update-is-active/{id}', [UserController::class, 'updateIsActive'], $adminAuth);
$router->post('/admin/users/destroy/{id}', [UserController::class, 'destroy'], $adminAuth);
$router->post('/admin/users/restore/{id}', [UserController::class, 'restore'], $adminAuth);
$router->post('/admin/users/force-delete/{id}', [UserController::class, 'forceDelete'], $adminAuth);

// $router->get('/admin/media', [MediaController::class, 'index'], $adminAuth);
// $router->post('/admin/media/store', [MediaController::class, 'store'], $adminAuth);
// $router->post('/admin/media/delete/{id}', [MediaController::class, 'delete'], $adminAuth);
// $router->post('/admin/media/delete/{id}', [MediaController::class, 'delete'], $adminAuth);
// $router->post('/admin/media/force-delete/{id}', [MediaController::class, 'forceDelete'], $adminAuth);
// $router->post('/admin/media/restore/{id}', [MediaController::class, 'restore'], $adminAuth);
// $router->get('/admin/media/upload', [MediaController::class, 'upload'], $adminAuth);

$router->post('/admin/storage/ajax-upload', [StorageController::class, 'ajaxUpload'], [AuthMiddleware::class]);
$router->post('/admin/storage/ajax-delete', [StorageController::class, 'ajaxDelete'], [AuthMiddleware::class]);
$router->get('/admin/storage/file', [StorageController::class, 'getFile']);

// $router->get('/admin/pages', [PageController::class, 'index'], $adminAuth);
// $router->get('/admin/pages/create', [PageController::class, 'create'], $adminAuth);
// $router->post('/admin/pages/store', [PageController::class, 'store'], $adminAuth);
// $router->get('/admin/pages/edit/{id}', [PageController::class, 'edit'], $adminAuth);
// $router->post('/admin/pages/update/{id}', [PageController::class, 'update'], $adminAuth);
// $router->post('/admin/pages/delete/{id}', [PageController::class, 'delete'], $adminAuth);
// $router->post('/admin/pages/restore/{id}', [PageController::class, 'restore'], $adminAuth);
// $router->post('/admin/pages/force-delete/{id}', [PageController::class, 'forceDelete'], $adminAuth);

// $router->get('/admin/pages/elements/{id}', [PageElementController::class, 'elements'], $adminAuth);
// $router->post('/admin/pages/elements/update/{id}', [PageElementController::class, 'updateElements'], $adminAuth);
// $router->post('/admin/pages/elements/import/{id}', [PageElementController::class, 'import'], $adminAuth);
// $router->get('/admin/pages/elements/create/{id}', [PageElementController::class, 'createElement'], $adminAuth);
// $router->post('/admin/pages/elements/store/{id}', [PageElementController::class, 'storeElement'], $adminAuth);
// $router->get('/admin/pages/elements/edit-definition/{pageId}/{elementId}', [PageElementController::class, 'editElement'], $adminAuth);
// $router->post('/admin/pages/elements/update-definition/{pageId}/{elementId}', [PageElementController::class, 'updateElementDefinition'], $adminAuth);
// $router->post('/admin/pages/elements/delete/{pageId}/{elementId}', [PageElementController::class, 'deleteElement'], $adminAuth);
// $router->post('/admin/pages/elements/delete-section/{pageId}', [PageElementController::class, 'deleteSection'], $adminAuth);

// $router->get('/admin/menus', [MenuController::class, 'index'], $adminAuth);
// $router->get('/admin/menus/create', [MenuController::class, 'create'], $adminAuth);
// $router->post('/admin/menus/store', [MenuController::class, 'store'], $adminAuth);
// $router->get('/admin/menus/edit/{id}', [MenuController::class, 'edit'], $adminAuth);
// $router->post('/admin/menus/update/{id}', [MenuController::class, 'update'], $adminAuth);
// $router->get('/admin/menus/structure/{id}', [MenuController::class, 'structure'], $adminAuth);
// $router->post('/admin/menus/add-item/{id}', [MenuController::class, 'addItem'], $adminAuth);
// $router->post('/admin/menus/update-item', [MenuController::class, 'updateItem'], $adminAuth);
// $router->post('/admin/menus/reorder-items', [MenuController::class, 'reorderItems']);
// $router->post('/admin/menus/delete/{id}', [MenuController::class, 'delete'], $adminAuth);
// $router->post('/admin/menus/restore/{id}', [MenuController::class, 'restore'], $adminAuth);
// $router->post('/admin/menus/force-delete/{id}', [MenuController::class, 'forceDelete'], $adminAuth);
// $router->post('/admin/menus/delete-item/{id}', [MenuController::class, 'deleteItem'], $adminAuth);

// $router->get('/admin/redirects', [RedirectController::class, 'index'], $adminAuth);
// $router->get('/admin/redirects/create', [RedirectController::class, 'create'], $adminAuth);
// $router->post('/admin/redirects/store', [RedirectController::class, 'store'], $adminAuth);
// $router->get('/admin/redirects/edit/{id}', [RedirectController::class, 'edit'], $adminAuth);
// $router->post('/admin/redirects/update/{id}', [RedirectController::class, 'update'], $adminAuth);
// $router->post('/admin/redirects/reset-stats/{id}', [RedirectController::class, 'resetStats'], $adminAuth);
// $router->post('/admin/redirects/delete/{id}', [RedirectController::class, 'delete'], $adminAuth);
// $router->post('/admin/redirects/restore/{id}', [RedirectController::class, 'restore'], $adminAuth);
// $router->post('/admin/redirects/force-delete/{id}', [RedirectController::class, 'forceDelete'], $adminAuth);

$router->get('/admin/oauth-apps', [OauthAppController::class, 'index'], [AdminMiddleware::class]);
$router->get('/admin/oauth-apps/create', [OauthAppController::class, 'create'], [AdminMiddleware::class]);
$router->post('/admin/oauth-apps/store', [OauthAppController::class, 'store'], [AdminMiddleware::class]);
$router->get('/admin/oauth-apps/edit/{id}', [OauthAppController::class, 'edit'], [AdminMiddleware::class]);
$router->post('/admin/oauth-apps/update/{id}', [OauthAppController::class, 'update'], [AdminMiddleware::class]);
$router->post('/admin/oauth-apps/delete/{id}', [OauthAppController::class, 'delete'], [AdminMiddleware::class]);
$router->post('/admin/oauth-apps/restore/{id}', [OauthAppController::class, 'restore'], [AdminMiddleware::class]);
$router->post('/admin/oauth-apps/force-delete/{id}', [OauthAppController::class, 'forceDelete'], [AdminMiddleware::class]);

// $router->get('/admin/translations', [TranslationController::class, 'index'], $adminAuth);
// $router->get('/admin/translations/create', [TranslationController::class, 'create'], $adminAuth);
// $router->post('/admin/translations/store', [TranslationController::class, 'store'], $adminAuth);
// $router->get('/admin/translations/edit/{id}', [TranslationController::class, 'edit'], $adminAuth);
// $router->post('/admin/translations/update/{id}', [TranslationController::class, 'update'], $adminAuth);
// $router->post('/admin/translations/destroy/{id}', [TranslationController::class, 'destroy'], $adminAuth);
// $router->get('/admin/translations/api/{lang}', [TranslationController::class, 'getJsonTranslations'], $adminAuth);
<?php

use App\Controllers\AdminController;
use App\Controllers\ArticleController;
use App\Controllers\CategoryController;
use App\Controllers\DevController;
use App\Controllers\InstallController;
use App\Controllers\MediaController;
use App\Controllers\PageController;
use App\Controllers\PageElementController;
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

// $router->get('/admin/media', [MediaController::class, 'index'], $adminAuth);
// $router->post('/admin/media/store', [MediaController::class, 'store'], $adminAuth);
// $router->post('/admin/media/delete/{id}', [MediaController::class, 'delete'], $adminAuth);
// $router->post('/admin/media/delete/{id}', [MediaController::class, 'delete'], $adminAuth);
// $router->post('/admin/media/force-delete/{id}', [MediaController::class, 'forceDelete'], $adminAuth);
// $router->post('/admin/media/restore/{id}', [MediaController::class, 'restore'], $adminAuth);
// $router->get('/admin/media/upload', [MediaController::class, 'upload'], $adminAuth);

$router->get('/admin/pages', [PageController::class, 'index'], $adminAuth);
$router->get('/admin/pages/create', [PageController::class, 'create'], $adminAuth);
$router->post('/admin/pages/store', [PageController::class, 'store'], $adminAuth);
$router->get('/admin/pages/edit/{id}', [PageController::class, 'edit'], $adminAuth);
$router->post('/admin/pages/update/{id}', [PageController::class, 'update'], $adminAuth);
$router->post('/admin/pages/delete/{id}', [PageController::class, 'delete'], $adminAuth);
$router->post('/admin/pages/restore/{id}', [PageController::class, 'restore'], $adminAuth);
$router->post('/admin/pages/force-delete/{id}', [PageController::class, 'forceDelete'], $adminAuth);

$router->get('/admin/pages/elements/{id}', [PageElementController::class, 'elements'], $adminAuth);
$router->post('/admin/pages/elements/update/{id}', [PageElementController::class, 'updateElements'], $adminAuth);
$router->post('/admin/pages/elements/import/{id}', [PageElementController::class, 'import'], $adminAuth);
$router->get('/admin/pages/elements/create/{id}', [PageElementController::class, 'createElement'], $adminAuth);
$router->post('/admin/pages/elements/store/{id}', [PageElementController::class, 'storeElement'], $adminAuth);
$router->get('/admin/pages/elements/edit-definition/{pageId}/{elementId}', [PageElementController::class, 'editElement'], $adminAuth);
$router->post('/admin/pages/elements/update-definition/{pageId}/{elementId}', [PageElementController::class, 'updateElementDefinition'], $adminAuth);
$router->post('/admin/pages/elements/delete/{pageId}/{elementId}', [PageElementController::class, 'deleteElement'], $adminAuth);
$router->post('/admin/pages/elements/delete-section/{pageId}', [PageElementController::class, 'deleteSection'], $adminAuth);

// Статии
$router->get('/admin/articles', [ArticleController::class, 'index'], $adminAuth);
$router->get('/admin/articles/create', [ArticleController::class, 'create'], $adminAuth);
$router->post('/admin/articles/store', [ArticleController::class, 'store'], $adminAuth);
$router->get('/admin/articles/edit/{id}', [ArticleController::class, 'edit'], $adminAuth);
$router->post('/admin/articles/update/{id}', [ArticleController::class, 'update'], $adminAuth);
$router->post('/admin/articles/delete/{id}', [ArticleController::class, 'delete'], $adminAuth);
$router->post('/admin/articles/restore/{id}', [ArticleController::class, 'restore'], $adminAuth);
$router->post('/admin/articles/force-delete/{id}', [ArticleController::class, 'forceDelete'], $adminAuth);

$router->get('/admin/categories', [CategoryController::class, 'index'], $adminAuth);
$router->get('/admin/categories/create', [CategoryController::class, 'create'], $adminAuth);
$router->post('/admin/categories/store', [CategoryController::class, 'store'], $adminAuth);
$router->get('/admin/categories/edit/{id}', [CategoryController::class, 'edit'], $adminAuth);
$router->post('/admin/categories/update/{id}', [CategoryController::class, 'update'], $adminAuth);
$router->post('/admin/categories/delete/{id}', [CategoryController::class, 'delete'], $adminAuth);
$router->post('/admin/categories/restore/{id}', [CategoryController::class, 'restore'], $adminAuth);
$router->post('/admin/categories/force-delete/{id}', [CategoryController::class, 'forceDelete'], $adminAuth);

// $router->get('/admin/tags', [TagController::class, 'index'], $adminAuth);
// $router->post('/admin/tags/store', [TagController::class, 'store'], $adminAuth);
// $router->post('/admin/tags/update/{id}', [TagController::class, 'update'], $adminAuth);
// $router->post('/admin/tags/delete/{id}', [TagController::class, 'delete'], $adminAuth);

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

// $router->get('/admin/galleries', [GalleryController::class, 'index'], $adminAuth);
// $router->get('/admin/galleries/create', [GalleryController::class, 'create'], $adminAuth);
// $router->post('/admin/galleries/store', [GalleryController::class, 'store'], $adminAuth);
// $router->get('/admin/galleries/edit/{id}', [GalleryController::class, 'edit'], $adminAuth);
// $router->post('/admin/galleries/update/{id}', [GalleryController::class, 'update'], $adminAuth);
// $router->post('/admin/galleries/detach/{galleryId}/{mediaId}', [GalleryController::class, 'detachMedia'], $adminAuth);
// $router->post('/admin/galleries/clear/{id}', [GalleryController::class, 'clearGallery'], $adminAuth);
// $router->post('/admin/galleries/delete/{id}', [GalleryController::class, 'delete'], $adminAuth);
// $router->post('/admin/galleries/restore/{id}', [GalleryController::class, 'restore'], $adminAuth);
// $router->post('/admin/galleries/force-delete/{id}', [GalleryController::class, 'forceDelete'], $adminAuth);

// $router->get('/admin/redirects', [RedirectController::class, 'index'], $adminAuth);
// $router->get('/admin/redirects/create', [RedirectController::class, 'create'], $adminAuth);
// $router->post('/admin/redirects/store', [RedirectController::class, 'store'], $adminAuth);
// $router->get('/admin/redirects/edit/{id}', [RedirectController::class, 'edit'], $adminAuth);
// $router->post('/admin/redirects/update/{id}', [RedirectController::class, 'update'], $adminAuth);
// $router->post('/admin/redirects/reset-stats/{id}', [RedirectController::class, 'resetStats'], $adminAuth);
// $router->post('/admin/redirects/delete/{id}', [RedirectController::class, 'delete'], $adminAuth);
// $router->post('/admin/redirects/restore/{id}', [RedirectController::class, 'restore'], $adminAuth);
// $router->post('/admin/redirects/force-delete/{id}', [RedirectController::class, 'forceDelete'], $adminAuth);

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

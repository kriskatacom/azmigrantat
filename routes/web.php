<?php

use App\Controllers\BusinessCategoryController;
use App\Controllers\CategoryController;
use App\Core\Router;
use App\Controllers\ContactController;
use App\Controllers\PageController;
use App\Controllers\CityController;
use App\Controllers\CompanyAdController;
use App\Controllers\CompanyController;
use App\Controllers\CompanyServiceController;

$router = new Router();

require_once __DIR__ . '/core.php';

$router->get('/cities/search', [CityController::class, 'search']);

// Административни рутове за градове
$router->get('/admin/cities', [CityController::class, 'index'], $adminAuth);
$router->get('/admin/cities/create', [CityController::class, 'create'], $adminAuth);
$router->post('/admin/cities/store', [CityController::class, 'store'], $adminAuth);
$router->get('/admin/cities/edit/{id}', [CityController::class, 'edit'], $adminAuth);
$router->post('/admin/cities/delete/{id}', [CityController::class, 'delete'], $adminAuth);
$router->post('/admin/cities/restore/{id}', [CityController::class, 'restore'], $adminAuth);
$router->post('/admin/cities/update/{id}', [CityController::class, 'update'], $adminAuth);

// Административни рутове за компании
$router->get('/admin/companies', [CompanyController::class, 'index'], $adminAuth);
$router->get('/admin/companies/create', [CompanyController::class, 'create'], $adminAuth);
$router->post('/admin/companies/store', [CompanyController::class, 'store'], $adminAuth);
$router->get('/admin/companies/edit/{id}', [CompanyController::class, 'edit'], $adminAuth);
$router->post('/admin/companies/delete/{id}', [CompanyController::class, 'delete'], $adminAuth);
$router->post('/admin/companies/restore/{id}', [CompanyController::class, 'restore'], $adminAuth);
$router->post('/admin/companies/update/{id}', [CompanyController::class, 'update'], $adminAuth);

// Административни рутове за услуги (Company Services)
$router->get('/admin/companies/{companyId}/services', [CompanyServiceController::class, 'index'], $adminAuth);
$router->get('/admin/companies/{companyId}/services/create', [CompanyServiceController::class, 'create'], $adminAuth);
$router->post('/admin/services/store/{companyId}', [CompanyServiceController::class, 'store'], $adminAuth); // Съвпада с action във формата
$router->get('/admin/services/edit/{id}', [CompanyServiceController::class, 'edit'], $adminAuth);
$router->post('/admin/services/update/{id}', [CompanyServiceController::class, 'update'], $adminAuth);
$router->post('/admin/services/delete/{id}', [CompanyServiceController::class, 'delete'], $adminAuth);
$router->post('/admin/services/restore/{id}', [CompanyServiceController::class, 'restore'], $adminAuth);
$router->post('/admin/services/force-delete/{id}', [CompanyServiceController::class, 'forceDelete'], $adminAuth);
$router->post('/admin/services/toggle-status/{id}', [CompanyServiceController::class, 'toggleStatus'], $adminAuth);

// Административни рутове за обяви (Company Ads)
$router->get('/admin/companies/{companyId}/ads', [CompanyAdController::class, 'index'], $adminAuth);
$router->get('/admin/companies/{companyId}/ads/create', [CompanyAdController::class, 'create'], $adminAuth);
$router->post('/admin/ads/store/{companyId}', [CompanyAdController::class, 'store'], $adminAuth);
$router->get('/admin/ads/edit/{id}', [CompanyAdController::class, 'edit'], $adminAuth);
$router->post('/admin/ads/update/{id}', [CompanyAdController::class, 'update'], $adminAuth);
$router->post('/admin/ads/delete/{id}', [CompanyAdController::class, 'delete'], $adminAuth);
$router->post('/admin/ads/restore/{id}', [CompanyAdController::class, 'restore'], $adminAuth);
$router->post('/admin/ads/force-delete/{id}', [CompanyAdController::class, 'forceDelete'], $adminAuth);
$router->post('/admin/ads/toggle-status/{id}', [CompanyAdController::class, 'toggleStatus'], $adminAuth);

// Бизнес категории
$router->get('/admin/business-categories', [BusinessCategoryController::class, 'index']);
$router->get('/admin/business-categories/create', [BusinessCategoryController::class, 'create']);
$router->post('/admin/business-categories/store', [BusinessCategoryController::class, 'store']);
$router->get('/admin/business-categories/edit/{id}', [BusinessCategoryController::class, 'edit']);
$router->post('/admin/business-categories/update/{id}', [BusinessCategoryController::class, 'update']);
$router->post('/admin/business-categories/delete/{id}', [BusinessCategoryController::class, 'delete']);
$router->post('/admin/business-categories/restore/{id}', [BusinessCategoryController::class, 'restore']);
$router->post('/admin/business-categories/force-delete/{id}', [BusinessCategoryController::class, 'forceDelete']);

// Публични рутове
$router->get('/cities/{city_slug*}/categories/{cat_slug*}/company/{slug}', [CompanyController::class, 'show']);
$router->get('/cities/{city_slug*}/categories/{cat_slug*}', [CategoryController::class, 'showByCity']);
$router->get('/cities/{slug*}', [CityController::class, 'show']);

$router->get('/', [PageController::class, 'show']);
$router->get('/{slug*}', [PageController::class, 'show']);

$router->post('/contacts', [ContactController::class, 'submit']);

return $router;

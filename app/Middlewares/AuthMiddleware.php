<?php

namespace App\Middlewares;

use App\Helpers\AuthHelper;
use App\Core\Session;

class AuthMiddleware
{
    public function handle(): void
    {
        if (!AuthHelper::check()) {
            $currentPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
            $fullPath = $currentPath . ($queryString ? '?' . $queryString : '');
            
            Session::setFlash('error', 'Трябва да сте влезли в профила си, за да видите тази страница.');
            
            header('Location: /users/login?return_to=' . urlencode($fullPath));
            exit;
        }
    }
}

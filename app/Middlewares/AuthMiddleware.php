<?php

namespace App\Middlewares;

use App\Services\UserService;
use App\Core\Session;

class AuthMiddleware
{
    protected UserService $userService;

    public function __construct()
    {
        $this->userService = new UserService();
    }

    public function handle(): void
    {
        $user = $this->userService->getCurrentUser();

        if (!$user) {
            $currentPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            
            $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
            $fullPath = $currentPath . ($queryString ? '?' . $queryString : '');
            
            Session::setFlash('error', 'Трябва да сте влезли в профила си, за да видите тази страница.');
            
            header('Location: /users/login?return_to' . urlencode($fullPath));
            exit;
        }
    }
}

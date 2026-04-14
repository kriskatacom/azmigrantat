<?php

namespace App\Middlewares;

use App\Services\UserService;

class GuestMiddleware
{
    protected UserService $userService;

    public function __construct()
    {
        $this->userService = new UserService();
    }

    public function handle(): void
    {
        if ($this->userService->isLoggedIn()) {
            header('Location: /users/profile');
            exit;
        }
    }
}

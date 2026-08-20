<?php

namespace App\Middlewares;

use App\Helpers\AuthHelper;

class GuestMiddleware
{
    public function handle(): void
    {
        if (AuthHelper::check()) {
            header('Location: /users/profile');
            exit;
        }
    }
}

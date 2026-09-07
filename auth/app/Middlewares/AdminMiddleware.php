<?php

namespace App\Middlewares;

use App\Helpers\AuthHelper;
use App\Core\Session;

class AdminMiddleware
{
    public function handle(): void
    {
        if (!AuthHelper::check() || !AuthHelper::isAdmin()) {
            Session::setFlash('error', 'Нямате необходимите права за достъп до тази зона.');

            if (!AuthHelper::check()) {
                header('Location: /users/login');
            } else {
                header('Location: /users/profile');
            }
            exit;
        }
    }
}

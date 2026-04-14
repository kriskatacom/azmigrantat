<?php

namespace App\Middlewares;

use App\Services\UserService;
use App\Core\Session;
use App\Models\User;

class AdminMiddleware
{
    protected UserService $userService;

    public function __construct()
    {
        $this->userService = new UserService();
    }

    public function handle(): void
    {
        $user = $this->userService->getCurrentUser();

        if (!$user || $user->role !== User::ROLE_ADMIN) {
            Session::setFlash('error', 'Нямате необходимите права за достъп до тази зона.');

            header('Location: /users/profile');
            exit;
        }
    }
}

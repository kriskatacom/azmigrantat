<?php

namespace App\Controllers\Api;

use App\Models\User;

class UserController extends BaseApiController
{
    public function getUsers()
    {
        // if (!$this->isAuthorizedRequest()) {
        //     return $this->json(['success' => false, 'message' => 'Unauthorized'], 401);
        // }

        $limit = (int) ($_GET['limit'] ?? 100);
        $tab = $_GET['tab'] ?? 'all';

        $query = User::query();

        if ($tab === 'active') {
            $query->where('is_active', 1);
        } elseif ($tab === 'inactive') {
            $query->where('is_active', 0);
        }

        $users = $query->select(['id', 'name', 'email', 'role', 'is_active'])
            ->limit($limit)
            ->get();

        return $this->json([
            'success' => true,
            'count' => count($users),
            'data' => $users
        ]);
    }
}
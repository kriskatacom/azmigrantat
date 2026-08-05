<?php

namespace App\Controllers\Api;

use App\Models\Post;
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

    public function getAccount()
    {
        $userId = $_GET['id'] ?? null;

        if ($userId !== null && $userId !== '') {
            $user = User::find($userId);
        } else {
            $user = $_SESSION['user'] ?? null;
        }

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $posts = Post::where('user_id', $userId)->orderBy('created_at', 'DESC')->get();

        $postsArray = is_object($posts) ? $posts->toArray() : $posts;

        foreach ($postsArray as &$post) {
            if (isset($post['options']) && is_string($post['options'])) {
                $post['options'] = json_decode($post['options'], true);
            }
        }

        return $this->json([
            'user' => $user,
            'posts' => $postsArray
        ]);
    }
}
<?php

namespace App\Controllers\Api;

use App\Models\Post;
use App\Models\User;
use App\Models\OauthAccessToken;

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

    public function search()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->json([
                'success' => false,
                'message' => 'Необходима е автентикация.',
            ], 401);
        }

        $search = trim($_GET['search'] ?? '');

        if ($search === '') {
            return $this->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $users = User::query()
            ->where('is_active', true)
            ->where(function ($query) use ($search) {
                $query
                    ->where('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('username', 'LIKE', '%' . $search . '%');
            })
            ->orderBy('name')
            ->limit(20)
            ->get();

        return $this->json([
            'success' => true,
            'data' => $users
                ->map(fn(User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'profile_image' => $user->profile_image_url,
                    'is_active' => (bool) $user->is_active,
                ])
                ->values(),
        ]);
    }

    private function authenticatedUser(): ?User
    {
        $authorization =
            $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::query()
            ->where('token', $matches[1])
            ->with('user')
            ->first();

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }
}

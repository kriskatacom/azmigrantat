<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\Category;
use App\Models\Post;
use App\Models\User;
use App\Modules\Str;
use App\Helpers\AuthHelper;
use App\Traits\HasAdminTrait;
use Exception;

class PostController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        $query = Post::query();

        if (!Auth::isAdmin()) {
            $query->where('user_id', Auth::id());
        }

        return $this->resourceIndex($query, 'admin/posts/index', [
            'title' => 'Управление на публикации',
            'resource_name' => 'posts',
            'search_fields' => ['name', 'content', 'location'],
            'order_by' => 'created_at',
            'order_dir' => 'desc',
            'columns' => ['name', 'client_id', 'redirect_uri', 'is_active', 'created_at']
        ]);
    }

    public function create()
    {
        return $this->renderWithLayout('admin/posts/form', [
            'title' => 'Нова публикация'
        ], [
            'post' => new Post(),
            'currentUser' => Auth::user(),
            'isEdit' => false
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $data = $this->prepareData();
        if ($data === null) {
            return $this->redirectBack();
        }

        $data['user_id'] = AuthHelper::id();

        if (isset($data['options']) && is_array($data['options'])) {
            $data['options'] = json_encode($data['options'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            $data['options'] = json_encode([], JSON_UNESCAPED_SLASHES);
        }

        $post = Post::create($data);

        $this->flash('success', 'Публикацията беше създадена успешно!');
        $this->redirect("/admin/posts/edit/{$post->id}");
    }

    public function edit($id)
    {
        $post = Post::findOrFail((int) $id);

        $categories = Category::all();
        $categoryOptions = [];
        foreach ($categories as $category) {
            $categoryOptions[$category->id] = $category->name;
        }

        $post->options = is_string($post->options) ? json_decode($post->options, true) : ($post->options ?? []);

        return $this->renderWithLayout('admin/posts/form', [
            'title' => "Редактиране: {$post->name}"
        ], [
            'post' => $post,
            'isEdit' => true,
            'categoryOptions' => $categoryOptions
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $post = Post::findOrFail((int) $id);

        $data = $this->prepareData($post);
        if ($data === null) {
            return $this->redirectBack();
        }

        if (isset($data['options']) && is_array($data['options'])) {
            $data['options'] = json_encode($data['options'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            $data['options'] = json_encode([], JSON_UNESCAPED_SLASHES);
        }

        $post->update($data);

        $this->flash('success', 'Промените бяха запазени успешно!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $post = Post::findOrFail((int) $id);
            $post->delete();
            $this->flash('info', 'Публикацията беше преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Публикацията не беше намерена.');
        }

        return $this->redirect("/admin/posts?tab=active");
    }

    public function restore($id)
    {
        $post = Post::onlyTrashed()->findOrFail((int) $id);
        $post->restore();

        $post->is_active = 0;
        $post->save();

        $this->flash('success', 'Публикацията беше възстановена успешно като деактивирана.');
        return $this->redirect("/admin/posts?tab=trash");
    }

    public function forceDelete($id)
    {
        $post = Post::onlyTrashed()->findOrFail((int) $id);

        $post->forceDelete();
        $this->flash('info', 'Публикацията беше изтрита завинаги.');
        return $this->redirect("/admin/posts?tab=trash");
    }

    private function prepareData(?Post $post = null): ?array
    {
        $data = [
            'name' => $_POST['name'],
            'location' => $_POST['location'] ?? null,
            'content' => $_POST['content'],
            'images' => $_POST['images'] ?? [],
            'video_url' => $_POST['video_url'] ?? [],
            'options' => $_POST['options'] ?? [],
            'category_id' => $_POST['category_id'] ?: null,
            'is_active' => isset($_POST['is_active']) ? 1 : 0,
        ];

        $nameChanged = !$post || ($post->name !== $data['name']);
        if ($nameChanged) {
            $slug = Str::slug($data['name']);
            $query = Post::where('slug', 'like', "{$slug}%");

            if ($post) {
                $query->where('id', '!=', $post->id);
            }

            $count = $query->count();
            if ($count > 0) {
                $slug = $slug . '-' . ($count + 1);
            }
            $data['slug'] = $slug;
        }

        return $data;
    }

    // Api methods

    public function getPosts()
    {
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = 5;
        $offset = ($page - 1) * $limit;

        $query = Post::with('user');

        if (!empty($_GET['location'])) {
            $location = trim($_GET['location']);
            $query->where('location', $location);
        }

        if (!empty($_GET['category_id'])) {
            $categoryId = (int) $_GET['category_id'];
            $query->where('category_id', $categoryId);
        }

        if (!empty($_GET['search'])) {
            $search = trim($_GET['search']);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('content', 'LIKE', '%' . $search . '%');
            });
        }

        $posts = $query->orderBy('created_at', 'DESC')
            ->skip($offset)
            ->take($limit)
            ->get();

        return $this->json([
            'posts' => $posts
        ]);
    }

    public function getUserPosts($userId)
    {
        if (empty($userId)) {
            return $this->json(['error' => 'User ID is required'], 400);
        }

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = 6;
        $offset = ($page - 1) * $limit;

        $posts = Post::where('user_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->skip($offset)
            ->take($limit)
            ->get();

        return $this->json([
            'posts' => $posts
        ]);
    }

    public function getPost($id)
    {
        if (empty($id)) {
            return $this->json(['error' => 'Post ID is required'], 400);
        }

        $post = Post::with('user')->find($id);

        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $postArray = is_object($post) ? $post->toArray() : $post;

        if (empty($postArray['user']) && !empty($postArray['user_id'])) {
            $user = User::find($postArray['user_id']);
            $postArray['user'] = $user ? (is_object($user) ? $user->toArray() : $user) : null;
        }

        if (isset($postArray['options']) && is_string($postArray['options'])) {
            $postArray['options'] = json_decode($postArray['options'], true);
        }

        return $this->json([
            'post' => $postArray
        ]);
    }
}

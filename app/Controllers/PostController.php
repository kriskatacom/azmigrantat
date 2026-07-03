<?php

namespace App\Controllers;

use App\Models\Category;
use App\Models\Post;
use App\Modules\Str;
use App\Helpers\AuthHelper;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class PostController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        $currentTab = $_GET['tab'] ?? 'active';
        $search = $_GET['search'] ?? '';

        $query = Post::query()->with('user');

        if ($currentTab === 'trash') {
            $query->onlyTrashed();
        }

        $posts = $this->paginateQuery($query, ['name', 'content', 'location']);

        $seoData = [
            'title' => 'Управление на публикации | Админ панел',
            'description' => 'Преглед, редактиране и изтриване на публикации.'
        ];

        return $this->renderWithLayout('admin/posts/index', $seoData, [
            'posts' => $posts,
            'currentTab' => $currentTab,
            'search' => $search
        ]);
    }

    public function create()
    {
        return $this->renderWithLayout('admin/posts/form', [
            'title' => 'Нова публикация'
        ], [
            'post' => new Post(),
            'isEdit' => false
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $validator = Validator::make($_POST, [
            'name' => 'required|min:3|max:255',
            'location' => 'nullable|max:255',
            'content' => 'required|min:10',
        ], [
            'name.required' => 'Заглавието е задължително.',
            'name.min' => 'Заглавието трябва да е поне 3 символа.',
            'content.required' => 'Съдържанието е задължително.',
            'content.min' => 'Съдържанието трябва да е поне 10 символа.'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $slug = Str::slug($_POST['name']);
        
        $count = Post::where('slug', 'like', "{$slug}%")->count();
        if ($count > 0) {
            $slug = $slug . '-' . ($count + 1);
        }

        $post = Post::create([
            'name' => $_POST['name'],
            'slug' => $slug,
            'location' => $_POST['location'] ?? null,
            'content' => $_POST['content'],
            'images' => $_POST['images'] ?? [],
            'user_id' => AuthHelper::id(),
            'category_id' => $_POST['category_id'] ?: null
        ]);

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

        $validator = Validator::make($_POST, [
            'name' => 'required|min:3|max:255',
            'location' => 'nullable|max:255',
            'content' => 'required|min:10',
        ], [
            'name.required' => 'Заглавието е задължително.',
            'content.required' => 'Съдържанието е задължително.'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        if ($post->name !== $_POST['name']) {
            $slug = Str::slug($_POST['name']);
            $count = Post::where('slug', 'like', "{$slug}%")->where('id', '!=', $post->id)->count();
            if ($count > 0) {
                $slug = $slug . '-' . ($count + 1);
            }
            $post->slug = $slug;
        }

        $post->images = $_POST['images'] ?? [];

        $post->name = $_POST['name'];
        $post->location = $_POST['location'] ?? null;
        $post->content = $_POST['content'];
        $post->category_id = $_POST['category_id'] ?: null;
        $post->save();

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
        Post::onlyTrashed()->findOrFail((int) $id)->restore();
        $this->flash('success', 'Публикацията беше възстановена успешно.');
        return $this->redirect("/admin/posts?tab=trash");
    }

    public function forceDelete($id)
    {
        $post = Post::onlyTrashed()->findOrFail((int) $id);
        
        $post->forceDelete();
        $this->flash('info', 'Публикацията беше изтрита завинаги.');
        return $this->redirect("/admin/posts?tab=trash");
    }
}

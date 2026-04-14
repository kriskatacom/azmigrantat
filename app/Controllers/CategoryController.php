<?php

namespace App\Controllers;

use App\Models\Category;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class CategoryController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(Category::class, 'admin/categories/index', [
            'title'         => 'Управление на категории',
            'resource_name' => 'categories',
            'search_fields' => ['name', 'slug'],
            'order_by'      => 'sort_order'
        ]);
    }

    public function create()
    {
        $this->renderAdmin('admin/categories/form', ['title' => 'Нова категория'], [
            'category' => new Category()
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:categories,slug'
        ];

        $messages = [
            'name.required' => 'Името на категорията е задължително.',
            'slug.unique'   => 'Този слаг вече съществува.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;
        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
        $data['sort_order'] = (int)($data['sort_order'] ?? 0);

        $category = new Category();
        $this->updateResource($category, $data, ['image']);

        $this->flash('success', 'Категорията е създадена!');
        $this->redirect("/admin/categories/edit/{$category->id}");
    }

    public function edit($id)
    {
        $category = Category::findOrFail($id);

        $this->renderAdmin('admin/categories/form', ['title' => 'Редакция: ' . $category->name], [
            'category' => $category
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $category = Category::findOrFail($id);

        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:categories,slug,' . $category->id
        ];

        $messages = [
            'name.required' => 'Името е задължително.',
            'slug.unique'   => 'Този слаг вече се използва от друга категория.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;
        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
        $data['sort_order'] = (int)($data['sort_order'] ?? 0);

        $this->updateResource($category, $data, ['image']);

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $item = Category::findOrFail($id);

            if ($item->articles()->count() > 0) {
                $this->flash('error', 'Не може да изтриете категория, която съдържа статии.');
                return $this->redirectBack();
            }

            $item->delete();
            $this->flash('info', 'Категорията беше преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Категорията не може да бъде намерена.');
        }

        return $this->redirectTrashOrIndex(Category::class, 'categories');
    }

    public function restore($id)
    {
        $item = Category::onlyTrashed()->findOrFail($id);
        $item->restore();

        $this->flash('info', 'Категорията беше възстановена успешно.');
        return $this->redirectTrashOrIndex(Category::class, 'categories');
    }

    public function forceDelete($id)
    {
        try {
            $item = Category::onlyTrashed()->findOrFail($id);
            $item->forceDelete();
            $this->flash('info', 'Категорията беше изтрита завинаги.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при окончателно изтриване.');
        }

        return $this->redirectTrashOrIndex(Category::class, 'categories');
    }
}
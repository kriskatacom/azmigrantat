<?php

namespace App\Controllers;

use App\Models\Category;
use App\Modules\Str;
use Schema;

class CategoryController extends BaseController
{
    public function index()
    {
        $tab = $_GET['tab'] ?? 'active';
        $parentId = $_GET['parent_id'] ?? null;
        $search = $_GET['search'] ?? '';

        $sortField = $_GET['sort'] ?? '';
        $sortDirection = $_GET['direction'] ?? 'asc';

        $query = Category::withTrashed()->with([
            'children' => function ($query) {
                $query->withTrashed();
            }
        ]);

        if (!empty($search)) {
            $query->where('name', 'like', "%{$search}%");
        } else {
            if ($parentId !== null && $parentId !== '') {
                $query->where('parent_id', $parentId);
            } else {
                $query->whereNull('parent_id');
            }
        }

        $allCategories = $query->get();

        $filtered = $allCategories->filter(function ($category) use ($tab) {
            return $category->matchesTab($tab);
        });

        if (!empty($sortField)) {
            if (strtolower($sortDirection) === 'desc') {
                $filtered = $filtered->sortByDesc($sortField);
            } else {
                $filtered = $filtered->sortBy($sortField);
            }
        }
        // ----------------------------------------

        $currentPage = \Illuminate\Pagination\LengthAwarePaginator::resolveCurrentPage();
        $perPage = 15;
        $items = $filtered->forPage($currentPage, $perPage);

        $categories = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $filtered->count(),
            $perPage,
            $currentPage,
            ['path' => \Illuminate\Pagination\Paginator::resolveCurrentPath()]
        );

        $categories->appends($_GET);

        $currentParentModel = $parentId ? Category::withTrashed()->find($parentId) : null;

        $this->renderWithLayout('admin/categories/index', [
            'title' => 'Категории'
        ], [
            'categories' => $categories,
            'currentParent' => $parentId,
            'currentParentModel' => $currentParentModel,
            'tab' => $tab,
            'search' => $search
        ]);
    }

    public function create()
    {
        $this->renderWithLayout('admin/categories/form', [
            'title' => 'Нова категория'
        ], [
            'category' => new Category()
        ]);
    }

    public function store()
    {
        $data = $this->prepareData($_POST, $_FILES);

        Category::create($data);

        $this->flash('success', 'Категорията беше създадена успешно!');

        return $this->redirect('/admin/categories');
    }

    public function edit($id)
    {
        $category = Category::findOrFail($id);

        $this->renderWithLayout('admin/categories/form', [
            'title' => 'Редактиране на категория: ' . $category->name
        ], [
            'category' => $category
        ]);
    }

    public function update($id)
    {
        $category = Category::findOrFail($id);

        $data = $this->prepareData($_POST, $_FILES, $id);

        $category->update($data);

        $this->flash('success', 'Категорията беше редактирана успешно!');

        return $this->redirect('/admin/categories/edit/' . $id);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        $category->delete();

        $this->flash('success', 'Категорията беше преместена в кошчето.');
        return $this->redirect('/admin/categories');
    }

    public function restore($id)
    {
        $category = Category::withTrashed()->findOrFail($id);

        $category->restore();

        $this->flash('success', 'Категорията беше възстановена успешно.');
        return $this->redirect('/admin/categories?tab=trash');
    }

    private function prepareData(array $data, array $files, ?int $ignoreId = null): array
    {
        $data['slug'] = Str::slug($data['slug'] ?: $data['name']);

        $originalSlug = $data['slug'];
        $count = 1;
        $query = Category::where('slug', $data['slug']);
        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        while ($query->withTrashed()->exists()) {
            $data['slug'] = $originalSlug . '-' . $count++;
            $query = Category::where('slug', $data['slug']);
            if ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            }
        }

        $data['is_active'] = isset($data['is_active']) ? 1 : 0;

        $data['parent_id'] = (isset($data['parent_id']) && $data['parent_id'] !== '') ? $data['parent_id'] : null;

        return $data;
    }

    // Api methods
    public function getCategories()
    {
        $parentId = $_GET['parent_id'] ?? null;

        $query = Category::query();

        if ($parentId !== null && $parentId !== '') {
            $query->where('parent_id', $parentId);
        } else {
            $query->whereNull('parent_id');
        }

        $query->active();

        $categories = $query->get();

        $parentModel = ($parentId !== null && $parentId !== '') ? Category::find($parentId) : null;

        $breadcrumbs = [];
        if ($parentModel) {
            $current = $parentModel;
            while ($current) {
                array_unshift($breadcrumbs, [
                    'id' => $current->id,
                    'name' => $current->name
                ]);
                $current = $current->parent;
            }
        }

        return $this->json([
            'items' => $categories,
            'parent' => $parentModel,
            'breadcrumbs' => $breadcrumbs
        ]);
    }
}

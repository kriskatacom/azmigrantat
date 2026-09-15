<?php

namespace App\Controllers;

use App\Models\BusinessCategory;
use App\Modules\Form;
use App\Modules\Str;
use App\Services\MediaService;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class BusinessCategoryController extends BaseController
{
    use HasAdminTrait;

    protected MediaService $mediaService;

    public function __construct()
    {
        $this->mediaService = new MediaService();
    }

    public function index()
    {
        $parentId = $_GET['parent_id'] ?? null;
        $extraData = [
            'breadcrumbs' => []
        ];

        if ($parentId) {
            $parent = BusinessCategory::find($parentId);
            if ($parent) {
                $breadcrumbs = [];
                $current = $parent;
                while ($current) {
                    array_unshift($breadcrumbs, $current);
                    $current = $current->parent;
                }
                $extraData['breadcrumbs'] = $breadcrumbs;
                $extraData['parent_category'] = $parent;
            }
        }

        return $this->resourceIndex(BusinessCategory::class, 'admin/business-categories/index', [
            'title'         => 'Бизнес Категории',
            'resource_name' => 'categories',
            'features'      => ['hierarchical'],
            'search_fields' => ['name', 'slug'],
            'with'          => ['children', 'parent'],
            'extra_data'    => $extraData
        ]);
    }

    public function create()
    {
        $parentOptions = Form::getTreeOptions(BusinessCategory::class, [], 'name', 'Родителска категория', 'sort_order');

        $this->renderAdmin('admin/business-categories/form', ['title' => 'Нова бизнес категория'], [
            'category' => new BusinessCategory(),
            'parentOptions' => $parentOptions
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:business_categories,slug'
        ];

        $messages = [
            'name.required' => 'Името е задължително.',
            'slug.unique'   => 'Този слаг вече съществува.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;

        if (!empty($_FILES['image_url']['name'])) {
            try {
                $media = $this->mediaService->upload($_FILES['image_url']);
                $data['image_url'] = $media->file_path;

                if (!empty($category->image_url)) {
                    $this->mediaService->deleteFile($category->image_url);
                }
            } catch (\Exception $e) {
                $this->flash('error', 'Грешка при качване на снимката: ' . $e->getMessage());
            }
        }

        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
        $data['sort_order'] = (int)($data['sort_order'] ?? 0);
        $data['parent_id'] = !empty($data['parent_id']) ? (int)$data['parent_id'] : null;

        $category = new BusinessCategory();
        $this->updateResource($category, $data);

        $this->flash('success', 'Категорията е създадена успешно!');
        $this->redirect("/admin/business-categories/edit/{$category->id}");
    }

    public function edit($id)
    {
        $category = BusinessCategory::findOrFail($id);

        $parentOptions = Form::getTreeOptions(BusinessCategory::class, [], 'name', 'Родителска категория', 'sort_order');

        $this->renderAdmin('admin/business-categories/form', ['title' => 'Редакция: ' . $category->name], [
            'category' => $category,
            'parentOptions' => $parentOptions
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $category = BusinessCategory::findOrFail($id);

        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:business_categories,slug,' . $category->id
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;

        if (!empty($_FILES['image_url']['name'])) {
            $media = $this->mediaService->upload($_FILES['image_url']);
            $data['image_url'] = $media->file_path;

            if (!empty($category->image_url)) {
                $this->mediaService->deleteFile($category->image_url);
            }
        } elseif (isset($data['remove_image_url']) && $data['remove_image_url'] == "1") {
            if (!empty($category->image_url)) {
                $this->mediaService->deleteFile($category->image_url);
            }
            $data['image_url'] = null;
        } else {
            $data['image_url'] = $category->image_url;
        }

        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
        $data['sort_order'] = (int)($data['sort_order'] ?? 0);
        $data['parent_id'] = !empty($data['parent_id']) ? (int)$data['parent_id'] : null;

        $this->updateResource($category, $data);

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $item = BusinessCategory::findOrFail($id);

            if ($item->children()->count() > 0) {
                $this->flash('error', 'Не може да изтриете категория, която има подкатегории.');
                return $this->redirectBack();
            }

            $item->delete();
            $this->flash('info', 'Категорията е преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриване.');
        }

        return $this->redirectTrashOrIndex(BusinessCategory::class, 'business-categories');
    }

    public function restore($id)
    {
        $item = BusinessCategory::onlyTrashed()->findOrFail($id);
        $item->restore();

        $this->flash('info', 'Категорията беше възстановена.');
        return $this->redirectTrashOrIndex(BusinessCategory::class, 'business-categories');
    }

    public function forceDelete($id)
    {
        try {
            $item = BusinessCategory::onlyTrashed()->findOrFail($id);
            $item->forceDelete();
            $this->flash('info', 'Категорията е изтрита завинаги.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при окончателно изтриване.');
        }

        return $this->redirectTrashOrIndex(BusinessCategory::class, 'business-categories');
    }
}

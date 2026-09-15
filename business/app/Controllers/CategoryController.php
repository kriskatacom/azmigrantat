<?php

namespace App\Controllers;

use App\Core\App;
use App\Models\BusinessCategory;
use App\Models\Category;
use App\Models\City;
use App\Models\Company;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class CategoryController extends BaseController
{
    use HasAdminTrait;

    public function showByCity($citySlug, $businessCategorySlug)
    {
        $city = City::where('slug', '/' . $citySlug)->first() ?: $this->abort404();

        $categoryParts = explode('/', trim($businessCategorySlug, '/'));
        $businessCategory = BusinessCategory::active()
            ->where('slug', end($categoryParts))
            ->first() ?: $this->abort404();

        $searchQuery = $_GET['q'] ?? null;
        $showCompanies = false;

        $ads = $this->getCategoryRelatedAds($city->id, $businessCategory);

        $items = $businessCategory->children()->active();
        if ($searchQuery) {
            $items->where('name', 'LIKE', "%{$searchQuery}%");
        }
        $items = $items->get();

        if ($items->isEmpty()) {
            $items = $this->getCompaniesByCategory($city->id, $businessCategory->id, $searchQuery);
            $showCompanies = true;
        }

        $seoData = $this->generateCategorySeoData($city, $businessCategory);

        return $this->renderWithSeo('categories/show-by-city', $seoData, [
            'city'          => $city,
            'category'      => $businessCategory,
            'items'         => $items,
            'citySlug'      => $citySlug,
            'parentCatSlug' => $businessCategorySlug,
            'searchQuery'   => $searchQuery,
            'showCompanies' => $showCompanies,
            'ads'           => $ads
        ]);
    }

    private function getCompaniesByCategory($cityId, $categoryId, $searchQuery = null)
    {
        $query = Company::active()
            ->where('city_id', $cityId)
            ->where('category_id', $categoryId);

        if ($searchQuery) {
            $query->where('name', 'LIKE', "%{$searchQuery}%");
        }

        return $query->orderBy('sort_order', 'asc')->get();
    }

    private function getCategoryRelatedAds($cityId, $businessCategory)
    {
        $categoryIds = [$businessCategory->id];

        $childIds = $businessCategory->children()->pluck('id')->toArray();
        $categoryIds = array_merge($categoryIds, $childIds);

        $allCompanyIds = Company::active()
            ->where('city_id', $cityId)
            ->whereIn('category_id', array_unique($categoryIds))
            ->pluck('id')
            ->toArray();

        if (empty($allCompanyIds)) {
            return collect();
        }

        $today = date('Y-m-d');

        return \App\Models\CompanyAd::active()
            ->whereIn('company_id', $allCompanyIds)
            ->where(function ($query) use ($today) {
                $query->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(options, '$.valid_until')) >= ?", [$today])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(options, '$.valid_until')) IS NULL")
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(options, '$.valid_until')) = ''");
            })
            ->inRandomOrder()
            ->get();
    }

    private function generateCategorySeoData($city, $businessCategory)
    {
        $langNames = App::getLangNames();
        $currentLang = $_SESSION['lang'] ?? App::$defaultLang;
        $langName = $langNames[$currentLang] ?? '';

        $seoTitle = "{$businessCategory->name} в {$city->name} - " . $langName;
        $seoDescription = "Всички фирми и услуги в категория {$businessCategory->name} за град {$city->name}.";

        return [
            'title'       => $businessCategory->getOptionTranslation('seo_title', $seoTitle),
            'description' => $businessCategory->getOptionTranslation('seo_description', $seoDescription),
            'og_image'    => $businessCategory->image_url ?? $city->options['image_desktop'] ?? null
        ];
    }

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
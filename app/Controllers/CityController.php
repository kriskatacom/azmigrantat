<?php

namespace App\Controllers;

use App\Models\City;
use App\Modules\Form;
use App\Services\HelperService;
use App\Services\MediaService;
use Exception;

class CityController extends BaseController
{
    protected MediaService $mediaService;

    public function __construct()
    {
        $this->mediaService = new MediaService();
    }

    public function show($slug)
    {
        $cleanSlug = trim($slug, '/');
        $searchQuery = $_GET['q'] ?? null;

        $city = City::withTrashed()
            ->whereIn('slug', [$cleanSlug, '/' . $cleanSlug])
            ->with(['country']) 
            ->first();

        if (!$city) {
            $this->abort404();
        }

        $childrenQuery = $city->children();
        if ($searchQuery) {
            $childrenQuery->where('name', 'LIKE', "%{$searchQuery}%");
        }
        $children = $childrenQuery->get();

        $categories = [];
        if ($children->isEmpty()) {
            $categories = \App\Models\BusinessCategory::active()
                ->root()
                ->orderBy('sort_order', 'asc')
                ->get();
        }

        $seoData = [
            'title'       => $city->getOptionTranslation('seo_title', $city->name),
            'description' => $city->getOptionTranslation('seo_description', "Всичко за {$city->name}"),
            'og_image'    => $city->options['seo_og_image'] ?? $city->options['image_desktop'] ?? null
        ];

        return $this->renderWithSeo('cities/show', $seoData, [
            'city'        => $city,
            'children'    => $children,
            'categories'  => $categories,
            'searchQuery' => $searchQuery
        ]);
    }

    public function search()
    {
        $query = trim($_GET['q'] ?? '');

        if (mb_strlen($query) < 2) {
            return $this->redirect('/cities');
        }

        $results = City::where('name', 'LIKE', "%{$query}%")
            ->orWhere('type', 'LIKE', "%{$query}%")
            ->orderBy('type', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        $seoData = [
            'title'       => "Резултати от търсене: " . htmlspecialchars($query),
            'description' => "Търсене на населени места и области в България за: {$query}",
        ];

        return $this->renderWithSeo('cities/search-results', $seoData, [
            'results' => $results,
            'query'   => $query
        ]);
    }

    public function index()
    {
        $search = $_GET['search'] ?? '';
        $currentTab = $_GET['tab'] ?? 'all';

        $query = City::query();

        // Логика за филтриране според избрания таб
        switch ($currentTab) {
            case 'trash':
                $query->onlyTrashed();
                break;
            case 'regions':
                $query->where('type', 'region');
                break;
            case 'cities':
                $query->where('type', 'city');
                break;
            case 'villages':
                $query->where('type', 'village');
                break;
            default:
                break;
        }

        $query->orderBy('sort_order', 'ASC')->orderBy('name', 'ASC');

        $cities = $this->paginateQuery($query, ['name', 'slug'], 15);

        $seoData = [
            'title' => 'Управление на градове | Админ панел',
            'description' => 'Списък и редактиране на населени места по типове.'
        ];

        $this->renderAdmin('admin/cities/index', $seoData, [
            'cities'     => $cities,
            'search'     => $search,
            'currentTab' => $currentTab
        ]);
    }

    public function create()
    {
        $seoData = ['title' => 'Добавяне на нов град'];

        $parentOptions = Form::getTreeOptions(City::class, ['type' => 'region'], 'name', 'Без област', 'sort_order');

        $this->renderAdmin('admin/cities/form', $seoData, [
            'city' => new City(),
            'parentOptions' => $parentOptions
        ]);
    }

    public function store()
    {
        try {
            $data = $this->processInputData();

            $city = new City();
            $city->fill($data);
            $city->slug = HelperService::slug($data['name']);
            $parentId = !empty($_POST['parent_id']) ? (int)$_POST['parent_id'] : null;
            $source = !empty($_POST['slug']) ? $_POST['slug'] : $_POST['name'];

            $city->slug = $this->generateHierarchicalSlug($source, $parentId, City::class);
            $city->save();

            $this->flash('success', 'Градът беше добавен успешно!');
            $this->redirect('/admin/cities');
        } catch (Exception $e) {
            $this->flash('error', $e->getMessage());
            $this->redirectBack();
        }
    }

    public function edit($id)
    {
        try {
            $city = City::findOrFail((int)$id);

            $parentOptions = Form::getTreeOptions(
                City::class,
                [(int)$city->id],
                'name',
                'Без родител (Главен регион)',
                'sort_order'
            );

            $seoData = [
                'title' => "Редактиране на {$city->name} | Админ панел",
                'description' => "Управление на настройките и съдържанието за {$city->name}"
            ];

            $this->renderAdmin('admin/cities/form', $seoData, [
                'city'          => $city,
                'parentOptions' => $parentOptions
            ]);
        } catch (Exception $e) {
            $this->flash('error', 'Градът не беше намерен в системата.');
            $this->redirect('/admin/cities');
        }
    }

    public function update($id)
    {
        try {
            $city = City::findOrFail((int)$id);

            $data = $this->processCityInputData($city);

            $city->name = $data['name'];
            $city->slug = $data['slug'];
            $city->parent_id = $data['parent_id'];
            $city->type = $data['type'];
            $city->sort_order = $data['sort_order'];

            $city->options = $data['options'];

            $city->save();

            $this->flash('success', 'Данните за населеното място бяха обновени!');
            $this->redirect("/admin/cities/edit/$id");
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при обновяване: ' . $e->getMessage());
            $this->redirectBack();
        }
    }

    private function processCityInputData(?City $city = null): array
    {
        $mediaService = new MediaService();
        $existingOptions = $city ? ($city->options ?? []) : [];
        $newOptions = $_POST['options'] ?? [];
        $baseName = $_POST['name'] ?? '';
        $parentId = !empty($_POST['parent_id']) ? (int)$_POST['parent_id'] : null;

        $finalOptions = array_merge($existingOptions, $newOptions);

        $uploadedFiles = $this->handleImageUploads([
            'image_desktop',
            'image_tablet',
            'image_phone',
            'seo_og_image'
        ]);

        foreach ($uploadedFiles as $key => $path) {
            if (array_key_exists($key, $uploadedFiles)) {

                if (is_null($path)) {
                    if (!empty($existingOptions[$key])) {
                        $mediaService->deleteFile($existingOptions[$key]);
                    }
                    unset($finalOptions[$key]);
                } else {
                    if (!empty($existingOptions[$key])) {
                        $mediaService->deleteFile($existingOptions[$key]);
                    }
                    $finalOptions[$key] = $path;
                }
            }
        }

        if (empty($finalOptions['seo_title'])) {
            $finalOptions['seo_title'] = $baseName;
        }

        $source = !empty($_POST['slug']) ? $_POST['slug'] : $baseName;
        $finalSlug = $this->generateHierarchicalSlug($source, $parentId, City::class);

        return [
            'name'       => $baseName,
            'slug'       => $finalSlug,
            'type'       => $_POST['type'] ?? 'city',
            'parent_id'  => $parentId,
            'options'    => $finalOptions,
            'sort_order' => (int)($_POST['sort_order'] ?? 0)
        ];
    }

    public function destroy($id)
    {
        try {
            $city = City::findOrFail((int)$id);
            $city->delete();
            $this->flash('success', 'Градът беше преместен в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', $e->getMessage());
        }
        $this->redirect('/admin/cities');
    }

    private function processInputData(?City $city = null): array
    {
        $existingOptions = $city ? ($city->options ?? []) : [];
        $newOptions = $_POST['options'] ?? [];

        $imageResults = $this->handleImageUploads(['image_desktop']);

        foreach ($imageResults as $key => $newPath) {
            if (isset($existingOptions[$key]) && !empty($existingOptions[$key])) {
                if ($existingOptions[$key] !== $newPath) {
                    $this->mediaService->deleteFile($existingOptions[$key]);
                }
            }
        }

        $finalOptions = array_merge($existingOptions, $newOptions, $imageResults);

        return [
            'name'       => $_POST['name'] ?? '',
            'sort_order' => (int)($_POST['sort_order'] ?? 0),
            'options'    => $finalOptions,
        ];
    }

    public function delete($id)
    {
        try {
            $city = City::findOrFail((int)$id);
            $city->delete();

            $this->flash('success', "Град '{$city->name}' беше преместен в кошчето.");
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриването на записа.');
        }

        $remainingTrashCount = City::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            return $this->redirect('/admin/cities?tab=all');
        }

        return $this->redirect('/admin/cities?tab=trash');
    }

    public function restore($id)
    {
        try {
            $city = City::onlyTrashed()->findOrFail((int)$id);
            $city->restore();

            $this->flash('success', "Град '{$city->name}' беше възстановен успешно.");
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при опит за възстановяване на записа.');
        }

        $remainingTrashCount = City::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            return $this->redirect('/admin/cities?tab=all');
        }

        return $this->redirect('/admin/cities?tab=trash');
    }

    public function forceDelete($id)
    {
        try {
            $city = City::onlyTrashed()->findOrFail((int)$id);

            $cityName = $city->name;

            $city->forceDelete();

            $this->flash('success', "Град '{$cityName}' беше изтрит окончателно от системата.");
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при окончателното изтриване.');
        }

        $remainingTrashCount = City::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            return $this->redirect('/admin/cities?tab=all');
        }

        return $this->redirect('/admin/cities?tab=trash');
    }
}
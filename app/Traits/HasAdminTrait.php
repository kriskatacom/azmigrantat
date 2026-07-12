<?php

namespace App\Traits;

use App\Services\MediaService;

trait HasAdminTrait
{
    protected function processGallery(array $existingOptions): array
{
    $mediaService = new MediaService();

    $currentGallery = $existingOptions['additional_images'] ?? [];
    if (is_string($currentGallery)) $currentGallery = json_decode($currentGallery, true) ?? [];
    $currentGallery = is_array($currentGallery) ? $currentGallery : [];

    $remaining = $_POST['existing_images'] ?? [];

    $toDelete = array_diff($currentGallery, $remaining);

    foreach ($toDelete as $path) {
        $mediaService->deleteFile($path);
    }

    $newImages = [];
    if (isset($_FILES['options']['name']['additional_images'])) {
        $files = $_FILES['options'];
        foreach ($files['name']['additional_images'] as $index => $name) {
            if ($files['error']['additional_images'][$index] === UPLOAD_ERR_OK) {
                $fileData = [
                    'name' => $name, 'tmp_name' => $files['tmp_name']['additional_images'][$index],
                    'type' => $files['type']['additional_images'][$index], 'size' => $files['size']['additional_images'][$index],
                    'error' => 0
                ];
                $media = $mediaService->upload($fileData);
                if ($media && isset($media->file_path)) {
                    $newImages[] = $media->file_path;
                }
            }
        }
    }

    $existingOptions['additional_images'] = array_values(array_merge($remaining, $newImages));
    
    return $existingOptions;
}

    protected function resourceIndex(string $modelClass, string $view, array $config = [])
    {
        $currentTab = $_GET['tab'] ?? 'all';
        $query = $modelClass::query();

        if (!empty($config['with'])) {
            $query->with($config['with']);
        }

        switch ($currentTab) {
            case 'trash':
                $query->onlyTrashed();
                break;
            case 'active':
                $query->where('is_active', true);
                break;
            case 'inactive':
                $query->where('is_active', false);
                break;
            case 'published':
            case 'draft':
            case 'scheduled':
                $query->where('status', $currentTab);
                break;
        }

        if (in_array('hierarchical', $config['features'] ?? []) && empty($_GET['search']) && $currentTab !== 'trash') {
            if (!empty($_GET['parent_id'])) {
                $query->where('parent_id', $_GET['parent_id']);
            } elseif (in_array('hierarchical', $config['features'] ?? []) && empty($_GET['search']) && $currentTab !== 'trash') {
                $query->whereNull('parent_id');
            }
        }

        if (isset($config['order_by'])) {
            $query->orderBy($config['order_by'], $config['order_dir'] ?? 'asc');
        } else {
            $query->latest();
        }

        $items = $this->paginateQuery($query, $config['search_fields'] ?? ['title']);

        $counts = [
            'all' => $modelClass::count(),
            'trash' => $modelClass::onlyTrashed()->count()
        ];

        if (in_array('status', $config['features'] ?? [])) {
            $counts['published'] = $modelClass::where('status', 'published')->count();
            $counts['draft'] = $modelClass::where('status', 'draft')->count();
            $counts['scheduled'] = $modelClass::where('status', 'scheduled')->count();
        }

        $viewData = array_merge([
            $config['resource_name'] => $items,
            'currentTab' => $currentTab,
            'counts' => $counts
        ], $config['extra_data'] ?? []);

        return $this->renderAdmin($view, [
            'title' => $config['title'] ?? 'Управление'
        ], $viewData);
    }

    protected function updateResource($model, array $data, array $imageKeys = [])
    {
        $data['options'] = $this->processResourceOptions($model, $imageKeys);
        $model->fill($data);
        return $model->save();
    }

    protected function processResourceOptions($model = null, array $imageKeys = []): array
    {
        $mediaService = new MediaService();
        $existingOptions = $model ? (array) ($model->options ?? []) : [];

        $newOptions = $_POST['options'] ?? [];
        if (isset($newOptions['additional_images'])) {
            unset($newOptions['additional_images']);
        }

        $imageResults = $this->handleImageUploads($imageKeys);
        foreach ($imageResults as $key => $newPath) {
            if ($newPath === null) {
                if (!empty($existingOptions[$key]))
                    $mediaService->deleteFile($existingOptions[$key]);
                unset($existingOptions[$key]);
            } elseif ($newPath) {
                $existingOptions[$key] = $newPath;
            }
        }

        $existingOptions = $this->processGallery($existingOptions);

        return array_merge($existingOptions, $newOptions);
    }
}
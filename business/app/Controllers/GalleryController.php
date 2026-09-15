<?php

namespace App\Controllers;

use App\Models\Gallery;
use App\Models\Media;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use App\Core\Auth;
use Exception;

class GalleryController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(Gallery::class, 'admin/galleries/index', [
            'title'         => 'Управление на галерии',
            'resource_name' => 'galleries',
            'search_fields' => ['payload'],
            'order_by'      => 'created_at',
            'order_dir'     => 'desc'
        ]);
    }

    public function create()
    {
        $gallery = new Gallery();
        $mediaData = $this->getMediaPagination(1);

        $this->renderAdmin('admin/galleries/form', ['title' => 'Нова галерия'], array_merge([
            'gallery' => $gallery
        ], $mediaData));
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'payload' => 'required|min:3',
            'slug'    => 'nullable|unique:galleries,slug'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;
        $data['user_id'] = Auth::id();
        $data['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['payload']);
        $data['last_activity'] = time();
        $data['is_active'] = isset($_POST['is_active']);

        $gallery = new Gallery();
        $this->updateResource($gallery, $data);

        if (!empty($_POST['media_ids'])) {
            $this->syncGalleryMedia($gallery, $_POST['media_ids']);
        }

        $this->flash('success', "Галерията беше създадена успешно.");
        $this->redirect("/admin/galleries/edit/{$gallery->id}");
    }

    public function edit($id)
    {
        $gallery = Gallery::with('media')->findOrFail($id);
        $page = (int)($_GET['page'] ?? 1);
        $mediaData = $this->getMediaPagination($page);

        $this->renderAdmin('admin/galleries/form', ['title' => 'Редакция: ' . $gallery->payload], array_merge([
            'gallery' => $gallery
        ], $mediaData));
    }

    #[HandleExceptions]
    public function update($id)
    {
        $gallery = Gallery::findOrFail($id);

        $rules = [
            'payload' => 'required|min:3',
            'slug'    => 'nullable|unique:galleries,slug,' . $gallery->id
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $_POST;
        $data['slug'] = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['payload']);
        $data['last_activity'] = time();
        $data['is_active'] = isset($_POST['is_active']);

        $this->updateResource($gallery, $data);

        if (isset($_POST['media_ids'])) {
            $this->syncGalleryMedia($gallery, $_POST['media_ids'], true);
        }

        $this->flash('success', "Галерията беше обновена успешно.");
        $this->redirectBack();
    }

    public function detachMedia($galleryId, $mediaId)
    {
        $gallery = Gallery::findOrFail($galleryId);
        $gallery->media()->detach($mediaId);

        $this->flash('success', "Изображението беше премахнато от галерията.");
        $this->redirectBack();
    }

    public function clearGallery($id)
    {
        $gallery = Gallery::findOrFail($id);
        $gallery->media()->detach();

        $this->flash('success', "Галерията беше изпразнена.");
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $gallery = Gallery::findOrFail($id);
            $gallery->delete();
            $this->flash('info', 'Галерията е преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриване.');
        }
        return $this->redirectTrashOrIndex(Gallery::class, 'galleries');
    }

    public function restore($id)
    {
        $gallery = Gallery::onlyTrashed()->findOrFail($id);
        $gallery->restore();
        $this->flash('info', 'Галерията беше възстановена успешно.');
        return $this->redirectTrashOrIndex(Gallery::class, 'galleries');
    }

    public function forceDelete($id)
    {
        $gallery = Gallery::onlyTrashed()->findOrFail($id);
        $gallery->forceDelete();
        $this->flash('success', 'Галерията беше окончателно изтрита.');
        return $this->redirectTrashOrIndex(Gallery::class, 'galleries');
    }

    private function syncGalleryMedia($gallery, array $mediaIds, $append = false)
    {
        $syncData = [];
        foreach ($mediaIds as $index => $mediaId) {
            $syncData[$mediaId] = ['sort_order' => $index];
        }

        $append
            ? $gallery->media()->syncWithoutDetaching($syncData)
            : $gallery->media()->sync($syncData);
    }

    private function getMediaPagination($page = 1, $perPage = 20)
    {
        $offset = ($page - 1) * $perPage;
        $query = Media::where('file_type', 'LIKE', 'image/%')->orderBy('created_at', 'desc');

        return [
            'media'       => $query->skip($offset)->take($perPage)->get(),
            'currentPage' => $page,
            'totalPages'  => ceil($query->count() / $perPage)
        ];
    }
}

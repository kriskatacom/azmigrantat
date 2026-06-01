<?php

namespace App\Controllers;

use App\Models\Media;
use App\Services\MediaService;
use App\Traits\HasAdminTrait;
use Exception;

class MediaController extends BaseController
{
    use HasAdminTrait;

    protected MediaService $mediaService;

    public function __construct()
    {
        $this->mediaService = new MediaService();
    }

    public function index()
    {
        return $this->resourceIndex(Media::class, 'admin/media/index', [
            'title'         => 'Библиотека | Админ панел',
            'resource_name' => 'media',
            'search_fields' => ['file_name', 'alt_text'],
            'order_by'      => 'created_at',
            'order_dir'     => 'desc'
        ]);
    }

    public function upload()
    {
        $seoData = [
            'title' => 'Качване на нов файл | Админ панел',
            'description' => 'Добавяне на нови изображения и документи в библиотеката.'
        ];

        $this->renderWithLayout('admin/media/upload', $seoData);
    }

    public function store()
    {
        try {
            if (empty($_FILES['file']['name'])) {
                throw new Exception("Моля, изберете файл за качване.");
            }

            $media = $this->mediaService->upload(
                $_FILES['file'],
                $_POST['alt_text'] ?? null
            );

            $this->flash('success', "Файлът '{$media->file_name}' е качен успешно.");
        } catch (Exception $e) {
            $this->flash('error', $e->getMessage());
        }

        $this->redirect('/admin/media');
    }

    public function delete($id)
    {
        try {
            $item = Media::findOrFail($id);
            $item->delete();

            $this->flash('info', 'Файлът е преместен в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Файлът не може да бъде намерен.');
        }

        $this->redirect('/admin/media');
    }

    public function restore($id)
    {
        $file = Media::onlyTrashed()->findOrFail($id);
        $file->restore();

        $this->flash('info', 'Файлът беше възстановен успешно.');

        $remainingTrashCount = Media::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            return $this->redirect('/admin/media?tab=all');
        }

        return $this->redirect('/admin/media?tab=trash');
    }

    public function forceDelete($id)
    {
        $media = Media::onlyTrashed()->findOrFail($id);

        $media->forceDelete();

        $this->flash('info', 'Менюто беше изтрито завинаги от системата.');

        $remainingTrashCount = Media::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            $this->redirect('/admin/media');
        }

        $this->redirect('/admin/media?tab=trash');
    }

    public function ajaxUpload()
    {
        if (!isset($_FILES['file'])) {
            return $this->json(['error' => 'Файлът не е намерен в заявката.']);
        }

        try {
            $media = $this->mediaService->upload($_FILES['file']);

            return $this->json([
                'id'   => $media->id,
                'url'  => $media->file_path,
                'name' => $media->file_name
            ]);
        } catch (\Exception $e) {
            return $this->json(['error' => $e->getMessage()]);
        }
    }
}
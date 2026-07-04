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

    public function ajaxUpload()
    {
        if (!isset($_FILES['file'])) {
            return $this->json(['error' => 'Файлът не е намерен в заявката.']);
        }

        try {
            $media = $this->mediaService->upload($_FILES['file']);

            return $this->json([
                'id' => $media->id,
                'url' => $media->file_path,
                'name' => $media->file_name
            ]);
        } catch (Exception $e) {
            return $this->json(['error' => $e->getMessage()]);
        }
    }

    public function ajaxDelete()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $path = $input['path'] ?? '';

        if (empty($path)) {
            return $this->json(['error' => 'Няма предоставен път до файл.']);
        }

        try {
            $media = Media::where('file_path', $path)->first();

            if ($media) {
                $media->delete();
            } else {
                $fullPath = PUBLIC_PATH . $path;
                if (strpos($path, '/uploads/') === 0 && strpos($path, '..') === false && file_exists($fullPath)) {
                    unlink($fullPath);
                }
            }

            return $this->json(['success' => true]);
        } catch (Exception $e) {
            return $this->json(['error' => $e->getMessage()]);
        }
    }
}
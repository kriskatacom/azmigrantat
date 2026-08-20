<?php

namespace App\Controllers;

use App\Services\BackblazeB2Service;
use App\Traits\HasAdminTrait;
use Exception;

class StorageController extends BaseController
{
    use HasAdminTrait;

    protected BackblazeB2Service $storageService;

    public function __construct()
    {
        $keyId          = $_ENV['B2_KEY_ID']          ?? $_SERVER['B2_KEY_ID']          ?? getenv('B2_KEY_ID')          ?: '';
        $applicationKey = $_ENV['B2_APPLICATION_KEY'] ?? $_SERVER['B2_APPLICATION_KEY'] ?? getenv('B2_APPLICATION_KEY') ?: '';
        $bucket         = $_ENV['B2_BUCKET']          ?? $_SERVER['B2_BUCKET']          ?? getenv('B2_BUCKET')          ?: '';
        $endpoint       = $_ENV['B2_ENDPOINT']        ?? $_SERVER['B2_ENDPOINT']        ?? getenv('B2_ENDPOINT')        ?: '';
        $region         = $_ENV['B2_REGION']          ?? $_SERVER['B2_REGION']          ?? getenv('B2_REGION')          ?: 'us-east-005';

        $this->storageService = new BackblazeB2Service(
            $keyId,
            $applicationKey,
            $bucket,
            $endpoint,
            $region
        );

        $useProxy = filter_var($_ENV['B2_USE_PROXY'] ?? $_SERVER['B2_USE_PROXY'] ?? getenv('B2_USE_PROXY') ?? true, FILTER_VALIDATE_BOOLEAN);
        $this->storageService->setUseProxy($useProxy);
    }

    public function ajaxUpload()
    {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            return $this->json(['error' => 'Файлът не е намерен или възникна грешка при качването.']);
        }

        try {
            $file = $_FILES['file'];
            $localFile = $file['tmp_name'];
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $uniqueName = bin2hex(random_bytes(16)) . ($extension ? '.' . $extension : '');
            
            $dateFolder = 'uploads/' . date('Y/m/d') . '/';
            $remotePath = $dateFolder . $uniqueName;

            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $contentType = $finfo->file($localFile) ?: 'application/octet-stream';

            $uploadResult = $this->storageService->upload($localFile, $remotePath, $contentType);

            return $this->json([
                'success' => true,
                'url'     => $this->storageService->url($remotePath),
                'key'     => $uploadResult['key']
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
            $remotePath = $path;

            if (strpos($path, '?path=') !== false) {
                $urlParts = parse_url($path);
                parse_str($urlParts['query'] ?? '', $queryParams);
                if (!empty($queryParams['path'])) {
                    $remotePath = $queryParams['path'];
                }
            } else {
                if (strpos($path, 'uploads/') !== false) {
                    $parts = explode('uploads/', $path);
                    $remotePath = 'uploads/' . end($parts);
                } else {
                    $bucket = $this->storageService->getBucketName();
                    if (strpos($path, $bucket) !== false) {
                        $parts = explode($bucket . '/', $path);
                        $remotePath = end($parts);
                    } else {
                        $remotePath = ltrim($path, '/');
                    }
                }
            }

            $deleted = $this->storageService->delete($remotePath);

            if (!$deleted) {
                return $this->json(['error' => 'Файлът не можа да бъде изтрит от Backblaze B2.']);
            }

            return $this->json(['success' => true]);

        } catch (Exception $e) {
            return $this->json(['error' => $e->getMessage()]);
        }
    }

    public function getFile()
    {
        $remotePath = $_GET['path'] ?? '';

        if (empty($remotePath)) {
            return $this->abort404();
        }

        try {
            $fileData = $this->storageService->download($remotePath);

            $extension = pathinfo($remotePath, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',  'gif'  => 'image/gif',
                'webp'=> 'image/webp', 'mp4'  => 'video/mp4'
            ];
            $contentType = $mimeTypes[strtolower($extension)] ?? 'application/octet-stream';

            header("Content-Type: " . $contentType);
            header("Content-Length: " . strlen($fileData));
            echo $fileData;
            exit;

        } catch (Exception $e) {
            return $this->abort404();
        }
    }
}

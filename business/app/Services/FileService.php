<?php

namespace App\Services;

class FileService
{
    protected static string $basePath = '/uploads';
    protected static string $publicRoot = __DIR__ . '/../../public';

    public static function upload(array $file, string $subFolder = 'images'): ?string
    {
        if (empty($file['name']) || $file['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $datePath = '/' . date('Y/m/d');
        $relativeDir = self::$basePath . $datePath;
        $absoluteDir = self::$publicRoot . $relativeDir;

        if (!is_dir($absoluteDir)) {
            mkdir($absoluteDir, 0777, true);
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = bin2hex(random_bytes(8)) . '.' . $extension;
        $relativeFilePath = $relativeDir . '/' . $fileName;
        $absoluteFilePath = $absoluteDir . '/' . $fileName;

        if (move_uploaded_file($file['tmp_name'], $absoluteFilePath)) {
            return $relativeFilePath;
        }

        return null;
    }

    public static function delete(?string $filePath): bool
    {
        if (!$filePath) return false;

        $absolutePath = self::$publicRoot . $filePath;

        if (file_exists($absolutePath) && is_file($absolutePath)) {
            return unlink($absolutePath);
        }

        return false;
    }
}

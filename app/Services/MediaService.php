<?php

namespace App\Services;

use App\Models\Media;
use Exception;

class MediaService
{
    protected string $baseUploadPath = 'uploads';

    public function upload(array $file, ?string $altText = null): Media
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Грешка при качване: " . $file['error']);
        }

        $datePath = date('Y/m/d');
        $relativeFolder = $this->baseUploadPath . DIRECTORY_SEPARATOR . $datePath;
        $targetDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $relativeFolder . DIRECTORY_SEPARATOR;

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeName = bin2hex(random_bytes(10)) . '.' . $extension;
        $fullPath = $targetDir . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
            throw new Exception("Неуспешно преместване на файла.");
        }

        // Оптимизация с чист PHP (GD)
        $finalData = $this->processImage($fullPath);

        return Media::create([
            'file_name' => $file['name'],
            'file_path' => '/' . str_replace('\\', '/', $relativeFolder) . '/' . $finalData['name'],
            'file_type' => $finalData['type'],
            'file_size' => $finalData['size'],
            'alt_text'  => $altText
        ]);
    }

    private function processImage(string $filePath): array
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            return $this->getFileInfo($filePath);
        }

        // 1. Създаване на ресурс и оправяне на ориентацията (EXIF)
        $image = $this->createResourceAndFixOrientation($filePath, $extension);
        if (!$image) return $this->getFileInfo($filePath);

        // 2. Resize до макс 1920px ширина
        $width = imagesx($image);
        $height = imagesy($image);
        if ($width > 1920) {
            $newWidth = 1920;
            $newHeight = (int)($height * ($newWidth / $width));
            $tmp = imagecreatetruecolor($newWidth, $newHeight);

            // Запазване на прозрачност за PNG/WebP
            imagealphablending($tmp, false);
            imagesavealpha($tmp, true);

            imagecopyresampled($tmp, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            $image = $tmp;
        }

        // 3. Опит за WebP компресия
        $pathInfo = pathinfo($filePath);
        $webpPath = $pathInfo['dirname'] . DIRECTORY_SEPARATOR . $pathInfo['filename'] . '.webp';

        imagewebp($image, $webpPath, 75);

        // 4. Сравнение на размерите (WordPress логика)
        if (file_exists($webpPath) && filesize($webpPath) < filesize($filePath)) {
            unlink($filePath);
            return [
                'name' => $pathInfo['filename'] . '.webp',
                'size' => filesize($webpPath),
                'type' => 'image/webp'
            ];
        }

        // Ако оригиналът е по-малък или WebP не е станал, запазваме оригинала (но преоразмерен)
        if ($extension === 'png') {
            imagepng($image, $filePath, 8);
        } else {
            imagejpeg($image, $filePath, 80);
        }

        if (file_exists($webpPath)) unlink($webpPath);

        return $this->getFileInfo($filePath);
    }

    private function createResourceAndFixOrientation(string $path, string $ext)
    {
        try {
            $img = match ($ext) {
                'jpg', 'jpeg' => @\imagecreatefromjpeg($path),
                'png'         => @\imagecreatefrompng($path),
                'webp'        => @\imagecreatefromwebp($path),
                default       => null
            };

            if (!$img) return null;

            if (function_exists('exif_read_data') && \in_array($ext, ['jpg', 'jpeg'])) {
                $exif = @\exif_read_data($path);

                if (!empty($exif['Orientation'])) {
                    imagealphablending($img, false);
                    imagesavealpha($img, true);

                    $rotated = match ($exif['Orientation']) {
                        3 => \imagerotate($img, 180, 0),
                        6 => \imagerotate($img, -90, 0),
                        8 => \imagerotate($img, 90, 0),
                        default => $img
                    };

                    if ($rotated !== false) {
                        $img = $rotated;
                    }
                }
            }
        } catch (\Throwable $e) {}

        return $img;
    }

    private function getFileInfo($path): array
    {
        return [
            'name' => basename($path),
            'size' => filesize($path),
            'type' => mime_content_type($path)
        ];
    }

    public function isAllowedType(string $mimeType): bool
    {
        $allowed = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'video/mp4',
            'application/pdf',
            'text/plain',
            'application/zip'
        ];
        return in_array($mimeType, $allowed);
    }

    public function deleteFile(?string $relativePath): bool
    {
        if (!$relativePath) return false;
        $fullPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath);
        return (file_exists($fullPath) && is_file($fullPath)) ? unlink($fullPath) : false;
    }
}

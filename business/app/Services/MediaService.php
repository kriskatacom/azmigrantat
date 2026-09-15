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

    public function uploadMultiple(array $files, string $folder = 'uploads'): array
    {
        $uploadedPaths = [];

        foreach ($files['name'] as $index => $name) {
            if ($files['error'][$index] === UPLOAD_ERR_OK) {
                $file = [
                    'name'     => $files['name'][$index],
                    'tmp_name' => $files['tmp_name'][$index],
                    'size'     => $files['size'][$index],
                    'error'    => $files['error'][$index]
                ];

                $media = $this->upload($file, $folder);

                if ($media) {
                    $uploadedPaths[] = $media->file_path;
                }
            }
        }

        return $uploadedPaths;
    }

    private function processImage(string $filePath): array
    {
        if (!file_exists($filePath)) {
            return ['error' => 'File not found'];
        }

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            return $this->getFileInfo($filePath);
        }

        $image = null;
        try {
            $image = $this->createResourceAndFixOrientation($filePath, $extension);

            if (!$image) {
                return $this->getFileInfo($filePath);
            }

            $width = imagesx($image);
            $height = imagesy($image);

            if ($width > 1920) {
                $newWidth = 1920;
                $newHeight = (int)($height * ($newWidth / $width));
                $tmp = imagecreatetruecolor($newWidth, $newHeight);

                imagealphablending($tmp, false);
                imagesavealpha($tmp, true);

                if (imagecopyresampled($tmp, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height)) {
                    imagedestroy($image);
                    $image = $tmp;
                }
            }

            $pathInfo = pathinfo($filePath);
            $webpPath = $pathInfo['dirname'] . DIRECTORY_SEPARATOR . $pathInfo['filename'] . '.webp';

            if ($extension !== 'webp') {
                if (@imagewebp($image, $webpPath, 75)) {
                    clearstatcache(true, $webpPath);
                    clearstatcache(true, $filePath);

                    if (file_exists($webpPath) && filesize($webpPath) < filesize($filePath)) {
                        unlink($filePath);
                        imagedestroy($image);
                        return $this->getFileInfo($webpPath);
                    }

                    if (file_exists($webpPath)) unlink($webpPath);
                }
            }

            if ($extension === 'png') {
                imagepng($image, $filePath, 8);
            } else {
                imagejpeg($image, $filePath, 80);
            }
        } catch (\Throwable $e) {
            error_log("Image processing failed for $filePath: " . $e->getMessage());
        } finally {
            if ($image) {
                imagedestroy($image);
            }
        }

        return $this->getFileInfo($filePath);
    }

    private function createResourceAndFixOrientation(string $path, string $ext)
    {
        $img = match ($ext) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($path),
            'png'         => @imagecreatefrompng($path),
            'webp'        => @imagecreatefromwebp($path),
            default       => null
        };

        if (!$img) return null;

        // Ротацията е "екстра" - ако гръмне, връщаме оригиналното изображение
        try {
            if (function_exists('exif_read_data') && in_array($ext, ['jpg', 'jpeg'])) {
                $exif = @exif_read_data($path);
                if (!empty($exif['Orientation'])) {
                    $degrees = match ($exif['Orientation']) {
                        3 => 180,
                        6 => -90,
                        8 => 90,
                        default => 0
                    };
                    if ($degrees !== 0) {
                        $rotated = @imagerotate($img, $degrees, 0);
                        if ($rotated) {
                            imagedestroy($img);
                            $img = $rotated;
                        }
                    }
                }
            }
        } catch (\Throwable $t) {
        }

        return $img;
    }

    private function getFileInfo($path): array
    {
        if (!file_exists($path)) return [];

        clearstatcache(true, $path);
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
<?php

namespace App\Helpers;

class GlobalHelpers
{
    public static function getFormattedSizeAttribute($size): string
    {
        $bytes = $size;
        if ($bytes <= 0) return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = floor(log($bytes, 1024));

        return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
    }

    public static function getFileIcon(string $mimeType): string
    {
        $mimeType = strtolower($mimeType);

        $icons = [
            // Изображения
            'image' => 'fa-image text-emerald-500',

            // Документи
            'pdf' => 'fa-file-pdf text-red-500',
            'word' => 'fa-file-word text-blue-600',
            'excel' => 'fa-file-excel text-green-600',
            'spreadsheet' => 'fa-file-excel text-green-600',
            'presentation' => 'fa-file-powerpoint text-orange-500',
            'text/plain' => 'fa-file-lines text-slate-400',

            // Архиви
            'zip' => 'fa-file-zipper text-amber-500',
            'rar' => 'fa-file-zipper text-amber-500',
            'compressed' => 'fa-file-zipper text-amber-500',

            // Видео и Аудио
            'video' => 'fa-file-video text-purple-500',
            'audio' => 'fa-file-audio text-pink-500',

            // Код
            'javascript' => 'fa-file-code text-yellow-500',
            'json' => 'fa-file-code text-yellow-500',
            'html' => 'fa-file-code text-orange-600',
        ];

        foreach ($icons as $key => $icon) {
            if (str_contains($mimeType, $key)) {
                return $icon;
            }
        }

        return 'fa-file text-slate-300';
    }
}
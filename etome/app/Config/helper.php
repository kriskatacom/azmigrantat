<?php

use App\Core\View;

if (!function_exists('view')) {
    function view($view, $data = [])
    {
        return View::render($view, $data);
    }
}

if (!function_exists('getTranslatable')) {
    function getTranslatable(string $type, string|null $key = null): array
    {
        $file = BASE_PATH . "/app/Config/Translatable/{$type}.php";

        if (!file_exists($file)) {
            return [];
        }

        $config = require $file;

        if ($key) {
            return $config[$key] ?? [];
        }

        return $config;
    }
}

if (!function_exists('getFileIcon')) {
    function getFileIcon($filename)
    {
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        return match ($ext) {
            'php'  => '<i class="fa-brands fa-php text-indigo-400 mr-2"></i>',
            'env'  => '<i class="fa-solid fa-key text-amber-400 mr-2"></i>',
            'json' => '<i class="fa-solid fa-code text-emerald-400 mr-2"></i>',
            'js'   => '<i class="fa-brands fa-js text-yellow-400 mr-2"></i>',
            'css'  => '<i class="fa-brands fa-css3 text-blue-400 mr-2"></i>',
            'webp', 'jpg', 'png', 'svg' => '<i class="fa-solid fa-image text-purple-400 mr-2"></i>',
            default => '<i class="fa-solid fa-file text-slate-500 mr-2"></i>'
        };
    }
}

if (!function_exists('format_phone')) {
    function format_phone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        $cleaned = preg_replace('/[^\d+]/', '', $phone);

        if (str_starts_with($cleaned, '00359')) {
            $cleaned = '+' . substr($cleaned, 2);
        }

        if (preg_match('/^\+359(8[789]\d)(\d{3})(\d{3})$/', $cleaned, $matches)) {
            return "+359 {$matches[1]} {$matches[2]} {$matches[3]}";
        }

        if (preg_match('/^0(8[789]\d)(\d{3})(\d{3})$/', $cleaned, $matches)) {
            return "0{$matches[1]} {$matches[2]} {$matches[3]}";
        }

        if (str_starts_with($cleaned, '+')) {
            return '+' . implode(' ', str_split(substr($cleaned, 1), 3));
        }

        return implode(' ', str_split($cleaned, 3));
    }
}

if (!function_exists('get_first_sentence')) {
    function get_first_sentence(?string $text): string
    {
        if (empty($text)) {
            return '';
        }

        if (preg_match('/^.*?[.!?](?:\s|$)/u', $text, $matches)) {
            return trim($matches[0]);
        }

        return trim($text);
    }
}

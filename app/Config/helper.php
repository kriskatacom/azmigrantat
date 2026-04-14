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

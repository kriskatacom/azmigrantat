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

if (!function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, $_ENV)) {
            return $_ENV[$key];
        }

        if (array_key_exists($key, $_SERVER)) {
            return $_SERVER[$key];
        }

        $value = getenv($key);

        return $value === false ? $default : $value;
    }
}

if (!function_exists('app_log')) {
    function app_log(string $message): void
    {
        $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
        $file = defined('ROOT')
            ? ROOT . '/app/storage/logs/app_errors.log'
            : __DIR__ . '/../storage/logs/app_errors.log';

        $directory = dirname($file);

        if (!is_dir($directory)) {
            @mkdir($directory, 0777, true);
        }

        $written = @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        if ($written === false) {
            error_log('[app_log write failed] ' . $message);
            return;
        }

        error_log($message);
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

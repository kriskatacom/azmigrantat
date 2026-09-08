<?php

namespace App\Core;

class View
{
    public static function isHome(): bool
    {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $trimmedPath = trim($path, '/');

        return $trimmedPath === '' || $trimmedPath === 'index.php';
    }
    
    public static function render($view, $data = [])
    {
        extract($data);

        ob_start();
        include __DIR__ . '/../Views/' . $view . '.php';
        $content = ob_get_clean();

        $layoutName = $data['layout'] ?? 'layout';
        $layoutPath = __DIR__ . '/../Views/layouts/' . $layoutName . '.php';

        if (file_exists($layoutPath)) {
            include $layoutPath;
        } else {
            include __DIR__ . '/../Views/layouts/layout.php';
        }
    }

    public static function loadPartial($path, $data = [])
    {
        extract($data);

        $filePath = __DIR__ . '/../Views/' . $path . '.php';

        if (file_exists($filePath)) {
            include $filePath;
        } else {
            echo "";
        }
    }

    public static function component(string $componentName, string $folder = "components", array $data = [])
    {
        extract($data);

        $folderPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $folder);

        $filePath = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'Views' . DIRECTORY_SEPARATOR . $folderPath . DIRECTORY_SEPARATOR . $componentName . '.php';

        if (file_exists($filePath)) {
            include $filePath;
        } else {
            error_log("Component not found: " . $filePath);
            if ($_ENV['DEBUG'] ?? true) echo "";
        }
    }
}

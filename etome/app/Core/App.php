<?php

namespace App\Core;

use Dotenv\Dotenv;

class App
{
    public static function bootstrap(): void
    {
        $dotenv = Dotenv::createImmutable(BASE_PATH);
        $dotenv->load();

        require_once BASE_PATH . '/app/Config/constants.php';
        require_once BASE_PATH . '/app/Config/helper.php';
        require_once BASE_PATH . '/app/Config/bootstrap.php';
    }

    public function initSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            try {
                session_start();
            } catch (\Exception $e) {
                $this->renderDatabaseError();
            }
        }
    }

    private function renderDatabaseError(): void
    {
        $currentUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if (str_contains($currentUri, '/install')) {
            return;
        }

        if (ob_get_level() > 0)
            ob_end_clean();

        Redirect::to('/install');
    }

    public function initLanguage(): string
    {
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        return rtrim($requestUri, '/') ?: '/';
    }

    public function dispatch(string $routePath): void
    {
        $router = require_once __DIR__ . '/../../routes/web.php';

        if ($router instanceof \App\Core\Router) {
            $router->resolve($routePath);
        } else {
            $this->abort(500);
        }
    }

    private function abort(int $code = 404): void
    {
        http_response_code($code);
        echo "<h1>$code - Системна грешка</h1>";
        exit;
    }
}
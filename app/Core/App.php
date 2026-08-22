<?php

namespace App\Core;

use App\Services\EnvConfig;
use Dotenv\Dotenv;

class App
{
    public static string $defaultLang = LANGUAGES['default'];
    public static array $supportedLangs = LANGUAGES['supported'];

    public static function getLangNames(): array
    {
        return array_combine(
            array_keys(LANGUAGES['data']),
            array_column(LANGUAGES['data'], 'name')
        );
    }

    public static function getLangFlags(): array
    {
        return array_combine(
            array_keys(LANGUAGES['data']),
            array_column(LANGUAGES['data'], 'flag')
        );
    }

    public static function bootstrap(): void
    {
        $dotenv = Dotenv::createImmutable(BASE_PATH);
        $dotenv->load();

        require_once BASE_PATH . '/app/Config/constants.php';
        require_once BASE_PATH . '/app/Config/helper.php';
        require_once BASE_PATH . '/app/Config/bootstrap.php';

        EnvConfig::apply();

        require_once BASE_PATH . '/app/Config/company.php';
        require_once BASE_PATH . '/app/Config/sidebar.php';

        header("Access-Control-Allow-Origin: " . ($_ENV['ETOME_BASE_URL'] ?? '*'));
        header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
        header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
    }

    public function initSession(): void
    {
        if (session_status() !== PHP_SESSION_NONE) {
            return;
        }

        session_start();
    }

    public function initLanguage(): string
    {
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if (strpos($requestUri, '/public') === 0) {
            $requestUri = substr($requestUri, 7);
        }

        $parts = explode('/', trim($requestUri, '/'));

        if (isset($parts[0]) && in_array($parts[0], self::$supportedLangs)) {
            $_SESSION['lang'] = $parts[0];
            $routePath = '/' . implode('/', array_slice($parts, 1));
        } else {
            $_SESSION['lang'] = self::$defaultLang;
            $routePath = $requestUri;
        }

        return rtrim($routePath, '/') ?: '/';
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

<?php

namespace App\Core;

class Router
{
    protected array $routes = [];

    public function get(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    private function addRoute(string $method, string $path, array $handler, array $middlewares): void
    {
        $this->routes[$method][$path] = [
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function resolve(?string $path = null): void
    {
        $path = $path ?? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if (strpos($path, '/public') === 0) {
            $path = substr($path, 7);
        }

        $path = rtrim($path, '/') ?: '/';
        $method = $_SERVER['REQUEST_METHOD'];

        if (isset($this->routes[$method])) {
            foreach ($this->routes[$method] as $routePath => $routeData) {
                $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\*\}/', '(.+)', $routePath);
                $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $pattern);
                $pattern = "#^" . $pattern . "$#";

                if (preg_match($pattern, $path, $matches)) {
                    array_shift($matches);

                    $handler = $routeData['handler'];
                    $middlewares = $routeData['middlewares'];

                    foreach ($middlewares as $middlewareClass) {
                        if (class_exists($middlewareClass)) {
                            $middleware = new $middlewareClass();
                            $middleware->handle();
                        }
                    }

                    $controllerClass = $handler[0];
                    $methodName = $handler[1];

                    if (class_exists($controllerClass)) {
                        $controller = new $controllerClass();
                        $params = array_map('urldecode', $matches);

                        if (method_exists($controller, $methodName)) {
                            if (method_exists($controller, 'callAction')) {
                                $controller->callAction($methodName, $params);
                            } else {
                                call_user_func_array([$controller, $methodName], $params);
                            }
                            return;
                        }
                    }
                }
            }
        }

        http_response_code(404);
        echo "404 - Page Not Found (Path: " . htmlspecialchars($path) . ")";
    }
}
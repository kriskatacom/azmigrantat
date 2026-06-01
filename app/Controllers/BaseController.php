<?php

namespace App\Controllers;

use App\Core\Session;
use App\Core\View;
use App\Helpers\SecurityHelper;
use App\Services\MediaService;
use App\Services\OpenGraphService;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class HandleExceptions
{
}

abstract class BaseController
{
    protected function validateSpam()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!SecurityHelper::checkCsrf()) {
                error_log("CSRF Attack Blocked from IP: " . $_SERVER['REMOTE_ADDR']);
                $this->redirect('/');
            }

            if (!SecurityHelper::checkSpam()) {
                $this->redirect('/');
            }
        }
    }

    protected function flash($type, $message)
    {
        Session::setFlash($type, $message);
    }

    protected function renderWithSeo(string $viewPath, array $seoData, array $additionalData = [])
    {
        $data['currentPageId'] = $data['currentPageId'] ?? null;
        $this->executeRender($viewPath, $seoData, $additionalData, 'main');
    }

    protected function renderWithLayout(string $viewPath, array $seoData, array $additionalData = [], $layout = 'admin')
    {
        $this->executeRender($viewPath, $seoData, $additionalData, $layout);
    }

    private function executeRender(string $viewPath, array $seoData, array $additionalData, string $layout)
    {
        $ogService = new OpenGraphService($seoData);

        $data = array_merge([
            'title' => $seoData['meta_title'] ?? $seoData['title'] ?? WEBSITE_DOMAIN_NAME,
            'description' => $seoData['meta_description'] ?? '',
            'keywords' => $seoData['meta_keywords'] ?? '',
            'og_image' => $seoData['og_image'] ?? '',
            'og_tags' => $ogService->renderTags(),
            'layout' => $layout
        ], $additionalData);

        View::render($viewPath, $data);
    }

    protected function redirect($url)
    {
        session_write_close();
        header("Location: " . $url);
        exit();
    }

    protected function redirectBack($fallback = '/')
    {
        $url = $_SERVER['HTTP_REFERER'] ?? $fallback;
        $this->redirect($url);
    }

    protected function json($data, int $status = 200)
    {
        header('Content-Type: application/json');
        http_response_code($status);
        echo json_encode($data);
        exit();
    }

    protected function view(string $view, array $data = [])
    {
        extract($data);

        $viewFile = "../app/Views/{$view}.php";

        if (file_exists($viewFile)) {
            require_once $viewFile;
        } else {
            die("Грешка: Изгледът [{$view}] не е намерен в {$viewFile}");
        }
    }

    protected function isAjax(): bool
    {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
            strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    protected function validateRequest(array $fields): ?array
    {
        $data = [];
        foreach ($fields as $field => $filter) {
            $value = filter_input(INPUT_POST, $field, $filter);

            if ($value === null || $value === false || $value === "") {
                return null;
            }
            $data[$field] = $value;
        }
        return $data;
    }

    protected function validateFiles(string $key, array $allowedTypes = [], int $maxSize = 5242880): ?array
    {
        if (!isset($_FILES[$key])) {
            return null;
        }

        if ($_FILES[$key]['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $file = $_FILES[$key];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $phpErrors = [
                1 => 'Файлът е твърде голям (php.ini).',
                2 => 'Файлът е твърде голям (HTML form).',
                3 => 'Частично качване.',
                4 => 'Няма файл.',
                6 => 'Липсва временна папка.',
                7 => 'Грешка при запис на диска.',
                8 => 'PHP разширение спря качването.'
            ];
            return ['error' => $phpErrors[$file['error']] ?? 'Системна грешка при качване.'];
        }

        if ($file['size'] > $maxSize) {
            return ['error' => 'Файлът е твърде голям (макс. 5MB).'];
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!empty($allowedTypes) && !in_array($ext, $allowedTypes)) {
            return ['error' => 'Невалиден формат: ' . $ext];
        }

        return $file;
    }

    protected function paginateQuery($query, array $searchFields = [], int $perPage = 10)
    {
        $search = $_GET['search'] ?? '';
        $sort = $_GET['sort'] ?? 'created_at';
        $order = $_GET['order'] ?? 'desc';

        if (!empty($search) && !empty($searchFields)) {
            $query->where(function ($q) use ($search, $searchFields) {
                foreach ($searchFields as $field) {
                    $q->orWhere($field, 'LIKE', "%{$search}%");
                }
            });
        }

        return $query->orderBy($sort, $order)
            ->paginate($perPage)
            ->appends($_GET);
    }

    protected function handleImageUploads(array $imageKeys): array
    {
        $mediaService = new MediaService();
        $results = [];

        foreach ($imageKeys as $key) {
            $removeKey = "remove_options";
            if (isset($_POST[$removeKey][$key]) && $_POST[$removeKey][$key] == "1") {
                $results[$key] = null;
                continue;
            }

            if (isset($_FILES['options']['name'][$key]) && $_FILES['options']['error'][$key] === UPLOAD_ERR_OK) {
                try {
                    $fileData = [
                        'name' => $_FILES['options']['name'][$key],
                        'type' => $_FILES['options']['type'][$key],
                        'tmp_name' => $_FILES['options']['tmp_name'][$key],
                        'error' => $_FILES['options']['error'][$key],
                        'size' => $_FILES['options']['size'][$key],
                    ];

                    $media = $mediaService->upload($fileData);
                    $results[$key] = $media->file_path;
                } catch (\Exception $e) {
                    continue;
                }
            }
        }

        return $results;
    }

    protected function abort404()
    {
        (new ErrorController())->notFound();
        exit;
    }

    protected function abort403()
    {
        (new ErrorController())->forbidden();
        exit;
    }

    public function callAction($method, $parameters = [])
    {
        $reflection = new \ReflectionMethod($this, $method);
        $attributes = $reflection->getAttributes(HandleExceptions::class);

        try {
            return $this->{$method}(...$parameters);
        } catch (\Exception $e) {
            if (!empty($attributes)) {
                $this->flash('error', $e->getMessage());
                $this->redirect($_SERVER['HTTP_REFERER'] ?? '/');
            }

            throw $e;
        }
    }

    protected function redirectTrashOrIndex($model, $path)
    {
        $remainingTrashCount = $model::onlyTrashed()->count();
        return ($remainingTrashCount === 0)
            ? $this->redirect("/admin/$path?tab=all")
            : $this->redirect("/admin/$path?tab=trash");
    }
}

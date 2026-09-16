<?php

namespace App\Controllers;

use App\Core\View;
use App\Services\ApiClient;
use App\Services\OpenGraphService;
use Exception;

class HomeController
{
    private ApiClient $api;

    public function __construct()
    {
        $this->api = new ApiClient(AUTH_SERVER_URL);
    }

    public function home()
    {
        $ogTagsHtml = $this->getOpenGraphTags();

        return View::render('index/home/index', [
            'title' => 'Etome.bg',
            'og_tags' => $ogTagsHtml
        ]);
    }

    public function categories()
    {
        $categoriesData = ['items' => [], 'parent' => null, 'breadcrumbs' => []];
        $parentId = $_GET['parent_id'] ?? null;

        try {
            $endpoint = '/api/categories';
            if ($parentId !== null && $parentId !== '') {
                $endpoint .= '?parent_id=' . urlencode($parentId);
            }

            $categoriesData = $this->api->get($endpoint);

        } catch (Exception $e) {
            error_log("Грешка при взимане на категории: " . $e->getMessage());
        }

        $ogTagsHtml = $this->getOpenGraphTags();

        return View::render('index/categories/index', [
            'title' => 'Категории - Etome.bg',
            'categories' => $categoriesData['items'] ?? [],
            'parentCategory' => $categoriesData['parent'] ?? null,
            'breadcrumbs' => $categoriesData['breadcrumbs'] ?? [],
            'og_tags' => $ogTagsHtml
        ]);
    }

    public function account($id)
    {
        $accountData = null;

        try {
            $endpoint = '/api/users/account';
            if ($id !== null && $id !== '') {
                $endpoint .= '?id=' . urlencode($id);
            }

            $accountData = $this->api->get($endpoint);
        } catch (Exception $e) {
            error_log($e->getMessage());
        }

        $title = $accountData['user']['name'] . ' - Etome.bg';
        
        $ogService = new OpenGraphService([
            'title' => $title,
            'description' => get_first_sentence($accountData['user']['options']['bio'] ?? ''),
            'image_desktop' => $accountData['user']['options']['profile_image'] ?? ''
        ]);

        return View::render('index/account/index', [
            'title' => $accountData['user']['name'],
            'account' => $accountData['user'] ?? null,
            'posts' => $accountData['posts'] ?? null,
            'og_tags' => $ogService->renderTags(),
        ]);
    }

    public function getSinglePost($id)
    {
        if (empty($id)) {
            return null;
        }

        try {
            $response = $this->api->get('/api/posts/' . urlencode($id));
            return $response['post'] ?? null;
        } catch (Exception $e) {
            error_log("Грешка при взимане на единична публикация: " . $e->getMessage());
            return null;
        }
    }

    public function showPost($id)
    {
        $post = null;

        try {
            $response = $this->api->get('/api/posts/' . urlencode($id));
            $post = $response['post'] ?? null;
        } catch (Exception $e) {
            error_log("Грешка при взимане на публикация: " . $e->getMessage());
        }

        if (!$post) {
            http_response_code(404);
            return View::render('errors/404', [
                'title' => 'Публикацията не е намерена - Etome.bg'
            ]);
        }

        $ogService = new OpenGraphService([
            'title' => ($post['name'] ?? 'Публикация') . ' - Etome.bg',
            'description' => htmlspecialchars(get_first_sentence($post['content'] ?? '')),
            'image_desktop' => $post['options']['main_image'] ?? '/assets/images/etome-bg-og-image.jpg',
        ]);

        return View::render('index/posts/show', [
            'title' => ($post['name'] ?? 'Публикация') . ' - Etome.bg',
            'post' => $post,
            'user' => $post['user'] ?? null,
            'og_tags' => $ogService->renderTags()
        ]);
    }

    public function search()
    {
        $title = 'Търсене на публикации';

        $ogService = new OpenGraphService([
            'title' => $title,
            'description' => 'Можете да намерите всяка публикация по име, съдържание или категория.',
        ]);

        return View::render('index/search/index', [
            'title' => $title,
            'og_tags' => $ogService->renderTags(),
        ]);
    }

    private function getOpenGraphTags(): string
    {
        $ogService = new OpenGraphService([
            'title' => 'Etome.bg',
            'description' => 'Etome.bg - Платформа за мигранти и бежанци в България. Открийте полезна информация, ресурси и услуги, които ще ви помогнат да се интегрирате успешно в новата среда.',
            'image_desktop' => '/assets/images/etome-bg-og-image.jpg',
        ]);

        return $ogService->renderTags();
    }
}
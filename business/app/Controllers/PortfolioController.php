<?php

namespace App\Controllers;

use App\Core\View;
use App\Services\OpenGraphService;

class PortfolioController
{
    private function renderWithSeo(string $viewPath, array $seoData)
    {
        $seoData['title'] = $seoData['title'] . ' - ' . WEBSITE_NAME;

        $ogService = new OpenGraphService($seoData);

        return View::render($viewPath, [
            'title'   => $seoData['title'],
            'og_tags' => $ogService->renderTags()
        ]);
    }

    public function projects()
    {
        $this->renderWithSeo('index/projects/index', [
            'title'       => 'Портфолио | Моите проекти',
            'description' => 'Разгледайте завършените от мен проекти за клиенти от Дупница и страната. От бизнес сайтове до сложни уеб приложения с фокус върху UI/UX и скорост.',
        ]);
    }
}
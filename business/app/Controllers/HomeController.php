<?php

namespace App\Controllers;

use App\Core\View;
use App\Services\OpenGraphService;

class HomeController
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

    public function index()
    {
        $this->renderWithSeo('index/home/index', [
            'title'       => 'Професионална разработка на уеб сайтове',
            'description' => 'Превръщам идеите ти в модерни дигитални решения. Специализиран в изработка на бързи, сигурни и SEO оптимизирани уеб приложения.',
        ]);
    }

    public function websiteDevelopment()
    {
        $this->renderWithSeo('index/services/website-development/index', [
            'title'       => 'Изработка на професионални уеб сайтове',
            'description' => 'Персонализирана изработка на бизнес сайтове, онлайн магазини и портали с фокус върху скоростта и конверсията.',
        ]);
    }

    public function about()
    {
        $this->renderWithSeo('index/about/index', [
            'title'       => 'За мен',
            'description' => 'Научете повече за моя опит, технологиите, които използвам, и философията ми при изграждането на софтуерни продукти.',
        ]);
    }

    public function contacts()
    {
        $this->renderWithSeo('index/contacts/index', [
            'title'       => 'Контакти | Свържете се с мен',
            'description' => 'Имате проект или идея? Нека поговорим. Изпратете запитване за безплатна консултация и анализ.',
        ]);
    }

    public function privacy()
    {
        $this->renderWithSeo('index/privacy-policy/index', [
            'title'       => 'Политика за поверителност',
            'description' => 'Научете как събираме, използваме и защитаваме вашите лични данни. Прозрачност и сигурност при използването на нашите услуги за изработка на уебсайтове.',
        ]);
    }
}

<?php

namespace App\Controllers;

use App\Core\View;
use App\Services\OpenGraphService;

class CityController
{
    private function renderWithSeo(string $viewPath, array $seoData)
    {
        $seoData['title'] = $seoData['title'] . ' - ' . WEBSITE_NAME;

        $ogService = new OpenGraphService($seoData);

        return View::render($viewPath, [
            'title'   => $seoData['title'],
            'og_tags' => $ogService->renderTags(),
            'city_name' => $seoData['city_name'] ?? ''
        ]);
    }

    public function dupnica()
    {
        $this->renderWithSeo('index/cities/dupnica/index', [
            'city_name'   => 'Дупница',
            'title'       => 'Изработка на уеб сайтове в Дупница',
            'description' => 'Професионални дигитални услуги за бизнеса в гр. Дупница. Изработка на бързи, модерни и оптимизирани уеб сайтове за местни фирми.',
        ]);
    }

    public function index()
    {
        $this->renderWithSeo('index/cities/index', [
            'title'       => 'Услуги по градове',
            'description' => 'Предлагам изработка на уеб сайтове и дигитален маркетинг за бизнеси в Дупница, София, Кюстендил и цялата страна.',
        ]);
    }

    public function sofia()
    {
        $this->renderWithSeo('index/cities/sofia/index', [
            'city_name'   => 'София',
            'title'       => 'Изработка на уеб сайтове София',
            'description' => 'Мащабируеми уеб решения за фирми в София. Разработка на онлайн магазини и корпоративни сайтове с висок клас дизайн.',
        ]);
    }
}

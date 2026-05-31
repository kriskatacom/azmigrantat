<?php

namespace App\Controllers;

class ErrorController extends BaseController
{
    public function notFound()
    {
        http_response_code(404);

        $seoData = [
            'title' => '404 - Страницата не е намерена',
            'meta_title' => 'Грешка 404 | ' . WEBSITE_DOMAIN_NAME,
            'meta_description' => 'Изглежда, че страницата, която търсите, не съществува или е преместена.'
        ];

        return $this->renderWithSeo('errors/404', $seoData, [
            'errorCode' => '404'
        ]);
    }

    public function forbidden()
    {
        http_response_code(403);

        $seoData = [
            'title' => '403 - Достъпът е забранен',
            'meta_title' => 'Грешка 403 | ' . WEBSITE_DOMAIN_NAME
        ];

        return $this->renderWithSeo('errors/403', $seoData);
    }

    public function serverError()
    {
        http_response_code(500);

        $seoData = [
            'title' => '500 - Системна грешка',
            'meta_title' => 'Грешка 500 | ' . WEBSITE_DOMAIN_NAME
        ];

        return $this->renderWithSeo('errors/500', $seoData);
    }
}

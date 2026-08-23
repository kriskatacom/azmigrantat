<?php

namespace App\Controllers;

class IndexController extends BaseController
{
    public function home()
    {
        $url = trim((string) ($_ENV['HOME_REDIRECT_URL'] ?? getenv('HOME_REDIRECT_URL') ?: ''));

        if ($url === '' || !preg_match('#^https?://#i', $url)) {
            $this->abort404();
        }

        $this->redirect($url);
    }
}

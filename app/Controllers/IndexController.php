<?php

namespace App\Controllers;

class IndexController extends BaseController
{
    public function home()
    {
        $this->redirect('https://azmigrantat.com');
    }
}

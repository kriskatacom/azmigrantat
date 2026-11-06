<?php

namespace App\Controllers;

use App\Core\View;
use App\Services\OpenGraphService;

final class LegalController
{
    public function privacy()
    {
        return $this->render('privacy', 'Политика за поверителност', 'Как „Ето ме“ обработва личните данни.');
    }

    public function terms()
    {
        return $this->render('terms', 'Общи условия', 'Правила за използване на „Ето ме“.');
    }

    public function accountDeletion()
    {
        return $this->render('account-deletion', 'Изтриване на акаунт', 'Как да изтриете акаунта и свързаните данни от „Ето ме“.');
    }

    private function render(string $page, string $title, string $description)
    {
        $og = new OpenGraphService(['title' => $title . ' – Ето ме', 'description' => $description]);

        return View::render('legal/' . $page, [
            'title' => $title . ' – Ето ме',
            'og_tags' => $og->renderTags(),
        ]);
    }
}

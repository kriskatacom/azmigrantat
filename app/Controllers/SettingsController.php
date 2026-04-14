<?php

namespace App\Controllers;

use App\Controllers\BaseController;

class SettingsController extends BaseController
{
    public function saveUiState()
    {
        $key = $_POST['key'] ?? null;
        $isOpen = $_POST['open'] === 'true';

        if ($key) {
            $_SESSION['ui_states'][$key] = $isOpen;
        }

        $this->json(['status' => 'success']);
    }
}
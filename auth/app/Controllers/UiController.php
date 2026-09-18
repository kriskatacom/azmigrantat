<?php

namespace App\Controllers;

use App\Core\Session;

final class UiController extends BaseController
{
    public function saveState(): void
    {
        $input = $_POST;
        if ($input === []) {
            $decoded = json_decode(file_get_contents('php://input') ?: '{}', true);
            $input = is_array($decoded) ? $decoded : [];
        }

        $key = trim((string) ($input['key'] ?? ''));
        if ($key === '' || !preg_match('/^section_[a-f0-9]{32}$/', $key)) {
            $this->json(['success' => false, 'message' => 'Невалиден ключ за UI състояние.'], 422);
        }

        $states = Session::get('ui_states', []);
        $states[$key] = filter_var($input['open'] ?? false, FILTER_VALIDATE_BOOLEAN);
        Session::set('ui_states', $states);

        $this->json(['success' => true]);
    }
}

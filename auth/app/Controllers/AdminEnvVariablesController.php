<?php

namespace App\Controllers;

use App\Helpers\SecurityHelper;
use App\Models\EnvVariable;
use App\Services\EnvConfig;

class AdminEnvVariablesController extends BaseController
{
    public function edit()
    {
        $password = $this->requirePagePassword();
        EnvConfig::syncCatalog();

        $groups = EnvVariable::query()
            ->orderBy('sort_order')
            ->get()
            ->groupBy('group_name');

        $this->renderWithLayout('admin/env-variables/index', [
            'title' => 'Променливи на средата',
        ], [
            'groups' => $groups,
            'pagePassword' => $password,
            'activeSource' => EnvConfig::source(),
        ]);
    }

    #[HandleExceptions]
    public function update()
    {
        $password = $this->requirePagePassword();

        if (!SecurityHelper::checkCsrf()) {
            $this->flash('error', 'Невалидна сесия. Опитайте отново.');
            return $this->redirect($this->pageUrl($password));
        }

        $posted = $_POST['env'] ?? [];
        if (!is_array($posted)) {
            $this->flash('error', 'Невалидни данни.');
            return $this->redirect($this->pageUrl($password));
        }

        $allowed = [];
        foreach (EnvConfig::definitions() as $definition) {
            $allowed[$definition['key']] = true;
        }

        foreach ($posted as $key => $values) {
            $key = (string) $key;
            if (!isset($allowed[$key]) || in_array($key, EnvConfig::FILE_ONLY_KEYS, true)) {
                continue;
            }

            if (!is_array($values)) {
                continue;
            }

            EnvVariable::query()->where('var_key', $key)->update([
                'dev_value' => (string) ($values['dev'] ?? ''),
                'prod_value' => (string) ($values['prod'] ?? ''),
            ]);
        }

        $this->flash('success', 'Променливите са записани. Активният източник се сменя от Настройки.');

        return $this->redirect($this->pageUrl($password));
    }

    private function requirePagePassword(): string
    {
        $provided = (string) ($_GET['password'] ?? $_POST['password'] ?? '');

        if (!EnvConfig::passwordMatches($provided)) {
            $this->abort404();
        }

        return $provided;
    }

    private function pageUrl(string $password): string
    {
        return '/admin/env-variables?password=' . rawurlencode($password);
    }
}

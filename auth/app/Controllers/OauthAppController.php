<?php

namespace App\Controllers;

use App\Models\OauthApp;
use App\Traits\HasAdminTrait;
use Exception;
use Illuminate\Support\Facades\Validator;

class OauthAppController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(OauthApp::class, 'admin/oauth_apps/index', [
            'title' => 'Управление на SSO приложения',
            'resource_name' => 'apps',
            'search_fields' => ['name', 'client_id', 'redirect_uri'],
            'order_by' => 'created_at',
            'order_dir' => 'desc',
            'columns' => ['name', 'client_id', 'redirect_uri', 'is_active', 'created_at']
        ]);
    }

    public function create()
    {
        $this->renderWithLayout('admin/oauth_apps/form', ['title' => 'Ново SSO приложение'], [
            'application' => new OauthApp()
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'name' => 'required|min:2',
            'client_id' => 'required|unique:oauth_apps,client_id',
            'client_secret' => 'required',
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);

        $app = OauthApp::create($data);

        $this->flash('success', "Приложението '{$app->name}' беше регистрирано успешно!");
        return $this->redirect('/admin/oauth-apps/edit/' . $app->id);
    }

    public function edit($id)
    {
        $app = OauthApp::findOrFail($id);

        $this->renderWithLayout('admin/oauth_apps/form', ['title' => "Редактиране на {$app->name}"], [
            'application' => $app
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $app = OauthApp::findOrFail($id);

        $validator = Validator::make($_POST, [
            'name' => 'required',
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);

        $app->update($data);

        $this->flash('success', "Настройките бяха обновени.");
        return $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $app = OauthApp::findOrFail($id);
            $app->delete();
            $this->flash('info', 'Приложението е изтрито успешно.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриване.');
        }
        return $this->redirect('/admin/oauth-apps');
    }

    public function restore($id)
    {
        $app = OauthApp::onlyTrashed()->findOrFail($id);
        $app->restore();
        $this->flash('info', 'Приложението беше възстановено.');
        return $this->redirectTrashOrIndex(OauthApp::class, 'oauth-apps');
    }

    #[HandleExceptions]
    public function forceDelete($id)
    {
        $app = OauthApp::onlyTrashed()->findOrFail($id);
        $name = $app->name;
        $app->forceDelete();
        $this->flash('success', "Приложението '{$name}' беше окончателно премахнато от системата.");
        return $this->redirectTrashOrIndex(OauthApp::class, 'oauth-apps');
    }

    private function prepareData(array $input): array
    {
        $options = $input['options'] ?? [];

        $options['log_auth'] = isset($options['log_auth']) ? 1 : 0;

        $options['client_type'] = in_array(
            $options['client_type'] ?? 'confidential',
            ['confidential', 'public'],
            true
        )
            ? $options['client_type']
            : 'confidential';

        return [
            'name' => trim($input['name']),
            'client_id' => trim($input['client_id']),
            'client_secret' => trim($input['client_secret']),
            'redirect_uri' => trim($input['redirect_uri']),
            'is_active' => isset($input['is_active']) ? 1 : 0,
            'options' => $options,
        ];
    }
}

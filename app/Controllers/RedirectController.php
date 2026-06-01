<?php

namespace App\Controllers;

use App\Models\Redirect;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use App\Core\Auth;
use Exception;

class RedirectController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(Redirect::class, 'admin/redirects/index', [
            'title'         => 'Управление на пренасочвания (Redirects)',
            'resource_name' => 'redirects',
            'search_fields' => ['old_path', 'new_path', 'category', 'description'],
            'order_by'      => 'created_at',
            'order_dir'     => 'desc',
            'columns'       => ['old_path', 'new_path', 'status_code', 'hits_count', 'last_used_at', 'is_active']
        ]);
    }

    public function create()
    {
        $this->renderWithLayout('admin/redirects/form', ['title' => 'Ново пренасочване'], [
            'redirect' => new Redirect(),
            'statuses' => [301 => '301 (Permanent)', 302 => '302 (Temporary)']
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'old_path'    => 'required|min:1|unique:redirects,old_path',
            'new_path'    => 'required|min:1',
            'status_code' => 'required|in:301,302'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);
        $data['user_id'] = Auth::id();

        Redirect::create($data);

        $this->flash('success', "Пренасочването е създадено успешно.");
        $this->redirect('/admin/redirects');
    }

    public function edit($id)
    {
        $redirect = Redirect::findOrFail($id);

        $this->renderWithLayout('admin/redirects/form', ['title' => 'Редакция на пренасочване'], [
            'redirect' => $redirect,
            'statuses' => [301 => '301 (Permanent)', 302 => '302 (Temporary)']
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $redirect = Redirect::findOrFail($id);

        $rules = [
            'old_path'    => 'required|min:1|unique:redirects,old_path,' . $redirect->id,
            'new_path'    => 'required|min:1',
            'status_code' => 'required|in:301,302'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);
        $this->updateResource($redirect, $data);

        $this->flash('success', "Пренасочването е обновено.");
        $this->redirectBack();
    }

    public function resetStats($id)
    {
        $redirect = Redirect::findOrFail($id);
        $redirect->update([
            'hits_count'   => 0,
            'last_used_at' => null
        ]);

        $this->flash('info', 'Статистиката за това пренасочване беше нулирана.');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $redirect = Redirect::findOrFail($id);
            $redirect->delete();
            $this->flash('info', 'Пренасочването е преместено в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриване.');
        }
        return $this->redirectTrashOrIndex(Redirect::class, 'redirects');
    }

    public function restore($id)
    {
        $redirect = Redirect::onlyTrashed()->findOrFail($id);
        $redirect->restore();
        $this->flash('info', 'Пренасочването беше възстановено.');
        return $this->redirectTrashOrIndex(Redirect::class, 'redirects');
    }

    public function forceDelete($id)
    {
        $redirect = Redirect::onlyTrashed()->findOrFail($id);
        $redirect->forceDelete();
        $this->flash('success', 'Пренасочването беше окончателно изтрито.');
        return $this->redirectTrashOrIndex(Redirect::class, 'redirects');
    }

    private function prepareData(array $input): array
    {
        return [
            'old_path'    => '/' . ltrim(trim($input['old_path']), '/'),
            'new_path'    => trim($input['new_path']),
            'status_code' => (int)$input['status_code'],
            'category'    => trim($input['category'] ?? 'general'),
            'description' => trim($input['description'] ?? ''),
            'is_active'   => isset($input['is_active']) ? 1 : 0,
        ];
    }
}

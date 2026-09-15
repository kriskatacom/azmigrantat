<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\CompanyAd;
use App\Models\Company;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;

class CompanyAdController extends BaseController
{
    use HasAdminTrait;

    #[HandleExceptions]
    public function index($companyId)
    {
        $company = Company::findOrFail($companyId);

        CompanyAd::addGlobalScope('company_filter', function ($query) use ($companyId) {
            $query->where('company_id', $companyId);
        });

        return $this->resourceIndex(CompanyAd::class, 'admin/companies/ads/index', [
            'title'         => 'Обяви на ' . $company->name,
            'resource_name' => 'ads',
            'search_fields' => ['title'],
            'extra_data'    => [
                'company' => $company
            ]
        ]);
    }

    #[HandleExceptions]
    public function create($companyId)
    {
        $company = Company::findOrFail($companyId);

        return $this->renderAdmin('admin/companies/ads/form', [
            'title' => 'Нова обява'
        ], [
            'ad'       => new CompanyAd(['company_id' => $companyId]),
            'company'  => $company,
            'statuses' => [1 => 'Активна', 0 => 'Неактивна']
        ]);
    }

    #[HandleExceptions]
    public function store($companyId)
    {
        $validator = Validator::make($_POST, [
            'title'     => 'required|min:2',
            'is_active' => 'required'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $companyId);
        $ad = new CompanyAd();

        $this->updateResource($ad, $data, [
            'image_desktop',
            'image_tablet',
            'image_phone'
        ]);

        $this->flash('success', 'Обявата е създадена успешно!');
        $this->redirect("/admin/companies/{$companyId}/ads");
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $ad = CompanyAd::findOrFail($id);
        $company = Company::findOrFail($ad->company_id);

        return $this->renderAdmin('admin/companies/ads/form', [
            'title' => 'Редактиране на обява'
        ], [
            'ad'       => $ad,
            'company'  => $company,
            'statuses' => [1 => 'Активна', 0 => 'Неактивна']
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $ad = CompanyAd::findOrFail($id);

        $validator = Validator::make($_POST, [
            'title' => 'required|min:2'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $ad->company_id);

        $this->updateResource($ad, $data, [
            'image_desktop',
            'image_tablet',
            'image_phone'
        ]);

        $this->flash('success', 'Обявата е обновена!');
        $this->redirect("/admin/ads/edit/$id");
    }

    #[HandleExceptions]
    public function delete($id)
    {
        $item = CompanyAd::findOrFail($id);
        $companyId = $item->company_id;
        $item->delete();

        $this->flash('info', 'Обявата беше преместена в кошчето.');

        $currentTab = $_GET['tab'] ?? 'all';
        return $this->redirectSmart($companyId, $currentTab);
    }

    #[HandleExceptions]
    public function restore($id)
    {
        $item = CompanyAd::onlyTrashed()->findOrFail($id);
        $companyId = $item->company_id;

        $item->is_active = false;
        $item->restore();
        $item->save();

        $this->flash('success', 'Обявата беше възстановена успешно като неактивна.');

        return $this->redirectSmart($companyId, 'trash');
    }

    #[HandleExceptions]
    public function forceDelete($id)
    {
        $item = CompanyAd::onlyTrashed()->findOrFail($id);
        $companyId = $item->company_id;
        $item->forceDelete();

        $this->flash('info', 'Обявата беше изтрита завинаги.');
        return $this->redirectSmart($companyId, 'trash');
    }

    public function toggleStatus($id)
    {
        $ad = CompanyAd::findOrFail($id);
        $ad->is_active = !$ad->is_active;
        $ad->save();

        $status = $ad->is_active ? 'активирана' : 'деактивирана';
        $this->flash('success', "Обявата беше {$status} успешно!");

        return $this->redirectSmart($ad->company_id, $_GET['tab'] ?? 'all');
    }

    protected function redirectSmart($companyId, $currentTab)
    {
        $query = CompanyAd::query()->where('company_id', $companyId);

        switch ($currentTab) {
            case 'trash':
                $query->onlyTrashed();
                break;
            case 'active':
                $query->where('is_active', true);
                break;
            case 'inactive':
                $query->where('is_active', false);
                break;
            case 'all':
            default:
                break;
        }

        $remainingCount = $query->count();
        $baseUrl = "/admin/companies/{$companyId}/ads";

        if ($remainingCount === 0) {
            return ($currentTab === 'trash')
                ? $this->redirect($baseUrl . "?tab=all")
                : $this->redirect($baseUrl . "?tab=trash");
        }

        return $this->redirect($baseUrl . "?tab=" . $currentTab);
    }

    protected function redirectTrashOrIndex($model, $path)
    {
        return $this->redirectSmart($path, $_GET['tab'] ?? 'all');
    }

    private function prepareData(array $input, $companyId): array
    {
        return [
            'company_id' => $companyId,
            'user_id'    => Auth::id(),
            'title'      => $input['title'],
            'sort_order' => (int)($input['sort_order'] ?? 0),
            'is_active'  => (bool)($input['is_active'] ?? false),
            'options'    => $input['options'] ?? []
        ];
    }
}

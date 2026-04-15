<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\CompanyService;
use App\Models\Company;
use App\Traits\HasAdminTrait;
use Exception;
use Illuminate\Support\Facades\Validator;

class CompanyServiceController extends BaseController
{
    use HasAdminTrait;

    #[HandleExceptions]
    public function index($companyId)
    {
        $company = Company::findOrFail($companyId);

        CompanyService::addGlobalScope('company_filter', function ($query) use ($companyId) {
            $query->where('company_id', $companyId);
        });

        return $this->resourceIndex(CompanyService::class, 'admin/companies/services/index', [
            'title'         => 'Услуги на ' . $company->name,
            'resource_name' => 'services',
            'search_fields' => ['name'],
            'extra_data'    => [
                'company' => $company
            ]
        ]);
    }

    #[HandleExceptions]
    public function create($companyId)
    {
        $company = Company::findOrFail($companyId);

        return $this->renderAdmin('admin/companies/services/form', [
            'title' => 'Добавяне на услуга'
        ], [
            'service' => new CompanyService(['company_id' => $companyId]),
            'company' => $company,
            'statuses' => [1 => 'Активна', 0 => 'Неактивна']
        ]);
    }

    #[HandleExceptions]
    public function store($companyId)
    {
        $validator = Validator::make($_POST, [
            'name'      => 'required|min:2',
            'is_active' => 'required'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $companyId);
        $service = new CompanyService();

        $this->updateResource($service, $data, [
            'image_desktop',
            'image_tablet',
            'image_phone'
        ]);

        $this->flash('success', 'Услугата е създадена успешно!');
        $this->redirect("/admin/companies/{$companyId}/services");
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $service = CompanyService::findOrFail($id);
        $company = Company::findOrFail($service->company_id);

        return $this->renderAdmin('admin/companies/services/form', [
            'title' => 'Редактиране на услуга'
        ], [
            'service' => $service,
            'company' => $company,
            'statuses' => [1 => 'Активна', 0 => 'Неактивна']
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $service = CompanyService::findOrFail($id);

        $validator = Validator::make($_POST, [
            'name'      => 'required|min:2'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $service->company_id);

        $this->updateResource($service, $data, [
            'image_desktop',
            'image_tablet',
            'image_phone'
        ]);

        $this->flash('success', 'Услугата е обновена!');
        $this->redirect("/admin/services/edit/$id");
    }

    #[HandleExceptions]
    public function delete($id)
    {
        $item = CompanyService::findOrFail($id);
        $companyId = $item->company_id;
        $item->delete();

        $this->flash('info', 'Услугата беше преместена в кошчето.');

        $currentTab = $_GET['tab'] ?? 'all';
        return $this->redirectSmart($companyId, $currentTab);
    }

    #[HandleExceptions]
    public function restore($id)
    {
        $item = CompanyService::onlyTrashed()->findOrFail($id);
        $companyId = $item->company_id;

        $item->is_active = false;
        $item->restore();
        $item->save();

        $this->flash('success', 'Услугата беше възстановена успешно като неактивна.');

        return $this->redirectSmart($companyId, 'trash');
    }

    #[HandleExceptions]
    public function forceDelete($id)
    {
        $item = CompanyService::onlyTrashed()->findOrFail($id);
        $companyId = $item->company_id;
        $item->forceDelete();

        $this->flash('info', 'Услугата беше изтрита завинаги.');
        return $this->redirectSmart($companyId, 'trash');
    }

    public function toggleStatus($id)
    {
        $service = CompanyService::findOrFail($id);
        $service->is_active = !$service->is_active;
        $service->save();

        $status = $service->is_active ? 'активирана' : 'деактивирана';
        $this->flash('success', "Услугата беше {$status} успешно!");

        return $this->redirectSmart($service->company_id, $_GET['tab'] ?? 'all');
    }

    protected function redirectSmart($companyId, $currentTab)
    {
        $query = CompanyService::query()->where('company_id', $companyId);

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
        $baseUrl = "/admin/companies/{$companyId}/services";

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
            'name'       => $input['name'],
            'sort_order' => (int)($input['sort_order'] ?? 0),
            'is_active'  => (bool)($input['is_active'] ?? false),
            'options'    => $input['options'] ?? []
        ];
    }
}
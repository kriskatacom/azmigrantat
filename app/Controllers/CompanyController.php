<?php

namespace App\Controllers;

use App\Models\Company;
use App\Models\City;
use App\Models\BusinessCategory;
use App\Modules\Form;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class CompanyController extends BaseController
{
    use HasAdminTrait;

    public function show($citySlug, $catSlug, $slug)
    {
        $company = Company::active()
            ->where('slug', $slug)
            ->with(['city', 'category'])
            ->first();

        if (!$company) {
            $this->abort404();
        }

        $seoTitle = $company->name . ($company->company_slogan ? " - " . $company->company_slogan : "");
        $seoData = [
            'title'       => $seoTitle,
            'description' => $company->excerpt,
            'og_image'    => $company->image_url ?? null
        ];

        return $this->renderWithSeo('companies/show', $seoData, [
            'company'  => $company->toArray(),
            'city'     => $company->city,
            'category' => $company->category,
            'ads'      => [],
            'offers'   => [],
        ]);
    }

    public function index()
    {
        return $this->resourceIndex(Company::class, 'admin/companies/index', [
            'title'         => 'Управление на компании',
            'resource_name' => 'companies',
            'with'          => ['city', 'category'],
            'search_fields' => ['name', 'description', 'email', 'phone'],
            'features'      => []
        ]);
    }

    public function create()
    {
        $categories = Form::getTreeOptions(BusinessCategory::class, [], 'name', '-- Изберете категория --', 'name');

        $this->renderAdmin('admin/companies/form', ['title' => 'Нова компания'], [
            'company'    => new Company(),
            'cities'     => City::all(),
            'categories' => $categories,
            'users'      => \App\Models\User::all()
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'name'        => 'required|min:2',
            'slug'        => 'nullable|unique:companies,slug',
            'city_id'     => 'required|exists:cities,id',
            'category_id' => 'required|exists:business_categories,id'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);
        $company = new Company();

        $this->updateResource($company, $data, [
            'image_url',
            'offer_image_url',
            'ads_image_url',
            'bottom_image_url',
            'image_tablet',
            'image_mobile',
        ]);

        $this->flash('success', 'Компанията е създадена!');
        $this->redirect("/admin/companies/edit/{$company->id}");
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $company = Company::findOrFail($id);
        $categories = Form::getTreeOptions(BusinessCategory::class, [], 'name', '-- Изберете категория --', 'name');

        $this->renderAdmin('admin/companies/form', ['title' => 'Редакция: ' . $company->name], [
            'company'    => $company,
            'cities'     => City::all(),
            'categories' => $categories,
            'users'      => \App\Models\User::all()
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $company = Company::findOrFail($id);

        $rules = [
            'name'        => 'required|min:2',
            'slug'        => 'nullable|unique:companies,slug,' . $company->id,
            'city_id'     => 'required|exists:cities,id',
            'category_id' => 'required|exists:business_categories,id'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $company);

        // updateResource се грижи за изтриването на стари файлове и обновяването на JSON полето
        $this->updateResource($company, $data, [
            'image_url',
            'offer_image_url',
            'ads_image_url',
            'bottom_image_url',
            'image_tablet',
            'image_mobile',
        ]);

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $item = Company::findOrFail($id);
            $item->delete();
            $this->flash('info', 'Компанията е преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Компанията не може да бъде намерена.');
        }
        return $this->redirectTrashOrIndex(Company::class, 'companies');
    }

    private function prepareData(array $input, ?Company $company = null): array
    {
        return [
            'name'                 => $input['name'],
            'slug'                 => $input['slug'] ?: Str::slug($input['name']),
            'excerpt'              => $input['excerpt'] ?? '',
            'description'          => $input['description'] ?? '',
            'your_location'        => $input['your_location'] ?? null,
            'google_map'           => $input['google_map'] ?? null,
            'company_slogan'       => $input['company_slogan'] ?? null,
            'sort_order'           => (int)($input['sort_order'] ?? 0),
            'city_id'              => $input['city_id'],
            'category_id'          => $input['category_id'],
            'services_description' => $input['services_description'] ?? null,
            'facebook_page_link'   => $input['facebook_page_link'] ?? null,
            'website_link'         => $input['website_link'] ?? null,
            'email'                => $input['email'] ?? null,
            'phone'                => $input['phone'] ?? null,
            'address'              => $input['address'] ?? null,
            'working_time'         => $input['working_time'] ?? null,
            'is_active'            => isset($input['is_active']) ? 1 : 0,
            'options'              => $input['options'] ?? []
        ];
    }
}

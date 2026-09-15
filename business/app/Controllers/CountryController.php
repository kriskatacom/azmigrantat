<?php

namespace App\Controllers;

use App\Models\Country;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class CountryController extends BaseController
{
    use HasAdminTrait;

    public function __construct()
    {

    }

    public function show($slug)
    {
        $country = Country::where('slug', $slug)
            ->where('is_active', 1)
            ->first();

        if (!$country) {
            $this->abort404();
        }

        $seoTitle = $country->name . ($country->heading ? " - " . $country->heading : "");
        $seoData = [
            'title' => $seoTitle,
            'description' => $country->excerpt,
            'og_image' => $country->image_url ?? null
        ];

        return $this->renderWithSeo('countries/show', $seoData, [
            'country' => $country->toArray(),
        ]);
    }

    public function index()
    {
        return $this->resourceIndex(Country::class, 'admin/countries/index', [
            'title' => 'Управление на държави',
            'resource_name' => 'countries',
            'search_fields' => ['name', 'heading', 'excerpt'],
            'features' => []
        ]);
    }

    public function create()
    {
        $this->renderAdmin('admin/countries/form', ['title' => 'Нова държава'], [
            'country' => new Country(),
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:countries,slug',
            'excerpt' => 'required',
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST);
        $country = new Country();
        $country->fill($data);

        if (isset($_FILES['image_url'])) {
            $_FILES['options']['name']['image_url'] = $_FILES['image_url']['name'];
            $_FILES['options']['type']['image_url'] = $_FILES['image_url']['type'];
            $_FILES['options']['tmp_name']['image_url'] = $_FILES['image_url']['tmp_name'];
            $_FILES['options']['error']['image_url'] = $_FILES['image_url']['error'];
            $_FILES['options']['size']['image_url'] = $_FILES['image_url']['size'];
        }
        if (isset($_FILES['image_mobile_url'])) {
            $_FILES['options']['name']['image_mobile_url'] = $_FILES['image_mobile_url']['name'];
            $_FILES['options']['type']['image_mobile_url'] = $_FILES['image_mobile_url']['type'];
            $_FILES['options']['tmp_name']['image_mobile_url'] = $_FILES['image_mobile_url']['tmp_name'];
            $_FILES['options']['error']['image_mobile_url'] = $_FILES['image_mobile_url']['error'];
            $_FILES['options']['size']['image_mobile_url'] = $_FILES['image_mobile_url']['size'];
        }

        $uploadedImages = $this->handleImageUploads(['image_url', 'image_mobile_url']);

        if (isset($uploadedImages['image_url'])) {
            $country->image_url = $uploadedImages['image_url'];
        }
        if (isset($uploadedImages['image_mobile_url'])) {
            $country->image_mobile_url = $uploadedImages['image_mobile_url'];
        }

        $country->save();

        $this->flash('success', 'Държавата е създадена успешно!');
        $this->redirect("/admin/countries/edit/{$country->id}");
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $country = Country::findOrFail($id);

        $this->renderAdmin('admin/countries/form', ['title' => 'Редакция: ' . $country->name], [
            'country' => $country,
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $country = Country::findOrFail($id);

        $rules = [
            'name' => 'required|min:2',
            'slug' => 'nullable|unique:countries,slug,' . $country->id,
            'excerpt' => 'required',
            'layout' => 'required|in:primary,secondary',
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->prepareData($_POST, $country);
        $country->fill($data);

        // 1. Напасваме структурата на $_POST['remove_options'] спрямо вашите remove_image_url флагове$_POST['remove_options']['image_url'] = $_POST['remove_image_url'] ?? '0';
        $_POST['remove_options']['image_mobile_url'] = $_POST['remove_image_mobile_url'] ?? '0';

        if (isset($_FILES['image_url'])) {
            $_FILES['options']['name']['image_url'] = $_FILES['image_url']['name'];
            $_FILES['options']['type']['image_url'] = $_FILES['image_url']['type'];
            $_FILES['options']['tmp_name']['image_url'] = $_FILES['image_url']['tmp_name'];
            $_FILES['options']['error']['image_url'] = $_FILES['image_url']['error'];
            $_FILES['options']['size']['image_url'] = $_FILES['image_url']['size'];
        }
        if (isset($_FILES['image_mobile_url'])) {
            $_FILES['options']['name']['image_mobile_url'] = $_FILES['image_mobile_url']['name'];
            $_FILES['options']['type']['image_mobile_url'] = $_FILES['image_mobile_url']['type'];
            $_FILES['options']['tmp_name']['image_mobile_url'] = $_FILES['image_mobile_url']['tmp_name'];
            $_FILES['options']['error']['image_mobile_url'] = $_FILES['image_mobile_url']['error'];
            $_FILES['options']['size']['image_mobile_url'] = $_FILES['image_mobile_url']['size'];
        }

        $uploadedImages = $this->handleImageUploads(['image_url', 'image_mobile_url']);

        if (array_key_exists('image_url', $uploadedImages)) {
            $country->image_url = $uploadedImages['image_url'];
        }
        if (array_key_exists('image_mobile_url', $uploadedImages)) {
            $country->image_mobile_url = $uploadedImages['image_mobile_url'];
        }

        $country->save();

        $this->flash('success', 'Промените са запазени!');
        $this->redirectBack();
    }

    public function delete($id)
    {
        try {
            $item = Country::findOrFail($id);
            $item->delete();
            $this->flash('info', 'Държавата е преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Държавата не може да бъде намерена.');
        }
        return $this->redirectTrashOrIndex(Country::class, 'countries');
    }

    #[HandleExceptions]
    public function restore($id)
    {
        $country = Country::onlyTrashed()->findOrFail($id);
        $country->restore();

        $country->is_active = false;
        $country->save();

        $this->flash('success', 'Държавата беше възстановена успешно като неактивна.');

        return $this->redirect('/admin/countries?tab=inactive');
    }

    #[HandleExceptions]
    public function forceDelete($id)
    {
        $country = Country::onlyTrashed()->findOrFail($id);
        $country->forceDelete();

        $this->flash('info', 'Държавата беше изтрита завинаги от системата.');

        return $this->redirect('/admin/countries?tab=trash');
    }

    private function prepareData(array $input, ?Country $country = null): array
    {
        return [
            'name' => $input['name'],
            'slug' => $input['slug'] ?: Str::slug($input['name']),
            'heading' => $input['heading'] ?? null,
            'excerpt' => $input['excerpt'] ?? '',
            'layout' => !empty($input['layout']) ? $input['layout'] : 'secondary',
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'is_active' => (isset($input['is_active']) && $input['is_active'] === 'on') ? 1 : 0,
        ];
    }
}

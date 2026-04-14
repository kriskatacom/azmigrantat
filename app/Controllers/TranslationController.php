<?php

namespace App\Controllers;

use App\Models\Translation;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;

class TranslationController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        $search = $_GET['search'] ?? '';
        $activeTab = $_GET['tab'] ?? '';
        $activeSource = $_GET['source'] ?? '';

        $subQuery = Translation::query()
            ->select('translation_key', 'source')
            ->selectRaw("GROUP_CONCAT(DISTINCT CASE 
                    WHEN translation_value IS NOT NULL AND translation_value != '' 
                    THEN lang_code 
                END ORDER BY lang_code SEPARATOR ', ') as available_langs")
            ->selectRaw("MAX(created_at) as created_at")
            ->selectRaw("MAX(CASE WHEN lang_code = 'bg' THEN translation_value END) as base_value")
            ->groupBy('translation_key', 'source');

        if (!empty($activeSource)) {
            $subQuery->where('source', $activeSource);
        }

        if (!empty($activeTab)) {
            $subQuery->selectRaw("MAX(CASE WHEN lang_code = ? THEN translation_value END) as display_value", [$activeTab]);
        } else {
            $subQuery->selectRaw("MAX(CASE WHEN lang_code = 'bg' THEN translation_value END) as display_value");
        }

        if (!empty($search)) {
            $subQuery->where(function ($q) use ($search) {
                $q->where('translation_key', 'like', "%{$search}%")
                    ->orWhere('translation_value', 'like', "%{$search}%");
            });
        }

        $query = Translation::fromSub($subQuery, 't')
            ->select('*')
            ->reorder('created_at', 'desc');

        $translations = $this->paginateQuery($query, ['translation_key']);

        $this->renderAdmin('admin/translations/index', [
            'title' => 'Управление на преводи'
        ], [
            'translations' => $translations,
            'search'       => $search,
            'currentLang'  => $activeTab,
            'currentSource' => $activeSource,
            'stats'        => Translation::getStats()
        ]);
    }

    public function create()
    {
        $this->renderAdmin(
            'admin/translations/form',
            ['title' => 'Добавяне на нов превод'],
            ['translation' => new Translation()]
        );
    }

    #[HandleExceptions]
    public function store()
    {
        $rules = [
            'translation_key' => 'required|max:100',
            'translations'    => 'required|array'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', 'Моля, въведете валиден системен ключ.');
            return $this->redirectBack();
        }

        $key = $_POST['translation_key'];
        $translations = $_POST['translations'];

        $exists = Translation::where('translation_key', $key)->exists();

        if ($exists) {
            $this->flash('error', "Ключът '{$key}' вече се използва. Моля, използвайте друг или редактирайте съществуващия.");
            return $this->redirectBack();
        }

        $addedCount = 0;
        foreach ($translations as $langCode => $value) {
            if (trim($value) !== '') {
                Translation::create([
                    'lang_code'         => $langCode,
                    'translation_key'   => $key,
                    'translation_value' => $value,
                    'source' => 'static'
                ]);
                $addedCount++;
            }
        }

        if ($addedCount === 0) {
            $this->flash('error', 'Моля, въведете превод поне на един език.');
            return $this->redirectBack();
        }

        $this->flash('success', "Успешно добавени преводи на {$addedCount} езика за ключ: {$key}");
        $this->redirect('/admin/translations');
    }

    #[HandleExceptions]
    public function edit($key)
    {
        $key = urldecode($key);

        $translation = Translation::where('translation_key', $key)->first();

        if (!$translation) {
            $this->flash('error', 'Преводът не е намерен.');
            return $this->redirect('/admin/translations');
        }

        $this->renderAdmin('admin/translations/form', [
            'title' => "Редактиране на ключ: {$key}"
        ], [
            'translation' => $translation
        ]);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $baseTranslation = Translation::findOrFail($id);
        $key = $baseTranslation->translation_key;

        $translations = $_POST['translations'] ?? [];

        if (empty($translations['bg'])) {
            $this->flash('error', 'Българският превод е задължителен.');
            return $this->redirectBack();
        }

        foreach ($translations as $code => $value) {
            Translation::updateOrCreate(
                ['translation_key' => $key, 'lang_code' => $code],
                ['translation_value' => $value, 'group' => $_POST['group'] ?? 'messages']
            );
        }

        $this->flash('success', 'Всички преводи бяха обновени успешно.');
        $this->redirect('/admin/translations');
    }

    #[HandleExceptions]
    public function destroy($id)
    {
        $translation = Translation::findOrFail($id);
        $translation->delete();

        $this->flash('success', 'Преводът беше изтрит.');
        $this->redirect('/admin/translations');
    }

    public function getJsonTranslations($lang)
    {
        $translations = Translation::where('lang_code', $lang)
            ->pluck('translation_value', 'translation_key');

        return $this->json($translations);
    }
}

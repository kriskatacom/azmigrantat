<?php

namespace App\Controllers;

use App\Core\App;
use App\Models\Translation;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;

class TranslationController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        $_SESSION['last_translation_url'] = $_SERVER['REQUEST_URI'];

        $search = $_GET['search'] ?? '';
        $activeTab = $_GET['tab'] ?? '';
        $activeSource = $_GET['source'] ?? '';
        $activeGroup = $_GET['group'] ?? '';

        $groups = Translation::distinct()->pluck('group_key')->toArray();

        $subQuery = Translation::query()
            ->select('translation_key', 'source', 'group_key')
            ->selectRaw("GROUP_CONCAT(DISTINCT CASE 
            WHEN translation_value IS NOT NULL AND translation_value != '' 
            THEN lang_code 
        END ORDER BY lang_code SEPARATOR ', ') as available_langs")
            ->selectRaw("MAX(created_at) as created_at")
            ->selectRaw("MAX(CASE WHEN lang_code = 'bg' THEN translation_value END) as base_value")
            ->groupBy('translation_key', 'source', 'group_key');

        if (!empty($activeGroup)) {
            $subQuery->where('group_key', $activeGroup);
        }

        $totalLangsCount = count(array_merge([App::$defaultLang], App::$supportedLangs));

        if ($activeSource === 'untranslated') {
            $subQuery->havingRaw("COUNT(DISTINCT CASE WHEN translation_value IS NOT NULL AND translation_value != '' THEN lang_code END) < ?", [$totalLangsCount]);
        } elseif ($activeSource === 'translated') {
            $subQuery->havingRaw("COUNT(DISTINCT CASE WHEN translation_value IS NOT NULL AND translation_value != '' THEN lang_code END) >= ?", [$totalLangsCount]);
        } elseif (!empty($activeSource)) {
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
                    ->orWhere('translation_value', 'like', "%{$search}%")
                    ->orWhere('group_key', 'like', "%{$search}%");
            });
        }

        $query = Translation::fromSub($subQuery, 't')
            ->select('*')
            ->orderBy('created_at', 'desc');

        $translations = $this->paginateQuery($query, ['translation_key']);

        $this->renderAdmin('admin/translations/index', [
            'title' => 'Управление на преводи'
        ], [
            'translations'  => $translations,
            'search'        => $search,
            'currentLang'   => $activeTab,
            'currentSource' => $activeSource,
            'currentGroup'  => $activeGroup,
            'groups'        => $groups,
            'stats'         => Translation::getStats()
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
            'translations'    => 'required|array',
            'group_key'           => 'nullable|max:50',
            'source'          => 'required|in:static,dynamic'
        ];

        $validator = Validator::make($_POST, $rules);

        if ($validator->fails()) {
            $this->flash('error', 'Моля, попълнете правилно всички задължителни полета.');
            return $this->redirectBack();
        }

        $key = $_POST['translation_key'];
        $translations = $_POST['translations'];
        $group_key = $_POST['group_key'] ?? 'messages';
        $source = $_POST['source'] ?? 'dynamic';

        $exists = Translation::where('translation_key', $key)->exists();

        if ($exists) {
            $this->flash('error', "Ключът '{$key}' вече съществува в базата данни.");
            return $this->redirectBack();
        }

        $addedCount = 0;
        foreach ($translations as $langCode => $value) {
            if (trim($value) !== '') {
                Translation::create([
                    'lang_code'         => $langCode,
                    'translation_key'   => $key,
                    'translation_value' => $value,
                    'group_key'             => $group_key,
                    'source'            => $source,
                ]);
                $addedCount++;
            }
        }

        if ($addedCount === 0) {
            $this->flash('error', 'Трябва да въведете превод поне на един език.');
            return $this->redirectBack();
        }

        $this->flash('success', "Успешно добавен нов ключ '{$key}' с преводи на {$addedCount} езика.");
        return $this->redirect('/admin/translations');
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
        $group_key = $_POST['group_key'] ?? 'messages';
        $source = $_POST['source'] ?? 'dynamic';

        if (empty($translations['bg'])) {
            $this->flash('error', 'Основният превод (BG) е задължителен и не може да бъде празен.');
            return $this->redirectBack();
        }

        foreach ($translations as $code => $value) {
            $trimmedValue = trim($value);

            if ($trimmedValue === '' && $code !== 'bg') {
                Translation::where('translation_key', $key)
                    ->where('lang_code', $code)
                    ->delete();
            } else {
                Translation::updateOrCreate(
                    ['translation_key' => $key, 'lang_code' => $code],
                    [
                        'translation_value' => $trimmedValue,
                        'group_key' => $group_key,
                        'source' => $source
                    ]
                );
            }
        }

        $this->flash('success', "Преводите за ключ '{$key}' бяха обновени успешно.");
        $redirectUrl = $_SESSION['last_translation_url'] ?? '/admin/translations';
        return $this->redirect($redirectUrl);
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

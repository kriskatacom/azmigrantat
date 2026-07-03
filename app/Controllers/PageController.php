<?php

namespace App\Controllers;

use App\Core\App;
use App\Modules\Str;
use App\Models\Page;
use App\Modules\Form;
use App\Modules\TranslationManager;
use App\Traits\HasAdminTrait;
use Illuminate\Support\Facades\Validator;
use Exception;

class PageController extends BaseController
{
    use HasAdminTrait;

    public function azmigrantat()
    {
        $this->redirect(MAIN_WEBSITE_URL);
    }

    public function show(string|null $slug = '/')
    {
        $normalizedSlug = ($slug === null || $slug === 'home') ? '/home' : '/' . ltrim($slug, '/');

        $page = Page::where(function ($query) use ($normalizedSlug) {
            $query->where('slug', $normalizedSlug)
                ->orWhere('custom_path', $normalizedSlug);
        })
            ->where('is_active', 1)
            ->orderByRaw("CASE WHEN custom_path = ? THEN 1 ELSE 2 END", [$normalizedSlug])
            ->first();

        if (!$page) {
            $this->abort404();
        }

        if (!empty($page->custom_path) && $page->custom_path !== $normalizedSlug) {
            header("HTTP/1.1 301 Moved Permanently");
            $this->redirect($page->custom_path);
        }

        $pageElements = $this->parseElements($page->options ?? []);

        $seoData = [
            'title' => $page->title,
            'meta_title' => $page->options['meta_title'] ?? $page->title,
            'meta_description' => $page->options['meta_description'] ?? '',
            'meta_keywords' => $page->options['meta_keywords'] ?? '',
            'image_desktop' => $page->options['image_desktop'] ?? null,
            'image_tablet' => $page->options['image_tablet'] ?? null,
            'image_phone' => $page->options['image_phone'] ?? null,
        ];

        return $this->renderWithSeo($this->getViewPath($page), $seoData, [
            'page' => $page,
            'options' => $page->options ?? [],
            'el' => $pageElements,
            'currentPageId' => $page->id
        ]);
    }

    public function index()
    {
        return $this->resourceIndex(Page::class, 'admin/pages/index', [
            'title' => 'Управление на страници | Админ панел',
            'resource_name' => 'pages',
            'with' => ['children', 'parent'],
            'search_fields' => ['title', 'slug', 'content'],
            'order_by' => 'menu_order',
            'order_dir' => 'asc',
            'features' => ['hierarchical']
        ]);
    }

    public function create()
    {
        $parentOptions = Form::getTreeOptions(Page::class, [], 'name');

        $this->renderWithLayout('admin/pages/form', ['title' => 'Нова страница'], [
            'page' => new Page(),
            'parentOptions' => $parentOptions
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $validator = Validator::make($_POST, [
            'title' => 'required|min:2',
            'slug' => 'nullable|unique:pages,slug'
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->preparePageData($_POST);
        $page = new Page();

        $this->updateResource($page, $data, ['image_desktop', 'image_tablet', 'image_phone']);

        $this->flash('success', 'Страницата беше създадена успешно!');
        $this->redirect("/admin/pages/edit/{$page->id}");
    }

    public function edit($id)
    {
        $page = Page::findOrFail((int) $id);

        $data = $this->getFormData($page);

        $this->renderWithLayout('admin/pages/form', [
            'title' => "Редактиране: " . ($page->title ?? 'Страница')
        ], $data);
    }

    #[HandleExceptions]
    public function update($id)
    {
        $page = Page::findOrFail((int) $id);

        $validator = Validator::make($_POST, [
            'title' => 'required|min:2',
            'slug' => 'nullable|unique:pages,slug,' . $page->id
        ]);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $data = $this->preparePageData($_POST, $page);
        $this->updateResource($page, $data, ['image_desktop', 'image_tablet', 'image_phone']);

        if (isset($_POST['translations']) && is_array($_POST['translations'])) {
            TranslationManager::save(
                'pages',
                $page->id,
                $_POST['translations']
            );
        }

        $this->updateChildrenSlugs($page);

        $this->flash('success', 'Промените бяха запазени!');
        $this->redirectBack();
    }

    private function preparePageData(array $input, ?Page $page = null): array
    {
        $title = $input['title'] ?? '';
        $parentId = !empty($input['parent_id']) ? (int) $input['parent_id'] : null;

        $slugSource = !empty($input['slug']) ? $input['slug'] : $title;
        $finalSlug = $this->generateHierarchicalSlug($slugSource, $parentId);

        $customPath = !empty($input['custom_path'])
            ? '/' . ltrim(preg_replace('#/+#', '/', trim($input['custom_path'])), '/')
            : null;

        $options = $input['options'] ?? [];
        $options['meta_title'] = $options['meta_title'] ?: $title;
        $options['h1_title'] = $options['h1_title'] ?: $title;

        return [
            'title' => $title,
            'slug' => $finalSlug,
            'parent_id' => $parentId,
            'custom_path' => $customPath,
            'content' => $input['content'] ?? '',
            'template' => $input['template'] ?? 'default',
            'view_name' => $input['view_name'] ?? null,
            'is_active' => isset($input['is_active']) ? 1 : 0,
            'options' => $options
        ];
    }

    private function generateHierarchicalSlug(string $source, ?int $parentId): string
    {
        $parts = explode('/', trim($source, '/'));
        $currentPart = Str::slug(end($parts));

        if (!$parentId || !($parent = Page::find($parentId))) {
            return '/' . $currentPart;
        }

        $fullPath = rtrim($parent->slug, '/') . '/' . $currentPart;
        return preg_replace('#/+#', '/', $fullPath);
    }

    private function updateChildrenSlugs(Page $parent): void
    {
        $children = Page::where('parent_id', $parent->id)->get();

        foreach ($children as $child) {
            $parts = explode('/', rtrim($child->slug, '/'));
            $newSlug = preg_replace('#/+#', '/', rtrim($parent->slug, '/') . '/' . end($parts));

            if ($child->slug !== $newSlug) {
                $child->update(['slug' => $newSlug]);
                $this->updateChildrenSlugs($child);
            }
        }
    }

    private function getViewPath(Page $page): string
    {
        if ($page->template && $page->template !== 'none') {
            return "templates/{$page->template}";
        }
        return $page->view_name ? "index/$page->view_name/index" : "default";
    }

    private function parseElements(array $options): array
    {
        $elements = [];
        if (isset($options['elements']) && is_array($options['elements'])) {
            foreach ($options['elements'] as $item) {
                if (isset($item['slug'])) {
                    $elements[$item['slug']] = $item['value'] ?? '';
                }
            }
        }
        return $elements;
    }

    public function delete($id)
    {
        try {
            $item = Page::findOrFail($id);
            $item->delete();
            $this->flash('info', 'Страницата беше преместена в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Страницата не е намерена.');
        }
        return $this->redirectTrashOrIndex(Page::class, 'pages');
    }

    public function restore($id)
    {
        Page::onlyTrashed()->findOrFail($id)->restore();
        $this->flash('info', 'Страницата беше възстановена успешно.');
        return $this->redirectTrashOrIndex(Page::class, 'pages');
    }

    public function forceDelete($id)
    {
        Page::onlyTrashed()->findOrFail($id)->forceDelete();
        $this->flash('info', 'Страницата беше изтрита завинаги.');
        return $this->redirectTrashOrIndex(Page::class, 'pages');
    }

    private function getFormData(Page $page): array
    {
        $parentOptions = Form::getTreeOptions(
            Page::class,
            $page->exists ? [(int) $page->id] : [],
            'title',
            'Без родител (Главна страница)'
        );

        $defaultLang = App::$defaultLang;
        $languages = array_merge([$defaultLang], App::$supportedLangs);

        $translations = $page->exists
            ? TranslationManager::getForResource('pages', $page->id)
            : [];

        if ($page->exists) {
            $fieldsToSync = [
                'title' => $page->title,
                'content' => $page->content,
                'meta_title' => $page->options['meta_title'] ?? '',
                'meta_description' => $page->options['meta_description'] ?? ''
            ];

            foreach ($fieldsToSync as $fieldName => $dbValue) {
                if (empty($translations[$fieldName][$defaultLang])) {
                    $translations[$fieldName][$defaultLang] = $dbValue;
                }
            }
        }

        return [
            'isEdit' => $page->exists,
            'page' => $page,
            'parentOptions' => $parentOptions,
            'languages' => $languages,
            'translations' => $translations,
            'translatableConfig' => getTranslatable('pages', $page->view_name)
        ];
    }
}

<?php

use App\Modules\TranslationManager;
use App\Modules\Form;
use App\Core\View;

$isEdit = $page->exists;
$parentOptions = $parentOptions ?? [];
$translatableConfig = $translatableConfig ?? [];
$translations = $translations ?? []; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/pages" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на страница" : "Нова страница" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на съдържанието на '{$page->title}'" : "Създаване на ново съдържание в йерархията на сайта." ?>
        </p>
    </div>

    <?php if ($isEdit): ?>
        <div class="flex gap-2">
            <a href="/admin/pages/elements/<?= $page->id ?>"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                <i class="fa-solid fa-cubes text-primary"></i>
                Елементи на страницата
                <span class="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md border border-slate-200">
                    <?= count($page->options['elements'] ?? []) ?>
                </span>
            </a>
        </div>
    <?php endif; ?>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/pages/update/{$page->id}" : "/admin/pages/store" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">

        <?php Form::section('Локализация и преводи', function () use ($translatableConfig, $translations) { ?>
            <div class="space-y-4">
                <?= TranslationManager::renderFields(
                    $translatableConfig,
                    $translations
                ) ?>
            </div>
        <?php }, 'fa-language'); ?>

        <?php Form::section('Основна информация', function () use ($page) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('Име на страницата (вътрешно)', 'title', $page->title ?? '', 'text', [
                    'placeholder' => 'Напр. Начална страница - Промо',
                    'required' => true,
                    'help' => 'Основно име. Ако останалите са празни, ще се попълнят оттук.'
                ]); ?>

                <?php Form::input('URL Адрес (Slug)', 'slug', $page->slug ?? '', 'text', [
                    'placeholder' => 'na-primer-za-nas',
                    'help' => 'Генерира се автоматично от името, ако е празно.'
                ]); ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('H1 Заглавие (Heading 1)', 'options[h1_title]', $page->options['h1_title'] ?? '', 'text', [
                    'placeholder' => 'Въведете главно заглавие...',
                    'help' => 'Ако е празно, ще се използва името на страницата.'
                ]); ?>

                <?php Form::input('Собствен URL адрес', 'custom_path', $page->custom_path ?? '', 'text', [
                    'placeholder' => '',
                    'help' => 'Ръчно зададен път (напр. /promo или /products/summer-sale). Ако е попълнено, страницата ще се зарежда приоритетно на този адрес вместо на системния слъг.'
                ]); ?>
            </div>
        <?php }, 'fa-file-lines'); ?>

        <?php Form::section('Съдържание на страницата', function () use ($page) { ?>
            <div class="space-y-4">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'content',
                    'label' => 'Текст на страницата',
                    'value' => $page->content ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('SEO Настройки', function () use ($page) { ?>
            <div class="space-y-6">
                <div class="grid grid-cols-1 gap-5">
                    <?php Form::input('Meta Title (Заглавие за търсачки)', 'options[meta_title]', $page->options['meta_title'] ?? '', 'text', [
                        'placeholder' => 'Напр. Професионални услуги за Вашия бизнес | Фирма ЕООД',
                        'help' => 'Ако оставите празно, ще се използва основното заглавие на страницата.'
                    ]); ?>

                    <?php Form::textarea('Meta Description (Описание)', 'options[meta_description]', $page->options['meta_description'] ?? '', [
                        'placeholder' => 'Въведете кратко резюме на съдържанието...',
                        'rows' => 3,
                        'help' => 'Това описание се вижда в резултатите на Google (препоръчително до 160 символа).'
                    ]); ?>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <?php Form::input('Ключови думи (Keywords)', 'options[meta_keywords]', $page->options['meta_keywords'] ?? '', 'text', [
                        'placeholder' => 'услуги, бизнес, консултации',
                        'help' => 'Разделете думите със запетаи.'
                    ]); ?>

                    <?php Form::select('Индексиране (Robots)', 'options[meta_robots]', [
                        'index, follow' => 'Index, Follow (Стандартно)',
                        'noindex, nofollow' => 'No-Index, No-Follow (Скрито)',
                        'index, nofollow' => 'Index, No-Follow',
                        'noindex, follow' => 'No-Index, Follow'
                    ], $page->options['meta_robots'] ?? 'index, follow'); ?>
                </div>

                <?php Form::input('Canonical URL', 'options[canonical_url]', $page->options['canonical_url'] ?? '', 'text', [
                    'placeholder' => 'https://domain.com/page-url',
                    'help' => 'Използвайте само ако страницата има дублирано съдържание на друг адрес.'
                ]); ?>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Изображения (Responsive)', function () use ($page) { ?>
            <?php Form::image('Десктоп версия (Desktop)', 'options[image_desktop]', $page->options['image_desktop'] ?? null);
            Form::image('Таблет версия (Tablet)', 'options[image_tablet]', $page->options['image_tablet'] ?? null);
            Form::image('Мобилна версия (Phone)', 'options[image_phone]', $page->options['image_phone'] ?? null); ?>
        <?php }, 'fa-images'); ?>

        <?php Form::section('Настройки на страницата', function () use ($page, $parentOptions) { ?>
            <div class="space-y-6">
                <div class="pb-4 border-b border-slate-100">
                    <?php Form::toggle('Страницата е активна', 'is_active', (bool)($page->is_active ?? true)); ?>
                </div>
                <?php Form::select('Родителска страница', 'parent_id', $parentOptions, $page->parent_id ?? ''); ?>
            </div>
            <div class="space-y-6">
                <?php Form::select('Дизайн шаблон', 'template', PAGE_TEMPLATES, $page->template ?? 'default', ['id' => 'template-select']); ?>
                <?php Form::input('Име на изгледа (view)', 'view_name', $page->view_name ?? '', 'text', [
                    'wrapper_id' => 'view-name-wrapper',
                    'placeholder' => 'Пример: home',
                    'help' => 'Въведете името на файла във views (без .php)'
                ]); ?>
            </div>
        <?php }, 'fa-gear'); ?>

    </div>
</form>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const templateSelect = document.querySelector('#template-select');
        const viewWrapper = document.querySelector('#view-name-wrapper');

        if (templateSelect && viewWrapper) {
            const checkTemplate = () => {
                if (templateSelect.value === 'none') {
                    viewWrapper.style.display = 'block';
                } else {
                    viewWrapper.style.display = 'none';
                }
            };

            templateSelect.addEventListener('change', checkTemplate);
            checkTemplate();
        }
    });
</script>

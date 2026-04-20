<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $category->exists;
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/business-categories" class="text-slate-500 hover:text-indigo-600 text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на бизнес категория" : "Нова бизнес категория" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на настройките за '{$category->name}'" : "Добавяне на нова категория към бизнес каталога." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/business-categories/update/{$category->id}" : "/admin/business-categories/store" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">

        <?php Form::section('Обща информация', function () use ($category, $parentOptions) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('Име на категорията', 'name', $category->name ?? '', 'text', [
                    'placeholder' => 'Прим: Ресторанти, Автосервизи...',
                    'required' => true
                ]); ?>

                <?php Form::input('URL Адрес (Slug)', 'slug', $category->slug ?? '', 'text', [
                    'placeholder' => 'restoranti',
                    'help' => 'Оставете празно за автоматично генериране.'
                ]); ?>
            </div>

            <?php Form::select('Родителска страница', 'parent_id', $parentOptions, $page->parent_id ?? ''); ?>

            <div class="mt-5">
                <?php Form::textarea('Описание за категорията', 'options[description]', $category->options['description'] ?? '', [
                    'rows' => 4,
                    'help' => 'Кратко описание, което ще се вижда над списъка с фирми.'
                ]); ?>
            </div>
        <?php }, 'fa-briefcase'); ?>

        <?php Form::section('SEO Настройки', function () use ($category) { ?>
            <div class="space-y-4">
                <?php Form::input('Meta Title', 'options[meta_title]', $category->options['meta_title'] ?? '', 'text', [
                    'placeholder' => 'Заглавие за търсачки (Google)'
                ]); ?>
                <?php Form::textarea('Meta Description', 'options[meta_description]', $category->options['meta_description'] ?? '', [
                    'rows' => 2,
                    'placeholder' => 'Кратко резюме за резултатите от търсене...'
                ]); ?>
                <?php Form::input('Meta Keywords', 'options[meta_keywords]', $category->options['meta_keywords'] ?? '', 'text'); ?>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Позициониране', function () use ($category) { ?>
            <div class="space-y-4">
                <?php Form::input('Подредба (Sort Order)', 'sort_order', $category->sort_order ?? 0, 'number', [
                    'help' => 'По-малките числа се показват по-напред.',
                    'min' => 0
                ]); ?>

                <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div class="flex gap-3">
                        <i class="fa-solid fa-circle-info text-indigo-500 mt-1"></i>
                        <p class="text-xs text-indigo-700 leading-relaxed">
                            <strong>Съвет:</strong> Ако поставите 0, категорията ще се подрежда по азбучен ред спрямо останалите със същата тежест.
                        </p>
                    </div>
                </div>
            </div>
        <?php }, 'fa-sort-numeric-down'); ?>

        <?php Form::section('Визуална идентичност', function () use ($category) { ?>
            <div class="space-y-5">
                <?php Form::image('Изображение', 'image_url', $category->image_url ?? null); ?>
            </div>
        <?php }, 'fa-palette'); ?>

        <?php Form::section('Вътрешна информация', function () use ($category) { ?>
            <?php Form::textarea('Административни бележки', 'options[admin_notes]', $category->options['admin_notes'] ?? '', [
                'rows' => 3,
                'placeholder' => 'Защо е създадена тази категория, специфики...'
            ]); ?>
        <?php }, 'fa-lock'); ?>

    </div>
</form>
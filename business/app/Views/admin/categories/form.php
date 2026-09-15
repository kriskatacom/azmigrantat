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
        <a href="/admin/categories" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на категория" : "Нова категория" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на настройките за '{$category->name}'" : "Добавяне на нова категория за групиране на съдържанието." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/categories/update/{$category->id}" : "/admin/categories/store" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">
        <?php Form::section('Обща информация', function () use ($category) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('Име на категорията', 'name', $category->name ?? '', 'text', [
                    'placeholder' => 'Прим: Технологии, Здраве...',
                    'required' => true
                ]); ?>

                <?php Form::input('URL Адрес (Slug)', 'slug', $category->slug ?? '', 'text', [
                    'placeholder' => 'technologii',
                    'help' => 'Оставете празно за автоматично генериране.'
                ]); ?>
            </div>

            <div class="mt-5">
                <?php Form::textarea('Описание', 'options[description]', $category->options['description'] ?? '', [
                    'rows' => 4,
                    'help' => 'Опишете накратко за какво се отнася тази категория (полезно за SEO).'
                ]); ?>
            </div>
        <?php }, 'fa-folder-tree'); ?>

        <?php Form::section('SEO Настройки', function () use ($category) { ?>
            <div class="space-y-4">
                <?php Form::input('Meta Title', 'options[meta_title]', $category->options['meta_title'] ?? '', 'text', [
                    'placeholder' => 'Заглавие, което се появява в Google'
                ]); ?>
                <?php Form::textarea('Meta Description', 'options[meta_description]', $category->options['meta_description'] ?? '', ['rows' => 2]); ?>
                <?php Form::input('Meta Keywords', 'options[meta_keywords]', $category->options['meta_keywords'] ?? '', 'text'); ?>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Позициониране', function () use ($category) { ?>
            <div class="space-y-4">
                <?php Form::input('Подредба (Order)', 'sort_order', $category->sort_order ?? 0, 'number', [
                    'help' => 'По-малко число = по-напред в менютата.',
                    'min' => 0
                ]); ?>

                <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p class="text-xs text-blue-700">
                        <i class="fa-solid fa-lightbulb mr-1"></i>
                        Използвайте числа като 10, 20, 30, за да можете лесно да вмъквате нови категории между тях по-късно.
                    </p>
                </div>
            </div>
        <?php }, 'fa-sort-numeric-down'); ?>

        <?php Form::section('Визуална идентичност', function () use ($category) { ?>
            <div class="space-y-5">
                <?php Form::input('Акцентен цвят', 'options[color]', $category->options['color'] ?? '#3b82f6', 'color'); ?>

                <?php Form::input('Икона (FontAwesome клас)', 'options[icon]', $category->options['icon'] ?? 'fa-folder', 'text', [
                    'placeholder' => 'fa-solid fa-star',
                    'help' => 'Напр: fa-solid fa-code'
                ]); ?>

                <hr class="border-slate-100">

                <?php Form::image('Изображение', 'options[image]', $category->options['image'] ?? null); ?>
            </div>
        <?php }, 'fa-palette'); ?>

        <?php Form::section('Бележки', function () use ($category) { ?>
            <?php Form::textarea('Вътрешни бележки', 'options[admin_notes]', $category->options['admin_notes'] ?? '', [
                'rows' => 2,
                'placeholder' => 'Само за администратори...'
            ]); ?>
        <?php }, 'fa-sticky-note'); ?>

    </div>
</form>

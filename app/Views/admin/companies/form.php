<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $company->exists;
$title = $isEdit ? 'Редактиране на компания' : 'Добавяне на нова компания';
$action = $isEdit ? "/admin/companies/update/{$company->id}" : "/admin/companies/store";
$companyOptions = $company->options ?? [];
?>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/companies" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на данните за '" . htmlspecialchars($company->name) . "'" : "Регистрация на нов бизнес профил в системата." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= $action ?>" method="POST" class="grid 2xl:grid-cols-3 gap-5" enctype="multipart/form-data">

    <div class="xl:col-span-2 space-y-5">

        <?php Form::section('Основна информация', function () use ($company) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Име на фирмата', 'name', $company->name ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. Метал Замфирови ЕООД'
                ]); ?>

                <?php Form::input('URL адрес (Slug)', 'slug', $company->slug ?? '', 'text', [
                    'placeholder' => 'metal-zamfirovi-eood',
                    'help' => 'Генерира се автоматично, ако е празно.'
                ]); ?>
            </div>

            <?php Form::input('Слоган на компанията', 'company_slogan', $company->company_slogan ?? '', 'text', [
                'placeholder' => 'Качество и прецизност...',
                'help' => 'Кратко рекламно изречение.'
            ]); ?>

            <?php Form::textarea('Кратко извлечение (Excerpt)', 'excerpt', $company->excerpt ?? '', [
                'placeholder' => 'Кратко представяне за списъците...',
                'rows' => 2
            ]); ?>
        <?php }, 'fa-building'); ?>

        <?php Form::section('Представяне и Услуги', function () use ($company) { ?>
            <div class="space-y-6">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'description',
                    'label' => 'Основно описание (За компанията)',
                    'value' => $company->description ?? ''
                ]); ?>

                <hr class="border-slate-100">

                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'services_description',
                    'label' => 'Описание на услугите',
                    'value' => $company->services_description ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('Галерия (Допълнителни снимки)', function () use ($companyOptions) { ?>
            <div class="space-y-4">
                <?php
                $gallery = $companyOptions['additional_images'] ?? [];

                View::component('multi-image-upload', 'admin/components', [
                    'name'   => 'options[additional_images][]',
                    'images' => $gallery,
                    'label'  => 'Галерия на обекта'
                ]);
                ?>
            </div>
        <?php }, 'fa-images'); ?>

        <?php Form::section('Локация и Карта', function () use ($company) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Точен адрес', 'address', $company->address ?? '', 'text', [
                    'placeholder' => 'гр. Монтана, ул. Индустриална 1'
                ]); ?>

                <?php Form::input('Google Maps URL', 'google_map', $company->google_map ?? '', 'url', [
                    'placeholder' => 'https://www.google.com/maps/...'
                ]); ?>
            </div>
            <div class="mt-4">
                <?php Form::input('Локация за показване (Текст)', 'your_location', $company->your_location ?? '', 'text', [
                    'placeholder' => 'Монтана, Южна промишлена зона'
                ]); ?>
            </div>
        <?php }, 'fa-map-location-dot'); ?>

        <?php Form::section('Работно време', function () use ($company) { ?>
            <div class="space-y-6">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'working_time',
                    'label' => 'График',
                    'value' => $company->working_time ?? ''
                ]); ?>
                <hr class="border-slate-100">
            </div>
        <?php }, 'fa-clock'); ?>

    </div>

    <div class="xl:col-span-1 space-y-6">

        <?php
        $options = is_string($company->options) ? json_decode($company->options, true) : ($company->options ?? []);
        ?>

        <?php
        $companyOptions = is_string($company->options)
            ? json_decode($company->options, true)
            : ($company->options ?? []);
        ?>
        <?php Form::section('Адаптивни предни изображения', function () use ($companyOptions) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                // Използвай 'image_url' за основна, ако така е в аксесора на модела
                Form::image('Основна снимка (Desktop)', 'options[image_url]', $companyOptions['image_url'] ?? null, [
                    'help' => 'Основно изображение за големи екрани.'
                ]);
                Form::image('Таблет (Tablet)', 'options[image_tablet]', $companyOptions['image_tablet'] ?? null);
                Form::image('Телефон (Phone)', 'options[image_mobile]', $companyOptions['image_mobile'] ?? null);
                ?>
            </div>
        <?php }, 'fa-display'); ?>

        <?php Form::section('Default изображения (Системни)', function () use ($companyOptions) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                Form::image('Изображение за Обяви', 'options[ads_image_url]', $companyOptions['ads_image_url'] ?? null, [
                    'help' => 'Показва се като банер в секция обяви.'
                ]);
                Form::image('Изображение за Услуги', 'options[offer_image_url]', $companyOptions['offer_image_url'] ?? null, [
                    'help' => 'Основно изображение за списъка с услуги.'
                ]);
                Form::image('Изображение за Footer', 'options[bottom_image_url]', $companyOptions['bottom_image_url'] ?? null, [
                    'help' => 'Изображение, което се визуализира най-долу в профила.'
                ]);
                ?>
            </div>
        <?php }, 'fa-layer-group'); ?>

        <?php Form::section('Статус и Свързаност', function () use ($company, $cities, $categories, $users) { ?>
            <div class="space-y-5">
                <?php Form::toggle('Активен профил', 'is_active', (bool)($company->is_active ?? true)); ?>

                <hr class="border-slate-100">

                <?php
                $cityOptions = $cities->pluck('name', 'id')->toArray();
                Form::select('Град', 'city_id', $cityOptions, $company->city_id ?? '');

                $catOptions = is_array($categories) ? $categories : [];
                Form::select('Категория', 'category_id', $catOptions, $company->category_id ?? '');

                $userOptions = $users->pluck('name', 'id')->toArray();
                Form::select('Собственик (User)', 'user_id', $userOptions, $company->user_id ?? '');
                ?>

                <?php Form::input('Подредба', 'sort_order', $company->sort_order ?? 0, 'number'); ?>
            </div>
        <?php }, 'fa-sitemap'); ?>

        <?php Form::section('Контакти', function () use ($company) { ?>
            <div class="space-y-4">
                <?php Form::input('Телефон', 'phone', $company->phone ?? '', 'text', ['icon' => 'fa-phone']); ?>
                <?php Form::input('Email', 'email', $company->email ?? '', 'email', ['icon' => 'fa-envelope']); ?>
                <?php Form::input('Уебсайт', 'website_link', $company->website_link ?? '', 'url', ['icon' => 'fa-globe']); ?>
                <?php Form::input('Facebook', 'facebook_page_link', $company->facebook_page_link ?? '', 'url', ['icon' => 'fa-facebook']); ?>
            </div>
        <?php }, 'fa-address-book'); ?>

        <div class="pt-2">
            <?php Form::submit($isEdit ? 'Запази промените' : 'Създай компания', $isEdit ? 'fa-save' : 'fa-plus'); ?>
        </div>
    </div>
</form>
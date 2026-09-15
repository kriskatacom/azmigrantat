<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $service->exists;
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/companies/<?= $company->id ?>/services" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към услугите
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на услуга" : "Добавяне на нова услуга" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на детайлите за '{$service->name}'" : "Добавяне на нова услуга към портфолиото на {$company->name}." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/services/update/{$service->id}" : "/admin/services/store/{$company->id}" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">
        <?php Form::section('Основна информация', function () use ($service) { ?>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="md:col-span-2">
                    <?php Form::input('Име на услугата', 'name', $service->name ?? '', 'text', [
                        'placeholder' => 'Въведете име (напр. Пълно почистване)',
                        'required' => true
                    ]); ?>
                </div>

                <?php Form::input('Подредба', 'sort_order', $service->sort_order ?? 0, 'number', [
                    'placeholder' => '0'
                ]); ?>
            </div>

            <div class="mt-5">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'options[description]',
                    'label' => 'Описание на услугата',
                    'value' => $service->options['description'] ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-concierge-bell'); ?>

        <?php Form::section('SEO Настройки', function () use ($service) { ?>
            <div class="space-y-4">
                <?php Form::input('Meta Title', 'options[meta_title]', $service->options['meta_title'] ?? '', 'text'); ?>
                <?php Form::textarea('Meta Description', 'options[meta_description]', $service->options['meta_description'] ?? '', ['rows' => 2]); ?>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Статус и Видимост', function () use ($service) { ?>
            <div class="space-y-4">
                <?php Form::toggle('Активен профил', 'is_active', ($service->is_active ?? true)); ?>

                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p class="text-xs text-slate-500 leading-relaxed">
                        <i class="fa-solid fa-circle-info mr-1 text-blue-500"></i>
                        Неактивните услуги няма да се появяват в сайта, но ще останат в базата данни.
                    </p>
                </div>
            </div>
        <?php }, 'fa-toggle-on'); ?>

        <?php
        $serviceOptions = is_string($service->options)
            ? json_decode($service->options, true)
            : ($service->options ?? []);
        ?>

        <?php Form::section('Адаптивни изображения', function () use ($serviceOptions) { ?>
            <div class="grid grid-cols-1 gap-6">
                <?php
                Form::image('Основна снимка (Desktop)', 'options[image_desktop]', $serviceOptions['image_desktop'] ?? null);
                Form::image('Таблет (Tablet)', 'options[image_tablet]', $serviceOptions['image_tablet'] ?? null);
                Form::image('Телефон (Phone)', 'options[image_phone]', $serviceOptions['image_phone'] ?? null);
                ?>
            </div>
        <?php }, 'fa-display'); ?>

        <?php if ($isEdit && $service->created_at): ?>
            <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                <div class="flex items-center gap-3 text-slate-400">
                    <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                        <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                    </div>
                    <div class="text-xs">
                        <p class="text-slate-400">Последна промяна</p>
                        <p class="font-bold text-slate-700"><?= $service->updated_at ?? $service->created_at ?></p>
                    </div>
                </div>
            </div>
        <?php endif; ?>

    </div>
</form>

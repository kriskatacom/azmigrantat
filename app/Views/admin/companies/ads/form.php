<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $ad->exists;
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/companies/<?= $company->id ?>/ads" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към обявите
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на обява" : "Създаване на нова обява" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на параметрите за '{$ad->title}'" : "Добавяне на ново рекламно каре към {$company->name}." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/ads/update/{$ad->id}" : "/admin/ads/store/{$company->id}" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">
        <?php Form::section('Информация за рекламата', function () use ($ad) { ?>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="md:col-span-2">
                    <?php Form::input('Заглавие на обявата', 'title', $ad->title ?? '', 'text', [
                        'placeholder' => 'Напр. Промоция -20% за нови клиенти',
                        'required' => true
                    ]); ?>
                </div>

                <?php Form::input('Приоритет (Sort)', 'sort_order', $ad->sort_order ?? 0, 'number', [
                    'placeholder' => '0'
                ]); ?>
            </div>

            <div class="mt-5 space-y-4">
                <?php Form::input('Линк на обявата (URL)', 'options[link_url]', $ad->options['link_url'] ?? '', 'url', [
                    'placeholder' => 'https://example.com/promo'
                ]); ?>

                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'options[content]',
                    'label' => 'Текст/Описание на обявата',
                    'value' => $ad->options['content'] ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-rectangle-ad'); ?>

        <?php Form::section('Маркетингови настройки', function () use ($ad) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <?php Form::input('Текст на бутона', 'options[button_text]', $ad->options['button_text'] ?? 'Научи повече', 'text'); ?>
                <?php Form::input('Валидна до (Дата)', 'options[valid_until]', $ad->options['valid_until'] ?? '', 'date'); ?>
            </div>
        <?php }, 'fa-bullhorn'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Статус на кампанията', function () use ($ad) { ?>
            <div class="space-y-4">
                <?php Form::toggle('Активна обява', 'is_active', ($ad->is_active ?? true)); ?>

                <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p class="text-xs text-blue-600 leading-relaxed">
                        <i class="fa-solid fa-circle-info mr-1"></i>
                        Само активните обяви се ротират в слайдера на публичния профил.
                    </p>
                </div>
            </div>
        <?php }, 'fa-toggle-on'); ?>

        <?php
        $adOptions = is_string($ad->options)
            ? json_decode($ad->options, true)
            : ($ad->options ?? []);
        ?>

        <?php Form::section('Рекламни банери', function () use ($adOptions) { ?>
            <div class="grid grid-cols-1 gap-6">
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Десктоп банер (1200x400)</label>
                    <?php Form::image('', 'options[image_desktop]', $adOptions['image_desktop'] ?? null); ?>
                </div>
                
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Мобилен банер (600x400)</label>
                    <?php Form::image('', 'options[image_phone]', $adOptions['image_phone'] ?? null); ?>
                </div>
            </div>
        <?php }, 'fa-image'); ?>

        <?php if ($isEdit && $ad->created_at): ?>
            <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3 text-slate-400">
                    <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                        <i class="fa-solid fa-calendar-check text-xs"></i>
                    </div>
                    <div class="text-xs">
                        <p class="text-slate-400">Дата на създаване</p>
                        <p class="font-bold text-slate-700"><?= $ad->created_at ?></p>
                    </div>
                </div>
            </div>
        <?php endif; ?>

    </div>
</form>
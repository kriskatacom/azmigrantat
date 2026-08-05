<?php

use App\Modules\TranslationManager;
use App\Modules\Form;
use App\Core\View;

$isEdit = $post->exists ?? false;
$categoryOptions = $categoryOptions ?? [];
$translatableConfig = $translatableConfig ?? [];
$translations = $translations ?? []; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-5 max-md:pt-5 max-md:px-5 space-y-2">
    <h1 class="text-xl md:text-2xl md:font-bold text-slate-900">
        <?= $isEdit ? "Редактиране на публикация" : "Нова публикация" ?>
    </h1>
    <a href="/admin/posts"
        class="text-slate-500 hover:text-primary flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Назад към списъка
    </a>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/posts/update/{$post->id}" : "/admin/posts/store" ?>" method="POST"
    class="grid grid-cols-1 2xl:grid-cols-10 md:gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">

        <?php
        if (!empty($translatableConfig)): ?>
            <?php Form::section('Локализация и преводи', function () use ($translatableConfig, $translations) { ?>
                <div class="space-y-4">
                    <?= TranslationManager::renderFields($translatableConfig, $translations) ?>
                </div>
            <?php }, 'fa-language'); ?>
        <?php endif; ?>

        <?php
        Form::section('Основна информация', function () use ($post) { ?>
            <?php Form::input('Заглавие на публикацията', 'name', $post->name ?? '', 'text', [
                'placeholder' => 'Въведете заглавие...',
                'required' => true,
                'help' => 'Основно заглавие на публикацията.'
            ]); ?>
        <?php }, 'fa-newspaper'); ?>

        <?php Form::section('Основно изображение', function () use ($post) {
            Form::image('Качи изображение', 'options[main_image]', $post->options['main_image'] ?? null);
        }, 'fa-newspaper'); ?>

        <?php
        Form::section('Съдържание на публикацията', function () use ($post) { ?>
            <?php Form::textarea('Съдържание', 'content', $post->content ?? '', ['placeholder' => 'Въведете текста тук...', 'rows' => 5]); ?>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('Галерия', function () use ($post) {
            $galleryImages = $post->images ?? [];
            Form::multiImage('Изображения', 'images', $galleryImages);
        }, 'fa-images'); ?>

        <?php Form::section('Видео съдържание', function () use ($post) { ?>
            <div class="space-y-4">
                <?php Form::video('Прикачено видео', 'video_url', $post->video_url ?? null); ?>
            </div>
        <?php }, 'fa-clapperboard'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php
        Form::section('Настройки на публикацията', function () use ($post, $categoryOptions) { ?>
            <div class="space-y-6">
                <div class="pb-4 border-b border-slate-100">
                    <?php Form::toggle('Публикацията е активна', 'is_active', (bool) ($post->is_active ?? true)); ?>
                </div>

                <?php View::component('select2', 'admin/partials', [
                    'label' => 'Категория',
                    'name' => 'category_id',
                    'options' => $categoryOptions,
                    'value' => $post->category_id ?? '',
                    'placeholder' => 'Изберете категория на публикацията...',
                    'allowClear' => true
                ]); ?>

                <?php if ($post->exists && $post->user): ?>
                    <div class="pt-4 border-t border-slate-100 text-slate-400 flex items-center gap-2">
                        <i class="fa-solid fa-user-nib"></i>
                        <span>Автор: <?= htmlspecialchars($post->user->name) ?>,
                            <?= htmlspecialchars($post->user->email) ?></span>
                    </div>
                <?php endif; ?>
            </div>
        <?php }, 'fa-gear'); ?>

        <?php View::component('location-picker', 'admin/components', [
            'name' => 'location',
            'value' => $post->location ?? $currentUser['options']['city'] ?? '',
        ]); ?>

    </div>
</form>

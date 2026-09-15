<?php

use App\Modules\Form;
use App\Core\View;
use App\Models\Article;

$isEdit = $article->exists;
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/articles" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на статия" : "Нова статия" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на '{$article->title}'" : "Създаване на ново съдържание за блога." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/articles/update/{$article->id}" : "/admin/articles/store" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">
        <?php Form::section('Основно съдържание', function () use ($article) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php Form::input('Заглавие на статията', 'title', $article->title ?? '', 'text', [
                    'placeholder' => 'Въведете заглавие...',
                    'required' => true
                ]); ?>

                <?php Form::input('URL Адрес (Slug)', 'slug', $article->slug ?? '', 'text', [
                    'placeholder' => 'zaglavie-na-statiyata',
                    'help' => 'Оставете празно за автоматично генериране.'
                ]); ?>
            </div>

            <div class="mt-5">
                <?php Form::textarea('Кратко резюме (Excerpt)', 'excerpt', $article->excerpt ?? '', [
                    'rows' => 3,
                    'help' => 'Кратко описание, което се вижда в списъка със статии.'
                ]); ?>
            </div>

            <div class="mt-5">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'content',
                    'label' => 'Пълно съдържание',
                    'value' => $article->content ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-pen-nib'); ?>

        <?php Form::section('SEO Настройки', function () use ($article) { ?>
            <div class="space-y-4">
                <?php Form::input('Meta Title', 'options[meta_title]', $article->options['meta_title'] ?? '', 'text'); ?>
                <?php Form::textarea('Meta Description', 'options[meta_description]', $article->options['meta_description'] ?? '', ['rows' => 2]); ?>
                <?php Form::input('Ключови думи', 'options[meta_keywords]', $article->options['meta_keywords'] ?? '', 'text'); ?>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Статус и Публикация', function () use ($article) { ?>
            <div class="space-y-4">
                <?php
                $statuses = [
                    Article::STATUS_DRAFT => 'Чернова',
                    Article::STATUS_PUBLISHED => 'Публикувана',
                    Article::STATUS_SCHEDULED => 'Планирана за дата'
                ];
                Form::select('Статус', 'status', $statuses, $article->status ?? Article::STATUS_DRAFT);
                ?>

                <?php Form::input('Дата на публикуване', 'published_at', ($article->published_at ? $article->published_at->format('Y-m-d\TH:i') : date('Y-m-d\TH:i')), 'datetime-local'); ?>
            </div>
        <?php }, 'fa-calendar-check'); ?>

        <?php Form::section('Организация', function () use ($article, $categories, $tags) { ?>
            <div class="space-y-6">
                <?php $catOptions = ['' => '-- Изберете категория --'] + $categories->pluck('name', 'id')->toArray();
                Form::select('Категория', 'category_id', $catOptions, $article->category_id ?? ''); ?>

                <?php View::component('tag-manager', 'admin/articles/components', [
                    'name'      => 'tags',
                    'label'     => 'Тагове на статията',
                    'available' => $tags,
                    'selected'  => $article->tags
                ]); ?>
            </div>
        <?php }, 'fa-sitemap'); ?>

        <?php Form::section('Изображения (Responsive)', function () use ($article) { ?>
            <?php
            Form::image('Десктоп версия (Desktop)', 'options[image_desktop]', $article->options['image_desktop'] ?? null);
            Form::image('Таблет версия (Tablet)', 'options[image_tablet]', $article->options['image_tablet'] ?? null);
            Form::image('Мобилна версия (Phone)', 'options[image_phone]', $article->options['image_phone'] ?? null);
            ?>

            <div class="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p class="text-sm text-amber-700 italic">
                    <i class="fa-solid fa-circle-info mr-1"></i>
                    Системата ще използва автоматично съответното изображение според устройството на потребителя.
                </p>
            </div>
        <?php }, 'fa-images'); ?>

    </div>
</form>

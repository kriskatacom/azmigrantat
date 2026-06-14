<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $category->exists; 

$parentCategories = \App\Models\Category::where('id', '!=', $category->id ?? 0)
    ->pluck('name', 'id')
    ->prepend('--- Без родител (Основна) ---', '')
    ->toArray();
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <a href="/admin/categories" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/categories/update/{$category->id}" : "/admin/categories/store"; ?>" method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6" enctype="multipart/form-data">

    <div class="lg:col-span-2 space-y-6">
        <?php Form::section('Основни данни', function () use ($category, $parentCategories) { ?>
            <?php 
            Form::input('Име на категория', 'name', $category->name ?? '', 'text', ['required' => true, 'placeholder' => 'напр. Електроника']);
            Form::input('Slug (URL)', 'slug', $category->slug ?? '', 'text', ['placeholder' => 'electronics']);
            View::component('select2', 'admin/partials', [
                'label'       => 'Родителска категория',
                'name'        => 'parent_id',
                'options'     => [null => 'Без родител (Основна)'] + $parentCategories,
                'value'       => $category->parent_id ?? '',
                'placeholder' => 'Изберете родителска категория...',
                'allowClear'  => true
            ]);
            Form::textarea('Описание', 'description', $category->description ?? '', ['rows' => 4]);
            ?>
        <?php }, 'fa-folder-open'); ?>
    </div>

    <div class="lg:col-span-1 space-y-6">
        <?php Form::section('Медия и статус', function () use ($category) { ?>
            <div class="space-y-4">
                <?php Form::image('Изображение', 'image_url', $category->image_url ?? null); ?>
                
                <div class="pt-2 border-t border-slate-100">
                    <?php Form::toggle('Активна категория', 'is_active', (bool)($category->is_active ?? true)); ?>
                </div>
            </div>

            <?php if (isset($category->created_at)): ?>
                <div class="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    <p><i class="fa-solid fa-clock mr-1"></i> Създадена на: <?= date('d.m.Y H:i', strtotime($category->created_at)) ?></p>
                </div>
            <?php endif; ?>
        <?php }, 'fa-sliders'); ?>
    </div>
</form>

<?php \App\Core\Session::clearOld(); ?>

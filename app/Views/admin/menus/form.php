<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = isset($menu->id);
$title = $isEdit ? 'Редактиране на меню' : 'Ново меню';
$subtitle = $isEdit ? 'Промяна на настройките за ' . htmlspecialchars($menu->title) : 'Създаване на нов навигационен контейнер';
$action = $isEdit ? "/admin/menus/update/{$menu->id}" : "/admin/menus/store";
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <a href="/admin/menus" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-slate-500 text-sm"><?= $subtitle ?></p>
    </div>

    <?php if ($isEdit): ?>
    <div class="flex items-center gap-3">
        <a href="/admin/menus/structure/<?= $menu->id ?>" class="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 font-medium">
            <i class="fa-solid fa-sitemap"></i> Управление на линковете
        </a>
    </div>
    <?php endif; ?>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $action ?>" method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <div class="lg:col-span-2 space-y-6">
        <?php Form::section('Основна информация', function () use ($menu) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::input('Заглавие на менюто', 'title', $menu->title ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. Главно меню (Header)'
                ]);

                Form::input('Системен слъг', 'slug', $menu->slug ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'main-menu',
                    'help' => 'Използва се в кода за извикване: Menu::get(\'slug\')'
                ]);
                ?>
            </div>

            <div class="pt-2">
                <?php Form::textarea('Описание', 'description', $menu->description ?? '', [
                    'placeholder' => 'Кратко описание къде се визуализира това меню...',
                    'rows' => 3
                ]); ?>
            </div>
        <?php }, 'fa-rectangle-list'); ?>

        <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
            <div class="flex items-center gap-3 text-slate-500">
                <i class="fa-solid fa-circle-info text-xl"></i>
                <p class="text-sm">След като създадете менюто, ще можете да добавяте линкове и подменюта към него.</p>
            </div>
            <?php Form::submit($isEdit ? 'Запази промените' : 'Създай менюто', $isEdit ? 'fa-save' : 'fa-plus'); ?>
        </div>
    </div>

    <div class="lg:col-span-1 space-y-6">
        <?php Form::section('Инструкции', function () { ?>
            <div class="space-y-4">
                <div class="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 class="text-blue-700 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-code"></i> Как се използва?
                    </h4>
                    <p class="text-blue-600/80 text-xs leading-relaxed">
                        Използвайте системния слъг, за да заредите това меню във вашия шаблон. 
                        Промяната на слъга може да доведе до изчезване на менюто от сайта, ако не бъде актуализиран в кода.
                    </p>
                </div>
                
                <ul class="text-xs text-slate-500 space-y-2 ml-4 list-disc">
                    <li>Слъгът трябва да е уникален.</li>
                    <li>Използвайте малки латински букви и тирета.</li>
                    <li>Заглавието е само за административна справка.</li>
                </ul>
            </div>
        <?php }, 'fa-lightbulb'); ?>

        <?php if (isset($menu->created_at)): ?>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-info-circle text-slate-400"></i> Системна информация
                </h3>
                <div class="space-y-3 text-xs text-slate-500">
                    <div class="flex justify-between items-center py-2 border-b border-slate-50">
                        <span>Създадено на:</span>
                        <span class="text-slate-900 font-medium"><?= date('d.m.Y H:i', strtotime($menu->created_at)) ?></span>
                    </div>
                    <?php if (isset($menu->updated_at)): ?>
                    <div class="flex justify-between items-center py-2">
                        <span>Последна промяна:</span>
                        <span class="text-slate-900 font-medium"><?= date('d.m.Y H:i', strtotime($menu->updated_at)) ?></span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endif; ?>
    </div>
</form>
